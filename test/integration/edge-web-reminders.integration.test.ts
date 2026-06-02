// Deferred edge-serve smoke for the `send-web-reminders` Deno function (spec §7.3).
//
// WHY DEFERRED / OPT-IN: this exercises the *served* Deno function over HTTP, which
// needs the function provisioned with WEB_PUSH_CRON_SECRET + VAPID env (otherwise
// `requiredEnv` makes the handler 500). The default `npm run test:integration` run
// does not provision those, so this suite is gated behind RUN_EDGE_SMOKE=1 and a
// fail-fast readiness probe. Enable it once the serve harness lands in CI.
//
// WHAT IT GUARDS: the Deno wrapper's HTTP contract and that the served function is
// actually wired to the shared scheduling module. The midnight due-window math
// itself (the Intl 1-24 clock → hour 0 normalization, i.e. the `% 24` fix) is
// guarded deterministically by the unit tests in
// `supabase/functions/_shared/web-reminders.test.ts`
// ("normalizes midnight to hour 0..." and "fires a midnight reminder..."), which
// run on every `npm test`. This smoke confirms the wrapper those units feed is live.
//
// To run:  RUN_EDGE_SMOKE=1 WEB_PUSH_CRON_SECRET=<same-as-served-fn> npm run test:integration
import { LOCAL_SUPABASE_URL } from "./helpers";

const FUNCTION_URL = `${LOCAL_SUPABASE_URL}/functions/v1/send-web-reminders`;
const CRON_SECRET_HEADER = "x-selftend-cron-secret";

const enabled = process.env.RUN_EDGE_SMOKE === "1";
const cronSecret = process.env.WEB_PUSH_CRON_SECRET ?? "";

// describe.skip by default so the standard integration run is untouched.
(enabled ? describe : describe.skip)("send-web-reminders edge function (serve smoke)", () => {
  beforeAll(async () => {
    if (!cronSecret) {
      throw new Error(
        "RUN_EDGE_SMOKE=1 requires WEB_PUSH_CRON_SECRET to be set to the same value the served function uses.",
      );
    }
    // Readiness probe: a correctly-authenticated call must not 500. A 500 means the
    // function is unreachable or missing WEB_PUSH_* env - fail fast with guidance
    // instead of emitting confusing per-test failures.
    let probe: Response;
    try {
      probe = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { [CRON_SECRET_HEADER]: cronSecret },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `send-web-reminders is not reachable at ${FUNCTION_URL}.\n` +
          `Serve it with the local stack and export WEB_PUSH_* env.\n` +
          `Underlying error: ${message}`,
      );
    }
    if (probe.status === 500) {
      const body = await probe.text();
      throw new Error(
        `send-web-reminders returned 500 - it is not provisioned (likely missing WEB_PUSH_* env).\n` +
          `Configure WEB_PUSH_CRON_SECRET + VAPID keys for the served function, then retry.\n` +
          `Body: ${body}`,
      );
    }
  });

  it("rejects a request with no cron secret (401 Unauthorized)", async () => {
    const response = await fetch(FUNCTION_URL, { method: "POST" });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("rejects a request with a wrong cron secret (401 Unauthorized)", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { [CRON_SECRET_HEADER]: `${cronSecret}-wrong` },
    });

    expect(response.status).toBe(401);
  });

  it("accepts a correctly-authenticated call and returns the {sent, disabled} shape", async () => {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { [CRON_SECRET_HEADER]: cronSecret },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { sent?: unknown; disabled?: unknown };
    expect(typeof body.sent).toBe("number");
    expect(typeof body.disabled).toBe("number");
  });
});
