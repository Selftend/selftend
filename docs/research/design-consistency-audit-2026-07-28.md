# Design-consistency audit — 2026-07-28

Resolves [#441](https://github.com/Selftend/selftend/issues/441) (child of map #440). Method: drove the
web app with Playwright against the local Supabase stack (registration → email verification via the
local mailbox → onboarding → every tool and module), on desktop (1280px), one dark-mode pass, and a
390px mobile pass. Vocabulary follows `CONTEXT.md` § Design language: **room**, **field**, **sheet**,
**accent ink**, **guest hue**. Screenshots live in `design-audit-screenshots/`.

Severity scale: **high** = breaks the design language or visibly confuses on a primary path;
**medium** = clear inconsistency a user can notice; **low** = polish.

## Screens visited

Header treatment: **field** (full-bleed hue pour with white ink), **bare-in-room** (room poured but a
plain dark title, no field), **bare** (no field, no room).

| Route                                                           | Header            | Room          | Notes                                            |
| --------------------------------------------------------------- | ----------------- | ------------- | ------------------------------------------------ |
| `/` (landing, signed out)                                       | bare (marketing)  | —             | own layout, fine                                 |
| `/sign-up`, `/verify-email`, `/auth-callback`                   | bare card         | —             | `03/04`                                          |
| `/` home dashboard                                              | bare              | none          | widgets carry per-tool hue tiles (`10`)          |
| `/tools`                                                        | bare              | none          | only 6 of 8 tools listed (`11`)                  |
| `/tools/mood-tracker`                                           | **field** (be)    | be            | reference screen (`12`)                          |
| `/tools/mood-tracker/new`                                       | **field**         | be            | violet Save in room (`13`)                       |
| `/tools/mood-tracker/[id]`                                      | bare-in-room      | be            | Edit/Delete inside summary card (`14`)           |
| `/tools/journal`                                                | **field** (ink)   | ink           | (`15`)                                           |
| `/tools/journal/new`                                            | **field**         | ink           | (`16`)                                           |
| `/tools/journal/[id]`                                           | bare-in-room      | ink           | Edit/Delete loose under title (`17`)             |
| `/tools/breathing`                                              | **field** (aqua)  | aqua          | (`18`)                                           |
| `/tools/breathing/session`                                      | **bare**          | **none**      | setup + active player both unroomed (`19/20`)    |
| `/tools/grounding`                                              | **field** (clay)  | clay          | (`22`)                                           |
| `/tools/grounding/[slug]`                                       | **bare**          | **none**      | intro + active flow all primary-violet (`23/24`) |
| `/tools/gratitude-log`                                          | **field** (think) | think         | (`25`)                                           |
| `/tools/gratitude-log/new`                                      | **field**         | think         | violet Save                                      |
| `/tools/sleep`                                                  | **field** (ink)   | ink           |                                                  |
| `/tools/sleep/new`                                              | **field**         | ink           |                                                  |
| `/tools/meditation`                                             | **field** (iris)  | iris          | credit line in dark ink on field (`29`)          |
| `/tools/meditation/stages`                                      | bare-in-room      | iris (subtle) | (`30`)                                           |
| `/tools/habits`                                                 | **field** (act)   | act           | violet New habit on green (`31`)                 |
| `/tools/habits/new`                                             | **field**         | act           |                                                  |
| `/routines`, `/routines/*`                                      | bare              | none          | app-level surface (`33`)                         |
| `/progress` (Insights)                                          | bare              | none          | mood-only, chart half-width (`34`)               |
| `/modules`                                                      | bare              | none          | (`35`)                                           |
| `/modules/cbt` + all subscreens visited (`/new`, `/activities`) | **bare**          | **none**      | the known gap (`36/37/38`)                       |
| `/modules/act` + subscreens (`/values`)                         | **bare**          | **none**      | green accents, violet CTA (`39`, `50` mobile)    |
| `/modules/dbt`                                                  | bare              | none          | coming-soon card, quiet                          |
| `/notifications`                                                | bare              | none          | (`42`)                                           |
| `/settings`                                                     | bare              | none          | (`43`)                                           |
| `/support`, `/crisis`                                           | bare              | none          | boundary copy clear, crisis link visible         |

Code cross-check: the `variant="field"` call sites and `useRoomStyle` consumers match the table —
field headers exist only in the eight tool features; no CBT/ACT/routines/insights screen mounts a
room.

## Findings

### 1. Header treatment / room coverage

- **HIGH — CBT and ACT module screens are outside the Color-field language entirely.** Both module
  homes and every subscreen (thought record, activities, values…) are bare: dark H1 on the neutral
  app background, no field, no room, no sheet. They sit in the same nav rail as eight fully-roomed
  tools, so switching Habits → ACT visibly drops out of the language (`36`, `39`, `47`). This is the
  map's destination; the audit confirms no other module-level surface is affected (DBT is a
  coming-soon stub).
