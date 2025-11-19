import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("VITE_SUPABASE_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const DEFAULT_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID_DEFAULT");
const KOREA_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID_KR");
const TRIAL_DAYS = (() => {
  const raw = Deno.env.get("STRIPE_TRIAL_DAYS") ?? "7";
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
})();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("PROJECT_SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("PROJECT_SUPABASE_SERVICE_ROLE_KEY") ?? null;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const profileClient = adminClient ?? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    const { data: profileData, error: profileError } = await profileClient
      .from("user_profiles")
      .select("has_used_trial")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      logStep("Failed to load profile", { message: profileError.message });
    }

    const hasUsedTrial = Boolean(profileData?.has_used_trial);
    logStep("Trial usage status resolved", { hasUsedTrial });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    logStep("Stripe initialized");

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer found");
    }

    // Create checkout session
    const requestBody = await req.json().catch(() => ({}));
    const normalizedRegion = typeof requestBody?.region === "string" ? requestBody.region.toUpperCase() : undefined;
    const localePreference = typeof requestBody?.locale === "string" ? requestBody.locale : undefined;
    logStep("Resolved region", { region: normalizedRegion ?? "DEFAULT" });
    logStep("Resolved locale", { locale: localePreference ?? "not provided" });

    // Log environment variables for debugging
    logStep("Environment variables", {
      DEFAULT_PRICE_ID: DEFAULT_PRICE_ID ? "Set" : "Not set",
      KOREA_PRICE_ID: KOREA_PRICE_ID ? "Set" : "Not set",
    });

    let priceId = normalizedRegion === "KR"
      ? (KOREA_PRICE_ID ?? DEFAULT_PRICE_ID)
      : DEFAULT_PRICE_ID;

    if (!priceId) {
      throw new Error("Stripe price configuration is missing");
    }
    
    logStep("Price selection", { 
      region: normalizedRegion,
      selectedPriceId: priceId,
      isUsingKoreanPrice: priceId === KOREA_PRICE_ID
    });

    let desiredCurrency: string | null = null;
    try {
      const desiredPrice = await stripe.prices.retrieve(priceId);
      desiredCurrency = desiredPrice.currency;
    } catch (priceError) {
      logStep("Failed to retrieve desired price", { priceId, message: String(priceError) });
    }

    // 检查是否有活跃订阅并处理货币冲突
    if (customerId && desiredCurrency) {
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      const currentSubscription = existingSubscriptions.data[0];
      const currentCurrency = currentSubscription?.items?.data?.[0]?.price?.currency ?? null;

      if (currentCurrency && currentCurrency !== desiredCurrency) {
        logStep("Currency mismatch detected", {
          customerId,
          currentCurrency,
          desiredCurrency,
          hasActiveSubscription: true
        });
        
        // 返回错误信息，提示用户需要先取消现有订阅
        return new Response(
          JSON.stringify({ 
            error: "CURRENCY_MISMATCH",
            message: "You have an active subscription in a different currency. Please cancel your current subscription before switching currencies.",
            currentCurrency,
            desiredCurrency
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
    }

    const includeTrial = !hasUsedTrial;
    const subscriptionData = includeTrial
      ? {
        trial_period_days: TRIAL_DAYS,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: {
          user_id: user.id,
        },
      }
      : {
        metadata: {
          user_id: user.id,
          has_used_trial: "true",
        },
      };

    logStep("Checkout trial configuration", { includeTrial });

    const buildSessionParams = (targetPriceId: string) => ({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        supabase_email: user.email,
      },
      subscription_data: subscriptionData,
      line_items: [
        {
          price: targetPriceId,
          quantity: 1,
          // 可以动态覆盖产品显示信息
          /*
          price_data: {
            product_data: {
              name: localePreference === "ko" ? "BiteChina Pro 구독" : "BiteChina Pro Subscription",
              description: localePreference === "ko" 
                ? "독점 기능이 포함된 프리미엄 구독"
                : "Premium subscription with exclusive features",
            },
          },
          */
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/pricing?success=true`,
      cancel_url: `${req.headers.get("origin")}/pricing?canceled=true`,
      locale: localePreference === "ko" ? "ko" : "en", // 韩国显示韩文，其他地区强制英文
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create(buildSessionParams(priceId));
    } catch (sessionError) {
      const message = sessionError instanceof Error ? sessionError.message : String(sessionError);
      if (
        DEFAULT_PRICE_ID &&
        priceId !== DEFAULT_PRICE_ID &&
        message.includes("You cannot combine currencies")
      ) {
        logStep("Retrying checkout with default currency", { customerId, priceId, fallbackPriceId: DEFAULT_PRICE_ID });
        session = await stripe.checkout.sessions.create(buildSessionParams(DEFAULT_PRICE_ID));
      } else {
        throw sessionError;
      }
    }
    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
