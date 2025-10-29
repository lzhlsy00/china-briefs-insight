import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("VITE_SUPABASE_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("PROJECT_SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("PROJECT_SUPABASE_SERVICE_ROLE_KEY") ?? null;
  const stripeProProductId = Deno.env.get("STRIPE_PRO_PRODUCT_ID") ?? null;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      const periodEndSeconds = subscription.current_period_end ?? subscription.trial_end ?? subscription.cancel_at ?? null;
      if (typeof periodEndSeconds === "number") {
        subscriptionEnd = new Date(periodEndSeconds * 1000).toISOString();
        logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      } else {
        logStep("Active subscription missing period end", { subscriptionId: subscription.id, periodEndSeconds });
      }

      const firstItem = subscription.items?.data?.[0];
      if (firstItem?.price?.product) {
        productId = firstItem.price.product;
        logStep("Determined subscription tier", { productId });
      } else {
        logStep("Subscription item missing product info", { subscriptionId: subscription.id });
      }
    } else {
      logStep("No active subscription found");
    }

    const subscriptionStatus = hasActiveSub ? "pro" : "free";

    if (adminClient) {
      try {
        const { error: profileError } = await adminClient
          .from("user_profiles")
          .update({
            subscription_status: subscriptionStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (profileError) {
          logStep("Failed to sync user profile subscription", { userId: user.id, message: profileError.message });
        } else {
          logStep("Synced user profile subscription", { userId: user.id, subscriptionStatus, subscriptionEnd });
        }
      } catch (profileSyncError) {
        logStep("ERROR syncing user profile subscription", { userId: user.id, message: String(profileSyncError) });
      }
    } else {
      logStep("Skipped profile sync - no service role key provided", { userId: user.id });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
