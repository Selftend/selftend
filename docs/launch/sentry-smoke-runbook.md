# Launch Runbook: Sentry End-to-End Smoke Test

**Purpose:** Prove that crash/error reporting actually works in a real build before
closed-testing invites go out — DSN wiring reaches the device, a deliberate error
lands in Sentry, the stack trace is symbolicated, and the privacy scrubbing holds.

**Scope:** This is the release gate described in
`docs/superpowers/plans/2026-07-04-prerelease-observability.md` Task 8. The SDK,
scrubber, gating, and capture points already ship on `main`
(`src/lib/sentry.ts`). What remains is the environment wiring plus a real-build
verification that cannot be done from the repo.

**Legend:**

- 🔒 **OWNER-ONLY** — requires credentials, a paid/console account, a physical
  build, or a product judgment call. A coding agent cannot do these.
- 🛠 **Repo/agent-doable** — can be prepared or verified from the working tree.

**Time budget:** ~60–90 min, most of it waiting on one EAS build.

---

## 0. Preconditions (verify before starting)

- 🛠 Confirm the Sentry module is wired and gated correctly. In
  `src/lib/sentry.ts`, `shouldEnableSentry(dsn, isDev)` must return `false`
  when the DSN is empty or `__DEV__` is true. This is why a dev/Expo-Go run
  will **never** send events — you must use a release-channel build.
- 🛠 Confirm `EXPO_PUBLIC_SENTRY_DSN` is documented in `.env.example` and read
  in `src/lib/sentry.ts` (`process.env.EXPO_PUBLIC_SENTRY_DSN`).
- 🛠 Confirm the config plugin (`@sentry/react-native/expo`) is in
  `app.config.ts` plugins and `metro.config.js` wraps `getSentryExpoConfig`.
  Source-map upload no-ops without `SENTRY_AUTH_TOKEN`, so a missing token only
  costs you symbolication — not event delivery.
- 🔒 You have (or will create in Step 1) a Sentry account on the plan you intend
  to run in production.

> If any repo precondition fails, stop — the observability plan has not fully
> landed and the smoke test will produce a misleading red.

---

## 1. 🔒 OWNER-ONLY — Create the Sentry org / project + tokens

At <https://sentry.io>:

1. Create (or confirm) an org with slug **`selftend`**.
2. Create a project with slug **`selftend`**, platform **React Native**.
3. Copy the **DSN** (Project Settings → Client Keys (DSN)). It looks like
   `https://<publicKey>@o<org>.ingest.sentry.io/<projectId>`.
4. Create an **org auth token** for source-map upload: Settings → Auth Tokens
   (or Developer Settings → Internal Integration). Scopes:
   `project:releases` + `org:read`. Copy it once — it is shown only once.

> The org/project slugs must match the plugin config in `app.config.ts`
> (`organization: "selftend"`, `project: "selftend"`) or map uploads 404.

---

## 2. 🔒 OWNER-ONLY — Wire the environment values into EAS

Set the DSN in both build profiles and the auth token as a secret. From a shell
with the EAS CLI authenticated (`eas login`):

```bash
eas env:create --environment preview    --name EXPO_PUBLIC_SENTRY_DSN --value "<DSN>"   --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value "<DSN>"   --visibility plaintext
eas env:create --environment preview    --name SENTRY_AUTH_TOKEN      --value "<TOKEN>" --visibility secret
eas env:create --environment production --name SENTRY_AUTH_TOKEN      --value "<TOKEN>" --visibility secret
```

Notes / gotchas:

- The DSN is **not** a secret (it ships in the client bundle by design) — mark
  it `plaintext` so build logs can confirm it resolved. The auth token **is**
  secret.
- If `eas env:create` syntax differs in your installed CLI version, use the EAS
  website → Project → Environment variables UI to set the same four values.
- Verify they registered: `eas env:list --environment preview`.
- Decision to confirm before production: the plan wires **preview** and
  **production** to the _same_ DSN/project. That is fine for closed testing, but
  it means preview-build noise and real tester crashes land in one project.
  Optionally create a separate `selftend-preview` project later and split the
  DSN by environment. 🔒 Judgment call — record whichever you choose in
  `docs/operations-runbook.md`.

---

## 3. 🛠 Add a temporary crash trigger (scratch — never committed)

In `app/_layout.tsx`, directly under the existing `initSentry();` call, add:

```ts
// TEMPORARY sentry smoke test - remove before commit.
setTimeout(() => {
  throw new Error("sentry-smoke-test " + new Date().toISOString());
}, 15_000);
```

The timestamp gives each run a unique title, so you can tell a fresh event from a
stale one. 15 s is enough to reach the first screen so the crash carries a
realistic stack.

> Leave this uncommitted. Per repo policy (AGENTS.md / this project never
> auto-commits) the controller snapshots the working tree; do not stage it.

---

## 4. 🔒 OWNER-ONLY — Build a release-channel binary

The scrubbing/gating logic only activates in a non-dev build with the DSN
present. Build a preview APK/AAB:

```bash
eas build --profile preview --platform android
```

Alternative to skip the build queue (if a local-build script exists — check
`package.json` scripts, e.g. `build:android:production:local`):

```bash
# .env must carry EXPO_PUBLIC_SENTRY_DSN for a local build
npm run build:android:production:local
```

