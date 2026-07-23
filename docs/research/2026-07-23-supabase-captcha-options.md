# CAPTCHA options for Supabase auth on Expo RN + web

> Research for [wayfinder ticket #188](https://github.com/Selftend/selftend/issues/188),
> resolved 2026-07-23. Feeds the enable-or-re-defer decision (#189). All sources are
> official/primary (Supabase docs, GoTrue + auth-js source, Cloudflare and hCaptcha docs);
> date checked for every URL: **2026-07-23**.

## 1. Supabase Auth built-in CAPTCHA

- **Providers: exactly two — Cloudflare Turnstile and hCaptcha** ([auth-captcha guide](https://supabase.com/docs/guides/auth/auth-captcha)). Confirmed in GoTrue source: `getCaptchaURL()` knows only the hCaptcha and Turnstile siteverify endpoints ([captcha.go](https://github.com/supabase/auth/blob/master/internal/security/captcha.go)).
- **Config:** Dashboard → Project Settings → Authentication → **Bot and Abuse Protection** → enable CAPTCHA, pick provider, paste the provider **secret key**. Self-hosted/local GoTrue: `GOTRUE_SECURITY_CAPTCHA_ENABLED` / `_PROVIDER` / `_SECRET` / `_TIMEOUT` ([example.env](https://github.com/supabase/auth/blob/master/example.env)).
- **Server-side enforcement:** GoTrue middleware `verifyCaptcha` reads `gotrue_meta_security.captcha_token` from the request body and POSTs `secret`, `response`, `remoteip` to the provider's siteverify endpoint. Missing/invalid token → HTTP 400, error code `captcha_failed`, message `captcha protection: request disallowed (...)` ([middleware.go](https://github.com/supabase/auth/blob/master/internal/api/middleware.go)). Enforcement is server-side — a client that omits the token is rejected, so it cannot be bypassed by a modified client.
- **Flows covered** (routes wrapped with `verifyCaptcha` in [api.go](https://github.com/supabase/auth/blob/master/internal/api/api.go)): `/signup`, `/token?grant_type=password` (signInWithPassword), `/otp` + `/magiclink` (signInWithOtp), `/recover` (resetPasswordForEmail), `/resend`, `/sso`. **Exempt:** `/token` with `refresh_token` / `pkce` / `id_token` grants, admin (service-role) requests, `/authorize` (signInWithOAuth — no `captchaToken` option exists for it), `/logout`, user/MFA endpoints. Anonymous sign-ins accept `captchaToken` and Supabase strongly recommends CAPTCHA for them ([anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)).
  - Open flag: auth-js types accept `captchaToken` on `verifyOtp`, but server-side enforcement on `/verify` was not confirmed from the router source — treat as unverified.
- **Client shape (supabase-js v2, current):** `options: { captchaToken }` on `signUp`, `signInWithPassword`, `signInWithOtp`, `signInAnonymously`, `signInWithIdToken`, `signInWithWeb3`, `verifyOtp`, `resend`, `signInWithSSO`; `resetPasswordForEmail(email, { redirectTo, captchaToken })`. auth-js maps it to the `gotrue_meta_security.captcha_token` wire field ([GoTrueClient.ts](https://github.com/supabase/auth-js/blob/master/src/GoTrueClient.ts), [types.ts](https://github.com/supabase/auth-js/blob/master/src/lib/types.ts)). Example from the guide: `supabase.auth.signUp({ email, password, options: { captchaToken } })`.

## 2. Getting a token in the Expo React Native app

- **Cloudflare Turnstile has no native mobile SDK.** The officially documented path is a WebView loading a page that hosts the widget; Cloudflare provides implementation examples for React Native WebView (plus Android/iOS/Flutter) and lists the WebView requirements (JS, DOM storage, access to `challenges.cloudflare.com`, stable User-Agent) ([mobile implementation](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/)). There is no Expo module for Turnstile.
- Community option `react-native-turnstile` is a thin WebView wrapper that loads a **maintainer-hosted page on a third-party domain** you must allowlist — minimal maintenance (7 commits, no releases) and an availability/privacy dependency on a stranger's domain ([repo](https://github.com/designly1/react-native-turnstile)). Not acceptable under the dependency policy.
- **hCaptcha has an official React Native SDK**: [`@hcaptcha/react-native-hcaptcha`](https://github.com/hCaptcha/react-native-hcaptcha) (official hCaptcha org, actively maintained — v4.1.0 released 2026-07-20), WebView-based (requires `react-native-webview`), with first-party Expo examples. Defaults to invisible mode; passive sitekeys supported via `passiveSiteKey` (likely a paid-tier feature — tier unverified).
- No Supabase first-party "CAPTCHA in React Native" guide exists (searched docs + blog; the official RN auth blog post has no captcha mention).
- **Dependency-policy read:** either path adds `react-native-webview` (not currently in `package.json`). Turnstile-on-native means hand-rolling Cloudflare's WebView recipe (self-hosted HTML, ~1 small file, no new npm dep beyond webview); hCaptcha-on-native means one official, maintained npm dep. There is no Expo built-in for this capability, so a new dependency is justified if CAPTCHA is triggered — the choice is "official hCaptcha SDK" vs "own ~100-line Turnstile WebView component".
- A hybrid is possible: Supabase's captcha setting is **one provider project-wide**, so native and web must use the same provider — you cannot mix Turnstile on web with hCaptcha on native.

## 3. Web (React Native Web) path

- Standard widget: load `https://challenges.cloudflare.com/turnstile/v0/api.js` and either implicit (`<div class="cf-turnstile" data-sitekey>`) or explicit (`turnstile.render(...)`) rendering; widget modes Managed / Non-interactive / Invisible are set per-widget in the Cloudflare dashboard. Tokens are **single-use and expire after 300 s** — fetch near submit time and reset the widget after a failed attempt ([client-side rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)).
- For a React tree, Supabase's own guide uses [`@marsidev/react-turnstile`](https://github.com/marsidev/react-turnstile) (actively maintained, v1.5.3 2026-06, ~6 kB, invisible-size support) — web-only, so it would be loaded behind a `Platform.OS === "web"` split.
- hCaptcha equally has a standard web React wrapper (`@hcaptcha/react-hcaptcha`), so a single-provider hCaptcha setup covers both platforms with two official SDKs from the same org.

## 4. Operational effects

- **Existing sessions are untouched.** `verifyCaptcha` explicitly skips `refresh_token`/`pkce`/`id_token` grants and `refreshSession()` has no captcha parameter — enabling CAPTCHA only affects _new_ password sign-ins, sign-ups, OTP, recover, resend, SSO ([middleware.go](https://github.com/supabase/auth/blob/master/internal/api/middleware.go)).
- **e2e (Playwright): no impact as-is.** Our e2e suite runs against the local Supabase stack; `supabase/config.toml` has no captcha section, so local GoTrue keeps captcha off and `test/e2e/fixtures.ts`'s `signInWithPassword` keeps working with no token. Service-role admin calls are always exempt. Client code must only _conditionally_ pass `captchaToken` (e.g. when a sitekey env var is set) so the captcha-less local stack still accepts requests.
- **If a captcha-on environment ever needs e2e:** Turnstile publishes dummy keys — sitekey `1x00000000000000000000AA` (always pass) with secret `1x0000000000000000000000000000000AA`; the dummy token is `XXXX.DUMMY.TOKEN.XXXX` and only validates against the dummy secret, so the test secret must be set in that environment's Supabase captcha setting ([testing docs](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)). hCaptcha's well-known test pair (`10000000-ffff-ffff-ffff-000000000001` / `0x000...000`) appears in Supabase's own example.env.
- **Privacy cost:**
  - _Turnstile_ ([privacy addendum](https://www.cloudflare.com/turnstile-privacy-policy/)): collects client IP, TLS fingerprint, User-Agent, sitekey+origin; used solely for bot detection, contractually never to identify/profile/target users; Cloudflare acts as processor for our traffic. No behavioral keystroke/mouse capture.
  - _hCaptcha_ ([privacy policy](https://www.hcaptcha.com/privacy)): collects behavioral data (mouse movements, keypresses, touch events), IP, timestamps; retention up to ~1 year (longer for abuse); GDPR processor with SCCs, DPF-certified; states data is not sold/shared for advertising.
  - For our data-minimization guardrails, **Turnstile's signal list is materially smaller** — the trade-off is that hCaptcha owns the only official RN SDK.

## 5. Implementation cost estimate (this repo)

Assuming Supabase's built-in toggle (option A in the runbook) with a single provider:

| Item                               | Cost                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard/config                   | Enable in prod (and staging) dashboard with provider secret; local `supabase/config.toml` untouched (captcha stays off locally)                                                                   |
| `src/features/auth/api.ts`         | Thread optional `captchaToken?` through `signInWithPassword`, `signUpWithPassword`, `sendPasswordResetEmail`, `resendVerificationEmail` (~4 signatures; OAuth Google path needs nothing)          |
| Auth forms (`src/components/app/`) | `sign-in-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `verify-email-form.tsx` — render the widget (invisible mode) and pass the token; reset widget on failure (single-use tokens)  |
| New shared component               | ~1 `captcha.tsx` with a `.web.tsx` split (web widget vs native WebView/SDK)                                                                                                                       |
| New deps                           | Turnstile: `react-native-webview` + `@marsidev/react-turnstile` (web) + own WebView HTML; hCaptcha: `react-native-webview` + `@hcaptcha/react-native-hcaptcha` + `@hcaptcha/react-hcaptcha` (web) |
| Env                                | 1 public sitekey env var (`EXPO_PUBLIC_...`); token-passing gated on its presence                                                                                                                 |
| i18n                               | Error copy for `captcha_failed` in the auth namespace, all languages                                                                                                                              |
| Tests                              | Unit tests for the token plumbing; e2e unchanged (local stack captcha-off)                                                                                                                        |
| Docs                               | `docs/operations-runbook.md` CAPTCHA section + Deferred Security Decisions update                                                                                                                 |

Rough size: **~10–12 files touched, 2–3 new npm deps, no migrations, no session migration risk.** Small-to-medium PR; the only genuinely new surface is the native WebView captcha component.

## Recommendation sketch (for #189)

- If triggered: prefer **Cloudflare Turnstile** for privacy posture, accept hand-rolling the ~100-line native WebView component per Cloudflare's official recipe; or accept hCaptcha's larger data collection in exchange for two official SDKs. Both work with the same `captchaToken` plumbing, so the plumbing PR is provider-agnostic.
- The runbook's option B (Edge Function proxy, web only) protects nothing on native and adds custom auth surface; the built-in toggle is strictly better now that the native path is understood.

## Open flags (unverified)

1. Server-side enforcement on `/verify` (verifyOtp) unconfirmed from router source.
2. hCaptcha passive-sitekey tier requirement and full current test-key list not confirmed from hCaptcha docs directly.
3. Turnstile "Ephemeral ID" feature details (siteverify response field) not fetched.
