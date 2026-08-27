import { createClient } from "npm:@supabase/supabase-js@2.103.2";
import {
  buildFeedbackDiscordPayload,
  buildFeedbackEmailHtml,
  resolveReplyTo,
  validateFeedbackInput,
} from "../_shared/feedback.ts";
import { sendEmail } from "../_shared/ses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { "Content-Type": "application/json" };

// Provided by the Supabase Edge Runtime; absent in other runtimes, so the
// mirror below guards with typeof before touching it.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

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

    let payload: { category?: unknown; message?: unknown; replyTo?: unknown };
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

    // Guest reply-to (#1447): only an anonymous caller may supply one -
    // registered callers keep the JWT-resolved address whatever the payload
    // says. The guard itself lives in _shared/feedback.ts, where jest covers it.
    const replyTo = resolveReplyTo(user, payload.replyTo);
    if (!replyTo.valid) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 400,
      });
    }

    // Per-user rate limit (prevents authenticated email-bomb / SES quota + cost abuse).
    const { data: allowed, error: rateError } = await supabase.rpc("record_feedback_submission");
    if (rateError) throw rateError;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        headers: { ...jsonHeaders, ...corsHeaders },
        status: 429,
      });
    }

    const supportEmail = requiredEnv("SUPPORT_EMAIL");
    const fromEmail = requiredEnv("SES_FROM_EMAIL");

    // A guest-typed reply-to is anyone's address - label it as such in the
    // email body so support never reads it as a proven sender identity.
    const fromLabel = user.is_anonymous === true ? "Guest reply-to (unverified)" : "From";

    // `category` is the sanitized value returned by validateFeedbackInput; sendEmail
    // throws on any non-2xx SES response, caught by the outer try/catch below.
    await sendEmail(
      {
        accessKeyId: requiredEnv("SES_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("SES_SECRET_ACCESS_KEY"),
        region: requiredEnv("SES_REGION"),
      },
      {
        from: fromEmail,
        to: supportEmail,
        replyTo: replyTo.replyTo,
        subject: `Selftend feedback [${category}]`,
        html: buildFeedbackEmailHtml(category, trimmed, replyTo.replyTo ?? "", fromLabel),
      },
    );

    // Mirror to the private #feedback-inbox Discord channel (#1489), only
    // after the email succeeded - a client retry after a 500 must not
    // double-post. Read the secret directly, not via requiredEnv: an absent
    // secret means the mirror is off in this environment, never a 500.
    const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (discordWebhookUrl && typeof EdgeRuntime !== "undefined") {
      // waitUntil keeps the worker alive without adding Discord's round-trip
      // to the user's response (a bare floating fetch is dropped when the
      // worker retires). The catch must live INSIDE the task: the outer catch
      // below never sees a rejection inside waitUntil, and a throw here would
      // turn an already-sent email into a client-facing 500.
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            const response = await fetch(discordWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildFeedbackDiscordPayload(category, trimmed)),
              signal: AbortSignal.timeout(10_000),
            });
            // Best-effort single attempt, never a retry - especially not on
            // 404 (deleted webhook; repeated 404s trigger a temporary Discord
            // IP ban). The loss case is "a maintainer reads the email instead".
            if (!response.ok) {
              console.error("send-feedback: discord mirror failed with status", response.status);
            }
          } catch (error) {
            // A fetch error's message can embed the webhook URL, which is a
            // full credential - log only the error name, never the message,
            // and never the user's feedback text.
            console.error(
              "send-feedback: discord mirror failed:",
              error instanceof Error ? error.name : "unknown error",
            );
          }
        })(),
      );
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