- **HIGH — Breathing `/session` is a bare screen sandwiched inside the aqua room.** The setup state
  (pattern chips, cycle picker, Start) and the active player are both unroomed white; the pattern
  chips and Start are app-primary violet, and only the breath animation itself is aqua (`19`, `20`).
  Aqua field → white violet screen → aqua field on return.
- **HIGH — Grounding `/[slug]` (technique intro + guided flow) is the same gap in clay.** The intro
  card, icon tile, Start and the entire step-by-step flow render app-primary violet on white inside
  the clay flow (`23`, `24`). Nothing on these screens says "grounding" chromatically.
- **MEDIUM — Detail screens are bare-in-room while list/editor screens carry fields.** Mood, journal
  (and sleep/gratitude by the same component pattern) pour the room on detail screens but drop to a
  plain dark title (`14`, `17`). Defensible as hierarchy, but it is an undocumented third header
  treatment; worth deciding deliberately in the spec.
- **LOW — Meditation's secondary screens (stages, learn) are bare-in-room with a very subtle iris
  pour** that reads as white next to the strongly poured home (`30`).

### 2. CTA / button inconsistencies

- **HIGH — App-primary violet CTAs inside hue rooms are systemic, not ACT-specific.** Inventory:
  ACT "Start the program" (green screen, `39/50`), CBT "Start program"/"Continue"/"Got it" (`36/37`),
  habits "New habit" on the act-green field sheet (`31`, `46`), gratitude "New entry" on think
  (`25`), mood editor "Save" + emoji-picker selection ring in the be room (`13`), the post-save
  reminder card's "Set reminder" in every room, sleep/journal "Save" (violet happens to harmonize in
  ink rooms only by luck), breathing/grounding Start/Next (violet on the bare gap screens). The map's
  "primary CTAs inside rooms" policy decision has app-wide scope.
- **MEDIUM — Equivalent "create" actions use four different controls.** Filled violet button below
  the field (journal/gratitude/habits/routines "New …"), an accent-ink text link top-right of a
  section (breathing "New exercise", `18`), a filled pill in the page header row (CBT activities
  "New activity", `38`), and an inline emoji quick-log row (mood Today card). A user learns a
  different "add" affordance per tool.
- **LOW — Editor footers differ:** tool editors use a Cancel | Save bar; the CBT thought record uses
  red "Discard draft" text above a full-width Continue (`37`).

### 3. Visual drift

- **MEDIUM — Field stat rows mix two stat treatments inside one header.** Gratitude: "0 entries"
  and "0 favorites" inline-large but the third stat stacked-small ("0 / This week"); sleep and
  meditation and habits mix stacked and inline the same way; mood stacks all three (`25` vs `12`).
- **MEDIUM — The "Last ·" line is unstyled data in some fields.** Journal: sentence-case
  "Last · never"; breathing/mood: all-caps micro "LAST · 7/28/2026, 3:34:57 PM" — a raw locale
  timestamp with seconds, in a field header (`18` after logging, `49`).
- **MEDIUM — Credit lines are inconsistent and low-contrast.** "Inspired by Atomic Habits · James
  Clear" and the meditation equivalent are dark neutral ink placed on the hue field (near-invisible
  on the dark-mode act field, `46`); CBT/ACT print theirs as violet all-caps on the neutral surface
  (`36`, `50`).
- **MEDIUM — Empty states come in at least four styles.** Illustrated circle + copy + secondary CTA
  (journal, `15`); one plain muted sentence (breathing "No sessions yet.", gratitude recent, habits
  activity); bordered card with title+copy but no CTA (CBT activities, `38`); card with helper
  sentence (sleep charts). No shared empty-state component behavior.
- **LOW — Entry-detail action placement differs:** mood detail puts Edit/Delete inside the top
  summary card (`14`); journal detail floats them as loose buttons under the title (`17`).
