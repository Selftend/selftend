# Debt inventory verified — an anchor for every candidate

Date: 2026-09-28 · Map: [#2779](https://github.com/Selftend/selftend/issues/2779) · Ticket: [#2780](https://github.com/Selftend/selftend/issues/2780)

Every candidate below was verified against the code at `dev` HEAD `34c6bcc4`, never
against the sweep's own claims. Verdicts: **Confirmed** / **Partly wrong** / **Killed**.
A wrong claim is recorded as wrong, with the evidence, not dropped.

## Headline

Four candidates confirmed, one partly wrong, one killed. The two surprises: the
"silently lost" characterisation of the swallowed catches is wrong at the telemetry
level — **every mutation failure is Sentry-reported by the global `MutationCache`**, and
one of the 34 sites even shows the global save-failed toast — and the avatar-cleanup
candidate is dead on arrival: **account deletion does authoritative server-side Storage
cleanup inside the deleting transaction**, so the client-side swallow cannot orphan
anything.

---

## 1. The 34 `.catch(() => undefined)` sites — **Partly wrong**

**The count is exact; "silently lost" is not.**

Count and spread confirmed: exactly 34 sites across 9 files under `src/features/`
(`use-cbt-program.ts` ×7 at :97,113,122,131,157,172,181; `use-act-program.ts` ×7 at
:98,114,123,130,156,171,178; `use-dbt-program.ts` ×7 at :101,117,124,131,159,176,183;
`meditation-home-screen.tsx` ×6 at :240,249,256,264,269,276; `meditation-sit-screen.tsx`
×2 at :273,278; `settings/queries.test.tsx` ×2 at :165,205; `sounds-sheet.tsx:37`;
`use-keep-starter-routine.ts:49`; `use-settings-sync.ts:74`).

What the sweep missed:

- **No mutation failure is lost to telemetry.** The app query client's `MutationCache`
  `onError` reports every mutation error to Sentry (`src/lib/query-client.ts:76-83`,
  via `reportMutationError` at :54-58) and shows a global "save failed" toast unless the
  mutation sets `meta.suppressGlobalErrorToast` (:80-82). A call-site
  `.catch(() => undefined)` only prevents an unhandled promise rejection; the failure
  still flows through the cache.
- **One of the 34 surfaces a user-facing toast**: `meditation-home-screen.tsx:238-240`
  (`commitDuration`) uses `useUpsertMeditationProgramState`
  (`src/features/meditation/queries.ts:180-190`), which does **not** suppress the global
  toast — so that failure toasts and reports.
- **Two of the 34 are test code** (`src/features/settings/queries.test.tsx:165,205` —
  assertions on the error path), not product debt.
- **Ten sites are documented deliberate best-effort**, each with the reasoning in a
  comment at the site: the five meditation-home preference writes
  (`meditation-home-screen.tsx:229-231` — "a failed write must not surface as an
  error"), both meditation-sit writes (`meditation-sit-screen.tsx:265-269` — "No retry,
  no toast, no error copy … the local pair above is why it does not have to"),
  `sounds-sheet.tsx:35-37` ("Best-effort persistence … the local selection is applied
  immediately regardless"), `use-settings-sync.ts:71-74` (a language-**bundle** load,
  not a mutation — the one site of the 34 Sentry does not see; the effect re-runs and
  self-heals), and `use-keep-starter-routine.ts:48-49` (a best-effort rollback whose
  **original** error still surfaces via `setError` at :51).

What survives of the claim — the real finding:

- **The 21 programme-hook sites are user-silent, and the suppression's stated
  justification is false for them.** All 21 go through `useUpdateUserPreferences`
  (`src/features/settings/queries.ts:35-74`), which sets
  `meta: { suppressGlobalErrorToast: true }` at :47 with the comment "screen shows its
  own save-error toast" — but the three programme hooks expose `isUpdating` and **no
  error state** (`use-cbt-program.ts:196`), so no calling screen can show one, and none
  does. The comment at queries.ts:44-45 itself concedes some callers "intentionally
  swallow". A failed `startProgram`/`advancePhase`/`abandonProgram` write is
  Sentry-reported and the optimistic patch rolls back (:48-62) — the tap visibly does
  not stick — but the person gets no message and no retry. That is the debt; "silently
  lost" overstates it.

**Near-copies: confirmed and measured.** Raw diffs run 157 (cbt↔act), 163 (act↔dbt)
differing lines; with the module prefixes masked (`cbt|act|dbt` → `zz`) they fall to 95
(cbt↔act), 114 (cbt↔dbt), 99 (act↔dbt) out of 195-200 lines — and essentially the whole
residue is the module-specific data-source block (imports, query hooks, derive inputs,
memo deps). The seven mutation actions, the interface, and the return are
**token-identical modulo prefix** across all three files. A shared
`useProgramActions`-style helper would collapse ~120 duplicated lines per hook and give
one place to fix the error-surfacing gap above.

## 2. Metro/worktree web-export crash — **Confirmed** (log found, at a corrected location)

The map said the log was "in the untracked `dist-surface3/`" — it is not: it lives at
the repo root as `expo-web-surface3.log` (untracked and invisible in `git status`
because `.gitignore:34` ignores `*.log`). `dist-surface3/` holds only the six copied
public assets (`_headers`, favicons, `manifest.webmanifest`, `robots.txt`,
`selftend-push-worker.js`) — no `index.html`, no `_expo/` — i.e. the export died before
bundling. The log confirms the crash verbatim:

```
Error: ENOENT: no such file or directory, watch
'C:\Users\vasil\Projects\selftend\.claude\worktrees\play-promo-video-record\.codex\skills\grill-me'
    at #watchdir (…\node_modules\@expo\metro-file-map\build\watchers\FallbackWatcher.js:164:38)
```

Metro's file-map crawler walked `.claude/worktrees/**` and a transient agent-worktree
directory vanished mid-walk. Both config facts confirmed:

- `metro.config.js` is 8 lines — `getSentryExpoConfig` + `withNativeWind` — and sets no
  `resolver.blockList` (and no watcher ignore) for `.claude/`.
- `.gitignore:7-9` covers `dist/`, `dist-e2e/`, `dist-e2e-*/` and nothing wider, which
  is why `dist-surface3/` sat untracked in `git status`.

**Fix shape (not implemented here):** merge a `.claude` exclusion into
`config.resolver.blockList` in `metro.config.js` (e.g. `exclusionList([/\.claude([\\/].*)?$/, config.resolver.blockList])`
from `metro-config/src/defaults/exclusionList`) so metro-file-map neither crawls nor
watches agent worktrees, and widen `.gitignore`'s `dist-e2e-*/` to `dist-*/` (covers
`dist-surface3/` and future one-off export dirs). The eslint ignores at
`eslint.config.js:297-301` mirror the same three patterns and want the same widening —
`npm run lint` is `eslint .` (`package.json:24`), so an untracked `dist-surface3/`'s
`.js` is currently lintable.

## 3. Edge functions: no lint, no types, no Deno in CI — **Confirmed**

- `eslint.config.js:309` — `"supabase/functions/**"` sits in the global `ignores`.
- `tsconfig.json` — `"exclude": ["supabase/functions/**"]`, so `npm run typecheck`
  never sees them either (the sweep undersold this half).
- No workflow under `.github/workflows/` (21 files) mentions Deno — grep for
  `deno|supabase/functions` matches nothing. `ci.yml`'s verify job runs
  `npm run verify` = lint + format + tsc + jest + coverage ratchet (`package.json:37`),
  and both the integration and e2e jobs start Supabase with `-x … edge-runtime`
  (`ci.yml:108,166`) — the functions are not even executed in CI.
- The gap is self-documented in the code the map pointed at:
  `src/features/notifications/reminder-rollout.ts:20-24` — "eslint ignores
  `supabase/functions/**`, CI runs no Deno, and tsc and jest both resolve a React
  Native import happily, so the first one added here would surface at
  `supabase functions deploy`, after the merge." (Path clarification: that file lives
  under `src/features/notifications/`, shared into the Deno side by relative import —
  not under `supabase/functions/`.)
