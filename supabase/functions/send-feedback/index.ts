import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import { buildFeedbackEmailHtml, validateFeedbackInput } from "../_shared/feedback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { "Content-Type": "application/json" };

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...jsonHeaders, ...corsHeaders },
      status: 405,
    });
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 401,
      });
    }

    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 401,
      });
    }

    const { category, message } = await request.json();
    const { valid, trimmed } = validateFeedbackInput(category, message);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 400,
      });
    }

    const resendApiKey = requiredEnv("RESEND_API_KEY");
    const supportEmail = requiredEnv("SUPPORT_EMAIL");
    const fromEmail = requiredEnv("RESEND_FROM_EMAIL");

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: supportEmail,
        reply_to: user.email,
        subject: `Selftend feedback [${category}]`,
        html: buildFeedbackEmailHtml(category, trimmed, user.email ?? ""),
      }),
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      throw new Error(`Resend error ${resendResponse.status}: ${body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...jsonHeaders, ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...jsonHeaders, ...corsHeaders },
      status: 500,
    });
  }
});
