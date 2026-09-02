# E2E tests

Playwright specs that drive the built web app against a local Supabase stack —
the same setup CI's `e2e` job uses. Verify locally before pushing a PR.

## Run locally (one command)

```sh
npm run test:e2e:local
```

This checks Docker is up, starts local Supabase if needed, reseeds the
database, installs the Playwright Chromium build if missing, and runs the
suite. Pass Playwright args after `--`:

```sh
npm run test:e2e:local -- log-mood            # only matching spec files
npm run test:e2e:local -- --headed            # watch the browser
```

Prerequisite: Docker Desktop running. First run also builds the web export
(a few minutes); later runs reuse it via the Playwright web server.

## Time-dependence rules

CI runners are UTC, and runs happen at any hour. Two rules keep specs green:

- **Never seed timestamps that can land in the future.** The database rejects
  occurrence times more than 5 minutes ahead (`validate_occurrence_time`).
  "Today at noon" is in the future during a UTC-morning run — clamp to
  `now - 1 minute` (see `daysAgo()` in `cbt-weekly-review.e2e.test.ts`).
- **Scope emoji/text assertions to the row you mean.** Screens often render
  the same glyph in a picker and in a history entry; a bare `getByText`
  becomes a strict-mode violation (or a race) once the list paints.

## Web push and notification permission

The build bakes a committed test VAPID public key (`playwright.config.ts`, its
private half was discarded at generation), so the web reminder channel reads
`prompt-needed` — matching a real deployment — instead of `unsupported`. The
web server verifies the key actually landed in the exported bundle (Metro's
transformer cache can silently bake a stale value) and records the baked env
in `dist-e2e/e2e-baked-env.json`; `reminder-rearm.e2e.test.ts` starts with a
canary against that manifest.

`push-worker.e2e.test.ts` covers the service worker's own `push` and
`notificationclick` handlers by dispatching real push events through the CDP
command `ServiceWorker.deliverPushMessage`, which needs no push subscription
(see `docs/research/playwright-web-push-ceiling.md` on the
`research/playwright-web-push-ceiling` branch). Headless Chromium refuses
`registration.showNotification` even under a granted permission, so those
specs assert through a spy over the call, and drive `notificationclick` with
a synthetic duck-typed event.

Rules that keep the rest of the suite quiet:

- **Only `reminder-rearm.e2e.test.ts` and `push-worker.e2e.test.ts` may call
  `grantPermissions(["notifications"])`.** A granted permission is only safe
  under reminder-rearm's `PushManager` stub, or (push-worker's case) in a spec
  that never boots an authenticated shell — anywhere else, every window focus
  attempts a real `subscribe()`, which always rejects in bundled Chromium (no
  push backend) and fills the run with AbortError noise.
- **Saving a routine with its reminder on while the global toggle is on calls
  `ensureReminderChannel` and blocks navigation on failure** — a spec that
  does this without the stub + grant hangs on `waitForURL`
  (`routine-editor-screen.tsx`).

## Outbound email never leaves the machine

The `send-feedback` function emails the support mailbox, so no spec may let a
send reach it (the email-deliverability rule in `AGENTS.md`; CI also starts the
stack without an edge runtime). `support-page.e2e.test.ts` intercepts
`**/functions/v1/send-feedback` with `page.route`, fulfils every call locally,
and counts handler hits to prove both "no request was made" and "every send
was answered here". The Playwright web server pins a `.test.local` support
address so the form renders at all (without one the page has no form); a
developer's `.env.local` can still win that bake, which is why the intercept,
not the address, is what keeps mail from going out. The manifest records the
address that was baked, and `E2E_SKIP_BUILD=1` refuses an export that has
none.

## Layout

- `fixtures.ts` — per-worker pool users (`e2e-w<n>`), auto sign-in.
- `helpers.ts` — service-role seed/cleanup helpers (re-exported from
  `test/integration/helpers.ts`).
- `playwright.config.ts` (repo root) — web server on `:8099`, workers, ports.