- Affected: `supabase/functions/send-feedback`, `send-web-reminders`, `_shared`.

## 4. Avatar cleanup swallowed during account deletion — **Killed**

The swallow exists (`src/features/settings/repository.ts:734-738`) and cannot orphan
Storage objects. The comment above it (:730-733) is accurate, and the migrations bear it
out:

- The current `delete_user_account()` (latest definition:
  `supabase/migrations/20260826000000_account_purge_helper.sql`, function at :62)
  delegates to `purge_user_account(uid)`, which deletes **every object under
  `profile-pics/{uid}/` from `storage.objects`** (:41-43, with the transaction-local
  `storage.allow_delete_query` GUC from `20260577_delete_account_storage_guard.sql`)
  before deleting the user's rows and `auth.users` — all in **one transaction**.
- So: client cleanup fails → the RPC removes the objects anyway. The RPC's storage
  delete fails → the whole transaction aborts and the account survives. The state the
  candidate feared — objects left after the account row is gone — is unreachable
  through this path.
- History runs the other way: the swallow was **added** because a thrown client-side
  cleanup previously aborted the erasure and left the account and all PHI undeleted
  (:731-733). Removing the swallow would reintroduce that bug. Not a privacy finding,
  and no housekeeping needed.

## 5. Weblate `modules` / `dbt` component drift — **Confirmed** (doc level)

