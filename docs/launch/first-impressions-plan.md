# Launch Plan: First-Run & First-Impressions Test

**Purpose:** A structured, repeatable test plan a fresh tester (or the owner
role-playing one) follows on a **clean install**, so the first five minutes —
the part that decides whether someone stays — are deliberately good: the signup
funnel completes, empty states feel inviting rather than broken, copy tone is
calm and non-clinical, crisis-safety surfaces are present and correct, and the
app feels fast.

**How to use this doc:**

- Run the **script in Part 2** end-to-end on a device that has never had the app
  installed (or after a full uninstall + data clear). Do it for **both a real
  fresh account** and, separately, note where the demo/seed account differs.
- Capture findings in the **scorecard (Part 4)**. Anything marked **BLOCKER**
  stops the invite wave.
- Run once in **English** and once in **Bulgarian** (switch language in
  Settings) — first impressions must hold in both, and BG copy must obey the
  register rulings in `docs/superpowers/bg-copy-audit-2026-07.md`.

**Legend:**

- 🔒 **OWNER/TESTER-ONLY** — needs a real device, a human judgment call on tone,
  or a real signup. Cannot be done by a coding agent.
- 🛠 **Agent-verifiable** — a claim that can be checked against the repo/tests.

---

## Part 0 — Test matrix

Run the script across this matrix (minimum bolded combos before invites):

| Dimension | Values                               | Minimum before invites              |
| --------- | ------------------------------------ | ----------------------------------- |
| Platform  | Android (release build), Web         | **Android release build** + **Web** |
| Language  | EN, BG                               | **Both**                            |
| Account   | Fresh real signup, Demo/seed account | **Fresh real signup**               |
| Network   | Normal, Offline (airplane mode)      | **Normal** + one **offline** pass   |
| Theme     | Light, Dark                          | At least skim **both**              |

---

## Part 1 — What "good" means (rubric)

Score each surface 1–5 against these. A first impression fails on any single
BLOCKER even if the average is high.

1. **Funnel completes** — a new user can go install → account → first real
   screen with **no dead end**, no unexplained error, no infinite spinner.
2. **Empty states invite action** — every first-view screen with no data yet
   shows a purposeful empty state (what this is + one clear next step), never a
   blank void, a raw "no data", or a broken-looking layout.
3. **Copy tone** — warm, plain-language, non-clinical, non-alarming. No medical/
   diagnostic/outcome claims (AGENTS.md rule). Hyphens not em-dashes, `...` not
   the ellipsis character (repo convention).
4. **Crisis safety is present and honest** — crisis/safety affordances appear
   where distress is plausible, are one tap from help, and never overpromise
   (it points to real services; it is not emergency support).
