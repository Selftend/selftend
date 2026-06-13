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

    // Reject oversized bodies BEFORE buffering/parsing them (#88). A valid payload is at most
    // ~1.1 KB (category <= 40 + message <= 1000 chars), so a generous 16 KB cap rejects nothing
    // legitimate. Check the declared Content-Length first, then re-check the actual body length
    // (defends against a missing/forged Content-Length header).
    const MAX_BODY_BYTES = 16384;
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 413,
      });
    }

    let payload: { category?: unknown; message?: unknown };
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_BODY_BYTES) {
        return new Response(JSON.stringify({ error: "Invalid input" }), {
          headers: { ...jsonHeaders, ...corsHeaders },
          status: 413,
        });
      }
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 400,
      });
    }

    const { valid, trimmed, category } = validateFeedbackInput(payload.category, payload.message);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 400,
      });
    }

    // Per-user rate limit (prevents authenticated email-bomb / Resend quota abuse).
    const { data: allowed, error: rateError } = await supabase.rpc("record_feedback_submission");
    if (rateError) throw rateError;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 429,
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
        // `category` here is the sanitized value returned by validateFeedbackInput.
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
    // Log detail server-side; return a generic message so upstream/internal errors and
    // env-var names are never disclosed to the client.
    console.error("send-feedback failed:", error);
    return new Response(JSON.stringify({ error: "Failed to send feedback" }), {
      headers: { ...jsonHeaders, ...corsHeaders },
      status: 500,
    });
  }
});