`docs/stack.md:58` says it in exactly the claimed terms: "**Weblate has not caught
up:** its `modules` component now matches no file and its `dbt` namespace has no
component. Both are owner actions — remove the one, run
`node scripts/weblate-create-components.js --apply` for the other, after the change
reaches `main`." The repo side corroborates: `src/i18n/locales/en/` holds exactly the
20 namespace files including `dbt.json` and no `modules.json` (parity with `bg/` is
test-enforced by `src/i18n/locale-parity.test.ts`). Live Weblate was not called, per
the ticket. One touch-up for whoever acts: `docs/stack.md:66` still bolds "All 20
namespaces are tracked", which line 58's caveat contradicts within the same doc.

## 6. The docs staleness pile — **Confirmed** (all eight items real; one scoped)

**a. `meditation-tmi.md` §3 "planned" vs the shipped migration — Confirmed.**
`docs/modules/meditation-tmi.md:406` still heads "### Tables (planned, not yet
migrated)", listing `meditation_program_state` and the `meditation_sessions`
extension — both shipped in `supabase/migrations/20260526_meditation_tmi.sql` (ALTER
`meditation_sessions` ADD `stage_at_session` at :7, CREATE TABLE
`meditation_program_state` at :22, plus `stage_practice_notes`).

**b. `act-harris-happiness-trap.md` gap table vs the ACT code — Confirmed, scoped.**
Stale rows: :94 marks Choice Point **Missing** while `act_choice_points` shipped
(`supabase/migrations/20260550_act_program_choice_point.sql`,
`src/features/act/queries/choice-points.ts`, consumed by `use-act-program.ts:39`); :102
marks Drop Anchor **Missing** while `dropAnchor` is in the `ConnectionTechnique` union
(`src/features/act/types.ts:164`); and :105's disposition "Add `bodyScan`" is done
(same union). The rest of the table **holds**: `DefusionTechnique` still has exactly
the seven techniques the doc marks Have (`types.ts:19-26` — no name-the-process, no
play-with-text, no soundtrack), the TAME rename never happened (`types.ts:109` still
`fourStepExpansion`), and creative hopelessness, willingness, HARD barriers, and
self-compassion have no code. So the fix is three rows, not a rewrite.