5. **Perceived performance** — first meaningful screen paints fast; taps give
   immediate feedback; no janky reflow as images/data load; images are crisp
   (WebP conversion shouldn't have introduced banding).

---

## Part 2 — The tester script (run in order)

> Tester: read each step, do it, then jot Pass / Concern / BLOCKER + a note in
> the Part 4 scorecard. Don't fix anything mid-run — just record.

### Stage A — Store & install (perceived value before download)

1. 🔒 Look at the store listing (or the pre-submission draft in
   `docs/android-closed-testing.md`): does the short description + first
   screenshot make it clear what the app _is_ in 5 seconds? Is "18+ / not a
   medical device" discoverable?
2. 🔒 Install on a device that has **never** run Selftend. Time from tap-open to
   first interactive screen — note if it feels slow (> ~3 s cold).

### Stage B — First launch & onboarding

3. 🔒 First screen after launch: is it a calm landing / value framing, or does it
   dump you straight into a form? Note the emotional tone.
4. 🔒 Look for the **crisis/safety affordance** on the pre-auth landing (the app
   has a `CrisisSupportBar` / safety callouts and a `/crisis` screen). Confirm
   it's reachable **before** sign-in — someone in distress shouldn't have to
   create an account to find help. Tap it; confirm `/crisis` lists real support
   services and doesn't claim to be emergency care.
5. 🔒 If an onboarding wizard runs, complete it: is each step short, skippable
   where appropriate, and free of jargon? Do illustrations load crisply (WebP)
   without banding/artifacts?

### Stage C — Signup funnel (the make-or-break)

6. 🔒 Create a **real** account (email/password and/or Google). Note every point
   of friction: unclear field, password rule surprise (min length is 12 — is
   that explained _before_ the error?), confusing button.
7. 🔒 **Email confirmation**: with confirmations on, you must receive and click
   the email (this overlaps `launch-smtp-deliverability-checklist.md` — if that
   gate hasn't passed, signup _will_ dead-end here). Confirm the post-confirm
   landing is obvious ("you're in"), not a raw callback page.
8. 🔒 Offline pass: put the device in airplane mode and attempt a save somewhere
   early. Confirm the **offline banner** appears ("You're offline …") and a save
   fails **visibly** ("Couldn't save …") with your input preserved — not a
   spinner that never resolves. (Behavior from the offline plan.)

### Stage D — First real screen & empty states

9. 🔒 Land on Home for the first time with **no data**. Is it inviting? Does it
   suggest a first action, or look empty/broken? (Home aggregates CBT insights —
   with zero entries, insight cards must degrade gracefully, not error.)
10. 🔒 Visit each primary first-touch surface with no data and judge the empty
    state: **Mood**, **Journal**, **Gratitude**, **Habits**, **CBT tools**,
    **Meditation/Breathing**, **Looking back**. For each: is there a one-line "what
    this is" + a clear "add your first …" affordance?
11. 🔒 Create your **first entry** in one module (e.g. a mood log). Confirm it
    saves, appears immediately, and the empty state is replaced by real content
    that looks intentional.

### Stage E — Tone, safety, and polish sweep

12. 🔒 Open a distress-plausible flow (e.g. an anger log, a thought record, a
    journal entry). Confirm the calm crisis affordance (`CrisisSupportBar`) is
    present on those exercise forms and reads as gentle, not alarming.
13. 🔒 Skim copy across 6–8 screens for tone: any clinical/diagnostic phrasing?
    any em-dashes or `…` characters? any string that reads like a raw i18n key
    (e.g. `fallback.title` showing literally)? Note each.
14. 🔒 Settings: confirm the privacy story is visible and reassuring — **Export**
    and **Delete all data** are present (privacy is a selling point), and the
    "pending legal review" notice reads as intentional, not scary.
15. 🔒 Perceived-performance sweep: navigate between the main tabs several times.
    Note any jank, layout shift as images load, slow list rendering, or taps
    without immediate feedback.

### Stage F — Reset for the next run

16. 🔒 Sign out (confirm it returns cleanly to the landing and the offline/cache
    is purged) and/or uninstall, so the next matrix combo starts truly fresh.

---

## Part 3 — 🛠 Agent-verifiable pre-checks (do before human runs)

These reduce wasted human runs by catching obvious breakage from the repo:

- [ ] 🛠 No user-facing raw keys in the primary flows: run the test suite
      (`npm run verify`) — i18n key coverage tests should catch missing EN/BG
      strings for onboarding, errors, and empty states.
- [ ] 🛠 Crisis surfaces exist and route correctly:
      `src/components/app/crisis-support-bar.tsx` routes to `/crisis`;
      confirm a `/crisis` route/screen exists and the safety callout component is
      referenced on module home + exercise screens.
- [ ] 🛠 Copy-convention lint: grep the EN/BG locale JSON for em-dashes (`—`) and
      the ellipsis char (`…`) — there should be none (repo convention).
- [ ] 🛠 Offline banner + save-failure strings exist in
      `src/i18n/locales/{en,bg}/errors.json` (`offline.banner`,
      `saveFailed.*`).
- [ ] 🛠 Empty-state components render without data in unit tests (no throw on
      empty arrays / null bundle) — especially the Home insights aggregation.

---

## Part 4 — Scorecard (fill during the run)

For each row: **P** (pass) / **C** (concern, log it) / **B** (BLOCKER).

| #   | Surface / check                                          | EN  | BG  | Notes |
| --- | -------------------------------------------------------- | --- | --- | ----- |
| A1  | Store listing clarity + 18+/non-medical visible          |     |     |       |
| A2  | Cold-start feels fast (< ~3 s)                           |     |     |       |
| B3  | First screen tone is calm                                |     |     |       |
| B4  | Crisis affordance reachable **pre-auth**; /crisis honest |     |     |       |
| B5  | Onboarding short, jargon-free, images crisp              |     |     |       |
| C6  | Signup friction (password rule explained pre-error)      |     |     |       |
| C7  | Email confirm received + clear post-confirm landing      |     |     |       |
| C8  | Offline: banner + visible save failure + input kept      |     |     |       |
| D9  | Home empty state invites action (no error)               |     |     |       |
| D10 | Every module empty state purposeful                      |     |     |       |
| D11 | First entry saves + replaces empty state cleanly         |     |     |       |
| E12 | Crisis bar present + calm on exercise forms              |     |     |       |
| E13 | Copy tone: no clinical/em-dash/…/raw-key                 |     |     |       |
| E14 | Privacy (export/delete) visible + reassuring             |     |     |       |
| E15 | Perceived performance: no jank/layout shift              |     |     |       |
| F16 | Clean sign-out / cache purge                             |     |     |       |

**Blocker log (must be empty before invites):**

| Surface | What happened | Severity | Owner action |
| ------- | ------------- | -------- | ------------ |
|         |               |          |              |

---

## Part 5 — 🔒 Owner judgment calls (not agent-decidable)

These are product/tone decisions only the owner can make; record the ruling:

- [ ] 🔒 Is the overall first-run **tone** right for a mental-wellbeing audience
      (calm, non-clinical, non-patronizing)? Adjust copy where it isn't.
- [ ] 🔒 Are the **crisis-safety surfaces** placed correctly and worded honestly
      for every context where distress is plausible? (Safety judgment — err
      toward more visibility.)
- [ ] 🔒 Is any **empty state** discouraging rather than inviting? Reword/redesign.
- [ ] 🔒 Ship / hold decision: with the scorecard in hand, is the first
      impression good enough to invite testers, or does a concern warrant a fix
      first?

---

## Sign-off (owner)

- [ ] 🛠 Agent pre-checks (Part 3) all green
- [ ] 🔒 Script run on Android release build, EN + BG, fresh real account
- [ ] 🔒 One offline pass completed (banner + visible failure + input preserved)
- [ ] 🔒 Web pass completed
- [ ] 🔒 Blocker log empty; concerns triaged
- [ ] 🔒 Tone / crisis-safety / empty-state judgment calls recorded (Part 5)

Cross-reference: this plan assumes the Sentry gate
(`launch-sentry-smoke-runbook.md`) and email deliverability gate
(`launch-smtp-deliverability-checklist.md`) have passed — a broken confirmation
email will dead-end the funnel at Stage C7 regardless of everything else.
