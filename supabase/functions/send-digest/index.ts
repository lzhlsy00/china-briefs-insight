import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[SEND-DIGEST] ${step}${payload}`);
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  try {
    return JSON.parse(JSON.stringify(error));
  } catch (_) {
    return { message: String(error) };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("PROJECT_SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const emailFrom = Deno.env.get("RESEND_EMAIL_FROM") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    logStep("Missing Supabase credentials");
    return new Response(JSON.stringify({ error: "Supabase credentials are not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resendApiKey || !emailFrom) {
    logStep("Missing Resend configuration");
    return new Response(JSON.stringify({ error: "Resend configuration is not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: latestContent, error: contentError } = await supabase
      .from("push_content")
      .select("id, title, content, date, published")
      .eq("published", false)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (contentError) {
      throw contentError;
    }

    if (!latestContent) {
      logStep("No unpublished content found");
      return new Response(JSON.stringify({ message: "No unpublished push content to send" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alreadySent, error: logError } = await supabase
      .from("send_email")
      .select("user_mail")
      .eq("mail_content_id", latestContent.id);

    if (logError) {
      throw logError;
    }

    const alreadySentSet = new Set((alreadySent ?? []).map((row) => row.user_mail));

    const { data: subscribers, error: subscriberError } = await supabase
      .from("user_profiles")
      .select("email")
      .in("subscription_status", ["pro", "trial"])
      .not("email", "is", null);

    if (subscriberError) {
      throw subscriberError;
    }

    const recipients = (subscribers ?? []).filter((user) => {
      const email = user.email?.trim();
      return email && !alreadySentSet.has(email);
    });

    if (recipients.length === 0) {
      const { error: publishError } = await supabase
        .from("push_content")
        .update({ published: true })
        .eq("id", latestContent.id);

      if (publishError) {
        logStep("Failed to mark content as published", { contentId: latestContent.id, message: publishError.message });
      }

      logStep("No new recipients", { contentId: latestContent.id });
      return new Response(JSON.stringify({ message: "No new recipients to notify" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary = {
      attempted: recipients.length,
      delivered: 0,
      failed: 0,
      failures: [] as Array<{ email: string; error: string }>,
    };

    const renderedContent = (latestContent.content ?? "").replace(/\n/g, "<br />");
    const sendDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const subject = `BiteChina Newsletter - ${sendDate}`;

    const htmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
  </head>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f8fafc;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); overflow: hidden;">
            <tr>
              <td style="padding: 32px 32px 16px 32px; text-align: center;">
                <img src="https://www.bitechina.com/BiteChina.png" alt="BiteChina" width="160" style="display: block; margin: 0 auto 12px;" />
                <h1 style="font-size: 28px; font-weight: 700; margin: 0; color: #0f172a;">${subject}</h1>
                <p style="color: #64748b; font-size: 16px; margin: 12px 0 0;">🗞️ China Tech, Brand & AI Daily<br />Stay updated with China’s latest tech, AI, and consumer trends — in one bite.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 32px 32px;">
                <div style="border-radius: 12px; background: #f1f5f9; color: #0f172a; padding: 24px; font-size: 16px; line-height: 1.7;">
                  ${renderedContent}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    for (const recipient of recipients) {
      const email = recipient.email?.trim();
      if (!email) continue;

      let delivered = false;
      let errorMessage = "";

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [email],
            subject,
            html: htmlBody,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          errorMessage = errorPayload?.message || `Resend responded with ${response.status}`;
          logStep("Resend delivery failed", { email, message: errorMessage });
        } else {
          delivered = true;
          summary.delivered += 1;
        }
      } catch (sendError) {
        errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
        logStep("Resend delivery error", { email, message: errorMessage });
      }

      if (!delivered) {
        summary.failed += 1;
        summary.failures.push({ email, error: errorMessage || "Unknown error" });
      }

      const { error: insertError } = await supabase
        .from("send_email")
        .insert({
          mail_content_id: latestContent.id,
          user_mail: email,
          is_delivered: delivered,
        });

      if (insertError) {
        logStep("Failed to record send log", { email, message: insertError.message });
      }
    }

    const { error: publishError } = await supabase
      .from("push_content")
      .update({ published: true })
      .eq("id", latestContent.id);

    if (publishError) {
      logStep("Failed to mark content as published", { contentId: latestContent.id, message: publishError.message });
    }

    logStep("Digest send completed", summary);

    return new Response(JSON.stringify({
      contentId: latestContent.id,
      attempted: summary.attempted,
      delivered: summary.delivered,
      failed: summary.failed,
      failures: summary.failures,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const serialized = serializeError(error);
    logStep("ERROR", serialized);
    return new Response(JSON.stringify({ error: serialized }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
