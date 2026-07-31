# App Links runbook — email-auth handoff (Android #183, iOS #536)

Email auth links (confirm, recovery) are plain HTTPS links on the web origin:
`https://selftend.org/auth-callback?token_hash=...&type=...` (see
`supabase/config.toml` for why they cannot use the `selftend://` scheme).
With verified App Links, Android opens those links directly in the installed
app, which completes the OTP exchange natively — no manual "go back to the
app" step. The web flow is unchanged and remains the fallback everywhere else
(desktop, iOS for now, app not installed).

## What is wired in the repo

- `app.config.ts` — production-only `android.intentFilters` entry with
  `autoVerify: true` for `https://selftend.org/auth-callback`. Dev builds are
  excluded on purpose: they sign with throwaway debug keys that
  `assetlinks.json` does not list, so verification could never succeed there.
- `public/.well-known/assetlinks.json` — served by the production web deploy
  (Cloudflare Workers static assets; `public/` is copied into `dist/`).
  Lists both fingerprints: the **Play App Signing key**
  (`38:6D:0F:D0:…:DC:CA:23`, what Play-installed builds are signed with) and
  the **upload key** (`20:3F:6E:79:…:23:B0`, covers side-loaded CI artifacts).
- `app.config.test.ts` — guards both sides against drift.

## Fingerprint provenance

Devices install builds re-signed by **Google Play App Signing**, so
`assetlinks.json` must list Google's signing certificate — the upload-key entry
alone never verifies for Play-installed builds. Both fingerprints were read
from Play Console → **Selftend** → _Test and release_ → _Setup_ →
**App integrity** (2026-07-23, via owner-authenticated browser session); the
upload-key value cross-checked against the one previously extracted from the
CI-built AAB. The App Signing certificate is only exposed in the Play Console
UI — there is no Play Developer API endpoint for it, so re-reading it after a
key rotation needs the console again.

The file goes live on the **next web production deploy** (release pipeline).

## Verifying it works (after the fingerprint lands + next app release)

```bash
# 1. The origin serves the statement (no redirect, application/json):
curl -sI https://selftend.org/.well-known/assetlinks.json | head -5

# 2. Google's checker agrees:
#    https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://selftend.org&relation=delegate_permission/common.handle_all_urls

# 3. On a device with the Play build installed:
adb shell pm get-app-links org.vasilyoshev.selftend
#    -> selftend.org: verified. If stuck "legacy_failure", force a re-check:
adb shell pm verify-app-links --re-verify org.vasilyoshev.selftend
```

End-to-end: request a password reset from the app, open the email on the
device — the link must open Selftend directly, show the "Password reset"
confirmation card (email links wait for a human press so mail scanners can't
spend the one-time token), and after pressing "Choose a new password" land on
the update-password screen.

---

# iOS Universal Links (issue #536)

The same handoff, the same failure mode. Without it, an iOS user who taps an
email-auth link lands in Safari on the web app instead of being handed to the
installed app. The custom `selftend://` scheme is unaffected — that covers
OAuth, which the app initiates itself via `ASWebAuthenticationSession`; this is
only about links arriving from _outside_ the app.

## What is wired in the repo

- `app.config.ts` — production-only `ios.associatedDomains`:
  `applinks:selftend.org` and `applinks:www.selftend.org`. Both hosts are
  claimed because both serve the app directly rather than redirecting to the
  other, so a link typed or shared as `www` would otherwise miss. Emails only
  ever produce the apex, since Supabase's SiteURL has no `www`.
  Dev builds are excluded for the same shape of reason as Android: the dev
  variant is a different bundle id (`org.vasilyoshev.selftend.dev`), which the
  association file does not list, so iOS could never associate it — and the
  entitlement would still have to be carried by the dev provisioning profile.
- `public/.well-known/apple-app-site-association` — **extensionless on
  purpose**. Apple does not accept `apple-app-site-association.json`. Scoped to
  `/auth-callback` only; widening it would hand every `selftend.org` link to
  the app, including the policy pages that email and the store listing point
  at.
- `public/_headers` — sets `Content-Type: application/json` and
  `Cache-Control: no-cache` for that path. Both are load-bearing: with no file
  extension there is nothing for the server to infer a type from, Apple
  requires JSON, and Apple fetches the file out of band, so a stale cached copy
  would keep breaking the handoff long after a fix shipped. The Android
  `assetlinks.json` needs no such rule — it has an extension.
- `app.config.test.ts` — guards the app ID (team prefix included), the path
  scoping, that the file is valid JSON, and that the dev variant stays without
  the entitlement.

## App identifier

`C5GVSW74D2.org.vasilyoshev.selftend` — team ID prefix then bundle id. A bare
bundle id never associates. Team ID confirmed 2026-07-30 (see the closing
comment on issue #526).

## Verifying it works

Needs a **real device** and a **fresh install**: iOS caches association data
per install, so an upgrade over an existing build may keep using stale data.
This is why the ticket sat behind the first installable TestFlight build.

```bash
# 1. The origin serves it as JSON, uncached, with no redirect:
curl -sI https://selftend.org/.well-known/apple-app-site-association | head -8
#    -> 200, Content-Type: application/json, Cache-Control: no-cache
#    A redirect here is fatal: Apple does not follow them.

# 2. Same for the www host, which is claimed separately:
curl -sI https://www.selftend.org/.well-known/apple-app-site-association | head -8

# 3. The body parses and lists the team-prefixed app id:
curl -s https://selftend.org/.well-known/apple-app-site-association | jq .
```

On device, after a fresh install: request a password reset, open the email on
the phone, and **long-press** the link — the share sheet shows "Open in
Selftend" when the association is live. Tapping it should open the app on the
"Password reset" confirmation card (email links wait for a human press so mail
scanners cannot spend the one-time token).

Then confirm the fallback: delete the app and tap the same link — it must open
the web app in Safari and complete there.

## If it does not work

- Apple's CDN caches the association file for a period after first fetch. A
  changed file can take time to propagate; a fresh install on a device that has
  never seen the domain is the fastest way to get a clean fetch.
- `Content-Type` wrong, a redirect, or invalid JSON all fail **silently** —
  iOS gives no user-visible error, links just keep opening Safari. Check with
  the curl commands above before suspecting the app.
- The entitlement only exists in production builds. A dev-variant build opening
  Safari is expected behaviour, not a bug.
