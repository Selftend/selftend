# Android App Links runbook — email-auth handoff (issue #183)

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

## iOS (deferred)

Universal Links need an Apple Developer account (team ID) for the
`apple-app-site-association` file and associated-domains entitlement. No
account exists yet; do this together with the first iOS release. Tracked in
issue #183.