Install the artifact on a physical device or emulator.

---

## 5. 🔒 OWNER-ONLY — Trigger and confirm the event lands

1. Launch the installed app; wait ~15 s. The deliberate error throws and the app
   should show the error boundary fallback (or crash + relaunch).
2. In Sentry → Issues, confirm a new issue titled
   `sentry-smoke-test <timestamp>` appears within ~1–2 min. If nothing arrives,
   see Troubleshooting below.

---

## 6. 🔒 OWNER-ONLY — Verify symbolication

Open the issue → latest event → stack trace. Confirm:

- [ ] Frames show **readable** file names and functions
      (`app/_layout.tsx`, `initSentry`, etc.), **not** minified
      `index.android.bundle:1:284620`.
- [ ] The frame pointing at the `setTimeout` you added is present.

If frames are minified: the source-map upload did not run. Confirm
`SENTRY_AUTH_TOKEN` resolved in the build (check the build log for a Sentry
"Uploading source maps" / "Uploaded release" line), and that the org/project
slugs in `app.config.ts` match Step 1. Re-build after fixing.

---

## 7. 🔒 OWNER-ONLY — Verify PII scrubbing (the privacy gate)

This is the most important check — the whole privacy posture depends on it. On
the same event, confirm:

- [ ] **User context**: absent, or contains **only** an `id` (a Supabase UUID).
      No `email`, no `username`, no IP shown as the user identity.
      (Enforced by `scrubEvent` in `src/lib/sentry.ts` + `sendDefaultPii:false`.)
- [ ] **Device context**: `contexts.device.name` is **absent** (it often carries
      the owner's real name, e.g. "Vasil's Pixel"). `model` may remain
      (e.g. "Pixel 8") — that is intentional and fine.
- [ ] **Breadcrumbs**: no `console` breadcrumbs (they can carry logged payloads).
      Navigation/HTTP breadcrumbs with routes + status codes are expected and OK.
- [ ] **No user content**: scan the event (tags, extra, breadcrumbs, request
      body) for any note/journal/entry text. There must be none. If you see any,
      **do not ship** — file it as a blocker and extend `scrubEvent`.

Optional deeper check: sign in on the build first (so a session/UUID exists),
then trigger the crash, and confirm the event's user is the UUID only.

---

## 8. 🔒 OWNER-ONLY — Turn on the new-issue alert

Sentry → Alerts → Create Alert → "Issues" → **A new issue is created** → action:
email to the monitored inbox (the same inbox the operations runbook's Pre-Invite
Checklist and Support Workflow reference — e.g. `support@selftend.org` forwarding
to your real inbox). Without this, a tester crash is invisible until someone
happens to open the dashboard.

- [ ] New-issue email alert exists and points at a monitored inbox.
- [ ] Send yourself a test (or rely on the smoke-test issue from Step 5) to
      confirm the alert email actually arrives.

---

## 9. 🛠 Revert the temporary crash trigger

Remove the `setTimeout` block from `app/_layout.tsx`. Confirm the working tree is
clean of the smoke-test line:

```bash
git diff -- app/_layout.tsx   # must show no smoke-test lines
```

> Do not commit anything as part of this runbook — leave the tree clean; the
> controller handles snapshots.

---

## Troubleshooting — event never arrives

Work down this list; each rules out a distinct failure:

1. **Dev/gating**: Was it a release-channel build (not Expo Go / `npm run
web` / a `__DEV__` build)? `shouldEnableSentry` returns false in dev — no
   events by design.
2. **DSN not resolved**: Did `EXPO_PUBLIC_SENTRY_DSN` reach the build? Public
   `EXPO_PUBLIC_*` vars are inlined at build time — a value set _after_ the
   build won't apply. Rebuild after setting env. Grep the build log for the DSN
   host.
3. **Wrong environment**: The build profile (`preview`) must be the one you set
   the env on. `eas env:list --environment preview`.
4. **Network / device clock**: The device must have connectivity; a wildly wrong
   device clock can cause Sentry to reject events. Check date/time.
5. **beforeSend dropping**: If you customized `scrubEvent` and it now returns
   `null`/undefined for the event, the SDK drops it. The shipped version returns
   the event — confirm you didn't leave a scratch edit in `src/lib/sentry.ts`.
6. **Project/DSN mismatch**: The DSN's project id must be the `selftend`
   project you're viewing. Copy the DSN fresh from that exact project.

---

## Sign-off checklist (owner)

All must be checked before this gate is considered passed:

- [ ] 🔒 Sentry org+project created; DSN + auth token generated (Step 1)
- [ ] 🔒 Four EAS env values set across preview + production (Step 2)
- [ ] 🔒 Release build produced and installed (Step 4)
- [ ] 🔒 `sentry-smoke-test` issue arrived in Sentry (Step 5)
- [ ] 🔒 Stack trace is symbolicated (Step 6)
- [ ] 🔒 User context is UUID-only; device name stripped; no console
      breadcrumbs; no user content (Step 7)
- [ ] 🔒 New-issue email alert live and confirmed to a monitored inbox (Step 8)
- [ ] 🛠 Temporary crash trigger removed; working tree clean (Step 9)

Record the pass date and any decisions (single-project vs split) in
`docs/operations-runbook.md`'s Pre-Invite Checklist.