**c. Habits/gratitude "no reminders" vs `docs/reminders.md` — Confirmed.**
`docs/modules/habits.md:116,242,262,301` ("out of scope until reviewed", "Explicitly
_not_ shipped"), `docs/modules/gratitude-log.md:5` and :64-66 ("## Reminders — None…
must not schedule notifications"), and `docs/modules/gratitude.md:147,221` are all
contradicted by the shipped opt-in reminders: `src/features/notifications/registry.ts`
carries `habits` and `gratitude` targets with enabled/hour/minute/timezone preference
keys (:10-69), and `docs/reminders.md:74` lists their taken default slots ("9 habits …
20 gratitude").

**d. `internal-testing.md` — Confirmed.** :25 "iOS TestFlight/App Store work is
deferred … until Apple Developer Program funding" contradicts the same doc's :175 (the
enrolment "is done" 2026-07-30, "the deferral … is therefore resolved") and the live
App Store app (live on 0.21.0 per
`src/features/notifications/reminder-rollout.ts:33-34`). :36 still describes the Home
recommendation wizard applying "reviewed widgets" — removed; `recommendation` matches
nothing under `src/features/` or `app/` (the surviving `src/features/widgets/` is the
Android launcher widget). :179 "What remains before iOS builds flow is the one-time
Apple setup" — they have flowed. :197 calls web-push VAPID keys, Edge Function secrets
and cron "deferred reminder infrastructure" — `supabase/functions/send-web-reminders`
and `supabase/migrations/20260508000000_web_push_notifications.sql` shipped.

**e. `releasing.md` Apple one-time setup reads as outstanding — Confirmed.**
`docs/releasing.md:277-297` still frames the setup as pending ("while this is
outstanding", :279) and :281 bolds that the spend decision is what internal-testing.md
"defers" — internal-testing.md:175 records it made. With the App Store live on 0.21.0,
steps 1-6 including `IOS_RELEASE_ENABLED=true` (:294) are done; the section needs a
done-marker reframing it as the historical runbook it now is, not deletion.

**f. `costs.md` still advising to buy selftend.org — Confirmed.** :27 "buy
`selftend.org` if available and use it as the canonical web and app-store policy
domain" — the domain is owned and in production: `wrangler.toml:1` (production →
selftend.org), `docs/deployment.md:7` (registrar Porkbun, DNS Cloudflare), and
costs.md's own :105 already treats `selftend.org` as verified.

**g. `measurement.md` §10 done-items unmarked — Confirmed.** Only item 4 carries a ✅
(:303) and :298 still says "Ready for `/to-tickets`", yet every item is built: item 1 →
`supabase/migrations/20260914000000_account_origin.sql`; item 2 → the atomic
`update(…).is("account_origin", null)` in `stampAccountOrigin`
(`src/features/settings/repository.ts:702-720`) wired through `recordAgeAttestation`
(:643); item 3 → `test/account-origin-check-parity.test.ts`,
`src/components/app/age-gate.test.tsx`, `src/features/settings/repository.test.ts`;
item 5 → the exact `script-src` token-set parse in
`test/theme-web-surfaces.test.ts:80-95`; item 6 → the "Account origin" glossary entry
at `CONTEXT.md:337` and ADR-0007 (the beacon incident).

**h. `cbt-doc-reconciliation.md` follow-up unapplied — Confirmed.** Its own status
header (`docs/modules/cbt-doc-reconciliation.md:3-5`) says the recommended `cbt.md`
edits are still un-applied, and they are: `docs/modules/cbt.md` remains titled "CBT
Module Spec" with no as-built pointer header, no "Known deltas vs canonical spec"
section, and no `/modules/cbt/saved/[id]` route entry (the recommendations sit at
cbt-doc-reconciliation.md:220-258, marked owner-gated).