- **LOW — Insights' mood-trend chart occupies only the left half of its card**, leaving a large
  blank region (`34`).
- **LOW — Naming drift:** sidebar "Check-in" vs Tools-card/reminder-copy "Mood tracker";
  sidebar "Habit tracking" vs header "Habits"; "Sign out" (settings) vs "Sign Out" (account menu).

### 4. Flow / UX friction

- **HIGH — The Tools index lists only 6 of 8 tools: Breathing and Meditation are missing** from the
  grid at `/tools` (`11`; confirmed in `src/features/tools/tools-screen.tsx` `TOOLS` — no breathing
  or meditation tile). They are reachable only via the sidebar/home widgets; on mobile the Tools
  screen is the natural hub, so two tools are effectively hidden there.
- **MEDIUM — First-run gauntlet is three sequential gates** (verify email interstitial → policy
  check modal → 5-step welcome dialog) before the first screen (`04`, `05`, `06`–`08`). Each is
  individually calm and skippable, but the policy modal appearing after "Continue to the app" feels
  like a second wall. Consider folding the policy consent into sign-up or the welcome dialog.
- **MEDIUM — Per-tool reminder prompt repeats after the first save in every tool** (mood, journal,
  breathing all in one session — three "No thanks" clicks). Optional and quiet-by-default (good
  guardrail compliance), but a single "reminders live in Notifications" nudge would be calmer.
- **LOW — Insights is a near-dead end**: mood trend + one reflection prompt only; other tools' stats
  live exclusively in their own headers, so "Insights" under-delivers on its nav promise (`34`).
- **LOW — Notifications page stacks ten cards each with its own full-width violet Save** (`42`) —
  correct behavior, heavy rhythm.
- **LOW — Console noise during auth callback**: a 401 on `rest/v1/profiles` fires before the session
  settles on `/auth-callback` (transient, self-heals).
- **Positive notes:** breadcrumb pattern (`TOOLS · CHECK-IN · NEW`) is consistent everywhere
  including bare screens; crisis boundary is visible and separate on landing, support, and the
  editors' "Not for emergencies" strip; dark mode holds up on every surface checked (`44`, `46`);
  the 390px pass showed no broken layouts (`48`–`50`); onboarding copy is non-diagnostic and the
  suggested routine is opt-in ("Keep"/"Skip").

## UX-improvement candidates, ranked

1. Pour rooms + fields over CBT and ACT (the map's destination) — the single biggest coherence win.
2. Decide the in-room primary-CTA policy (map decision #4) and apply it app-wide, not just to ACT —
   the violet-in-room pattern repeats on habits, gratitude, mood, and the reminder cards.
3. Room the two in-flow gap screens: breathing `/session` and grounding `/[slug]`.
4. Add Breathing and Meditation tiles to `/tools`.
5. Normalize the field stat row (one stat treatment, one "Last ·" format, no raw locale timestamps).
6. Pick one "create" affordance and one empty-state pattern; share the components.
7. Merge the policy-consent gate into an existing first-run step.
8. Give the credit line one certified treatment (it currently fails contrast on dark fields).
9. Unify entry-detail chrome (Edit/Delete placement) across mood/journal/sleep/gratitude.
10. Either grow Insights (pull per-tool stats in) or rename/demote it.

## Not covered

- **Native iOS/Android rendering** — web only; parallax/scroll behavior of the field header on
  native was out of scope.
- **Bulgarian locale** — the language switch exists in the account menu; no BG pass was made.
- **Deep CBT programme flow** (started programme states, weekly review, recovery, anger/worry/
  exposure sub-tools beyond their index pages) and **deep ACT flows** (bulls-eye, urge surfing,
  drop anchor players) — entered from a fresh account, most were empty index states; active-state
  visuals unverified.
- **Google OAuth sign-up path** — audited email registration only (the local stack has no OAuth
  client configured).
- **Data-rich states** (charts with weeks of data, long lists, habit heatmaps) — a one-session
  account can't populate them.
- **Prod-stack behaviors**: the audit ran on the local Supabase stack because the Gmail MCP tools
  were scope-limited (`search_threads` → insufficient authentication scopes) and prod-side
  verification paths were blocked in this environment. A throwaway account
  (`vasil.yoshev+design-audit-20260728@gmail.com`) was also registered against prod earlier in the
  session and remains **unverified** there; delete or ignore it. The registration/verification UX
  described above was re-validated end-to-end locally, including the real email template links.
