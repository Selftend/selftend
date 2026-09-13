# Analytics Strategy

## Current state

The MVP does not include any analytics SDK, tracking service, or telemetry. This is intentional:

- Product principle #7: "Avoid surveillance-style analytics."
- Privacy policy: "We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."
- Deployment docs, stack docs, and self-hosting docs all list analytics SDKs as not required for MVP.

The instruments that read the public website - Google Search Console, Bing Webmaster Tools and the Ahrefs Site Audit ([indexability.md](indexability.md) § 9) - read it from outside, as a crawler or a visitor would: none adds a script, a cookie or an outbound request to the page, and a sitemap submitted to them is a file the site already serves. They change nothing above.

The consent infrastructure is already built and waiting:

- `src/stores/cookie-consent-store.ts` has an `analytics` toggle (default `false`).
- `src/components/app/cookie-consent-banner.tsx` offers "Accept all" / "Essential only" / "Manage preferences."
- Cookie consent is currently stored only in browser `localStorage` (key `selftend_cookie_consent`) on web; the store does not persist consent server-side. The Supabase `user_preferences.cookie_consent` column exists (and is included in `export_user_data()`) but is **not** populated by the current consent flow - it is always written as `null` (see `cookieConsent: null` default in `src/features/modules/types.ts`). Treat the column as reserved for future server-side consent recording.

☠️ **This document covers in-product behaviour only. How people _arrive_ is [measurement.md](measurement.md)'s subject, and the two must not be conflated** — see the guard under _Trigger for advancing phases_. That document records what is counted (accounts, and page loads that are not counted at all), what is refused and why, and the conditions under which any of it is revisited. Decided across [map #2301](https://github.com/Selftend/selftend/issues/2301).

⚠️ **One correction to the promise quoted above, recorded rather than quietly fixed.** Cloudflare Web Analytics was enabled on the `selftend.org` zone from 2026-07-18 to 2026-09-10 — a wildcard auto-install rule that collected nothing at all, and is now disabled. It is an analytics tracking service, and it was configured on the property, so **the second bullet was literally false for those eight weeks** ([#2316](https://github.com/Selftend/selftend/issues/2316)). No user data was involved and no consent was affected, so the remedy is this record rather than a policy version bump. [measurement.md](measurement.md) § 9 holds the detail and what guards the promise now.

Contributors must not add ad-hoc tracking without explicit review through the roadmap and PR template.

## Phased plan

### Phase 1: Supabase aggregate queries (no new dependency)

#### Phase 1 in use (2026-07)

Three aggregate-only reports run through the shared runner `scripts/analytics-report.js`.
Pass `--local` to run against the local Docker stack; for the linked production
project, set `SUPABASE_DB_URL` (from the dashboard) in the environment first.

`test/integration/analytics-reports.integration.test.ts` executes all three
against the local schema on every CI run, so a renamed column fails there rather
than three months later when someone runs a report by hand.

##### Everything is split by account type

Every table in every report carries an `account` column: `registered` or
`guest`. Guest accounts are `auth.users` rows with `is_anonymous = true`, minted
one per tap of the landing CTA by `useStartAsGuest`, and only purged after 12
months of dormancy. Without the split, the day anonymous sign-ins are switched
on, "signups" quietly becomes "visitors who tapped a button" and every
percentage in these reports collapses toward zero with nothing on screen to say
why. The split landed while the toggle was still off, on purpose; the
production toggle went live 2026-09-02 (#1674).

Two things to know when reading it:

- **Fixed-shape tables print both populations always**, zeros included — the two
  account types, the four modules, the ten concern arms. Open-shape tables
  (weeks, widget ids, feature names) print only what exists. Section 0 of each
  report carries the axis unconditionally.
- **The split reads current account state, not state at signup.** Signing up
  from a guest session converts the same `auth.users` row in place, so a
  converted guest reads as `registered` across their whole history. The `guest`
  rows are unconverted guests only.
- **Conversion itself is measured, in the onboarding report.** It is not
  invisible, and it never was — `auth.identities` has held the answer since the
  first account. `CONTEXT.md` defines conversion as _attaching the first sign-in
  identity_ and _registered_ as _holding at least one_, so the earliest
  `auth.identities.created_at` against `auth.users.created_at` is that
  definition executed rather than a proxy for it. Under a second apart means the
  identity was minted in the same transaction as the account; longer means a
  separate act, which is a conversion. ☠️ **It reads the whole population
  retroactively**, so there is no start date and no unmeasured backlog:
  conversions before anonymous sign-in went live are structurally zero, not
  missing. `account_origin` is **not** the key and is not needed here — which
  door someone arrived through is an arrivals question, and belongs to
  [measurement.md](measurement.md).
- ☠️ **The guest-versus-registered comparison is biased by construction, and
  two distortions compound on that arm.** See _Who is in the population_ below;
  the caveat is not optional reading.

##### Who is in the population

The shared `accounts` view is `select … from auth.users` with no `WHERE`, so
every figure in every report includes the project's own accounts — the owner's,
the demo account, and accounts minted while testing. **They are not excluded,
deliberately.** At this scale, excluding them would cost more in machinery, and
in arguments about who counts, than the distortion costs in reading.

What is _not_ accepted is leaving the size of it unknown. Each report prints,
before its first table, how much of its population it can identify as the
project's own: an **exact** count of accounts on the owner's address, and a
**wider heuristic** count — plus-tagged, or carrying a demo or test string —
labelled as an upper bound, because a real person may plus-tag too. It prints a
bound, never a point estimate; a single confident number here would be the
false precision k=5 exists to prevent.

The convention that makes this measurable is not incidental. The
**email-deliverability rule in [AGENTS.md](../AGENTS.md)** already requires a
test account to use a deliverable, plus-tagged mailbox, and already requires
deleting throwaway test accounts when done. **A large internal count is
therefore partly a record of cleanup that did not happen** — something to act
on, not merely to regret. That is also what keeps this from becoming a standing
excuse: a number you can drive down by doing something is not a free dismissal
of every figure it sits beside.

☠️ **The guest arm cannot be measured this way, and two distortions compound
there.** A guest account has no email at all, so an account minted by a user
test is indistinguishable from a stranger who tapped the button. That is
structural — no convention can fix it — and it lands on the arm that is
_already_ biased by construction: the guest arm holds unconverted guests only,
and every guest who engages enough to convert leaves it for the registered arm,
taking their whole history along. **The guest arm is a residue; the registered
arm is what absorbs its successes; and the residue additionally carries an
unmeasured number of test accounts.** Read a guest-versus-registered gap as a
real difference _plus_ a sorting rule _plus_ an unmeasured contamination — never
as a fact about guests.

This is a reading caveat, not a standing dismissal: it states how large the
known part is and admits which part is unknown. The acceptance above was made at
the scale recorded here, and that premise expires with the scale — it is
revisited on **2027-08-31**, the decision date the segment question already
sits on. No third clock; the monthly digest carries the number in the meantime.

##### Small cells print as `<5`

**Any cell that slices the population and rests on fewer than five users prints
`<5`, and a percentage resting on one prints `-`.** This governs all three
reports, not just the segment one where it was first implemented. It is a
**false-precision control first** and a privacy control second: a printed "67%"
that means two users out of three is the number that gets believed.

It applies to slices only, **never to whole-population counts** — without that
carve-out a blanket rule would print `<5` over the very trend the digest exists
to show.

Two blocks are exempt, and the reasons are recorded so neither exemption is
mistaken for an oversight:

- **The population block above.** It counts _the project's own_ accounts, so the
  privacy rationale does not apply, and a bound is already the anti-false-precision
  form, so that rationale is inverted. ☠️ Without the exemption the number would
  vanish behind `<5` **precisely as cleanup succeeded and it finally became good
  news**, leaving a reader unable to tell "almost none" from "withheld".
- **First occurrences** (see _The monthly digest_). It prints facts, never counts
  or dates, so there is no cell to suppress.

`npm run analytics:engagement` runs `scripts/analytics-engagement.sql` (added
2026-07-14). It covers: activation (first row in any user-content table, ever
and within 72h of signup; setup actions excluded), retention (signup-anchored
weekly cohorts, W1-W4, retained = any content row in the window, percentages
over mature users only), module usage (per module — cbt, meditation,
gratitude, act, dbt — % with >=1 record in the module's tables), and core tool usage
(mood, journal, sleep, habits, mindfulness, per feature). It also covers the
**programme funnel** and **reminder adoption**, both described below. All
queries count distinct users; none emit per-user rows.

☠️ **Activation is a content record. Authored configuration is not activation.**
The definition named three excluded setup actions — enabling modules, widget
picks, onboarding flags — and gave no rule, so every surface added since was
decided by silence. The rule now: **a routine, a habit, or a saved breathing
pattern is a promise to act, not an act.** Running one writes a content row
anyway, so nothing is lost — the signal is only located correctly. This is
[#1672](https://github.com/Selftend/selftend/issues/1672)'s _setup is not
adoption_ applied to a newer class, and the alternative was rejected for a
specific reason: favourites, custom emotions and widget picks press on that same
boundary with the identical argument, and admitting authored configuration
admits them next.

⚠️ **The list of content tables is gated, not remembered.**
`test/analytics-shared-sql.test.ts` guards that the two copies of the
`content_events` block stay byte-identical to each other; **it has never
compared the list against the schema**, so a new user-content table joined the
reports only if whoever added it remembered. A completeness gate now enumerates
the tables carrying a `user_id` from the live schema and fails on any absent
from `content_events` without a named exemption that states its reason. It lives
in the integration suite because that check needs a database —
`test/export-user-data-monotonic.test.ts` says in as many words that it cannot
do this from migration files alone.

The **programme funnel** covers CBT, ACT and DBT: started, phase reached,
completed, graduation dismissed. Every column already exists and is written for
the whole population; none of it was reported anywhere until now, which is an
odd gap for the part of the product `AGENTS.md` names as core MVP alongside the
everyday tools. It collects nothing new.

**Reminder adoption** reads `reminder_consent`, and this is the section most at
risk of being "improved" into uselessness. ☠️ **It must not read
`notifications_enabled_global`**, which defaults to true and is true for nearly
everyone: reporting it would measure a default rather than a decision — the
`enabled_modules` mistake (#1672) repeated exactly. Consent is the column that
varies, and it is the figure that evidences the quiet-by-default guardrail
actually holding.

The module table carried an "enabled" and an "enabled-but-never-used" column
until 2026-09-02, read from `user_preferences.enabled_modules`. That array
gates nothing: every module's tools are on the tools grid whether or not it
lists them, the last write hook went in the May 2026 dead-code sweep, and what
is left is the column default (`['cbt']`) plus one write from the meditation
wizard. Read against production it said cbt was "enabled" by 45 of 46 people
(the default) while gratitude was used by people who had never "enabled" it —
an instrument measuring a mechanism that does not exist (#1672). Usage is the
only adoption signal the schema carries, so it is the only one reported;
`test/analytics-shared-sql.test.ts` fails any report that reads the column.

Section 6, **asked, never attested**, counts accounts that met the age gate and
did not get past it — `age_floor_met` null, on an account created at or after
the instant the gate scopes itself on — split guest from registered, as a count
and as a share of accounts created in the same window. It collects nothing new:
the column already exists and this is a derived count over it. It is the evidence
[#1936](https://github.com/Selftend/selftend/issues/1936) settled the age gate's
placement on: the gate is the first screen of a clean install on native, and
**the placement is revisited if this share is large against guests minted in the
same window; the owner sets the number once a real cohort exists.** The reasoning
behind the placement lives in [age-floor.md](age-floor.md) § _The gate that
asks_, not here.

☠️ **Read the cutoff before reading the number.** `age_floor_met` is null for
every account that predates the gate, and null means _never asked_, never
_refused_ — so without the created-after cutoff this figure is the entire
pre-gate install base rather than a count of people who stopped. The cutoff is
the gate's own: `AGE_GATE_INTRODUCED_AT` in
`src/components/app/protected-layout.tsx`, `2026-09-05T00:00:00Z`, the instant
of `supabase/migrations/20260905000000_age_attestation.sql` — deliberately the
migration and not the release, because the gate asks by account age against that
constant and a client cannot know a release date (see
[age-floor.md](age-floor.md) § _The gate that asks_). It is set by the two
`\set` lines at the top of the report and printed on every row as
`cutoff_source` and `cutoff_at`; `test/analytics-age-gate-cutoff.test.ts` fails
if the report's instant and the client's constant ever differ, so they move
together. Under-floor exits are not in this number — they delete the account, so
they never appear as a null. Platform is not an axis and is not to be added: the
row cannot say which platform it came from, and #1936 accepted that the figure
answers "how many stop at the first screen" and nothing else.

⚠️ **The report follows the gate's rule since
[#2241](https://github.com/Selftend/selftend/issues/2241), and was narrower than
it before.** After [#2227](https://github.com/Selftend/selftend/issues/2227) the
gate exempts only an account that is _both_ older than the instant _and_ has
already accepted a policy version; everyone created at or after the instant is
asked whatever their consent column says. The report used to require
`policy_version_accepted` to be null as well — true of an account whose first
launch carries the gate, and false for the cohort #2227 exists for, an account
created on 0.17.0 that consented before ever seeing the gate — and used the
release as its cutoff, so accounts created between the migration and the release
were asked and not counted. Both are gone: the window is keyed on the instant and
the consent column is not a condition. What the figure still leaves out, on
purpose, is an account created _before_ the instant that never accepted any
policy — the gate asks it too, but it is the pre-gate install base whose null
means _never asked_, and the row cannot tell one that stopped at 0.17.0's consent
wall from one that met the age gate on updating. So the number answers "how many
stop at the first screen of a new account", exactly as #1936 framed it.

`npm run analytics:onboarding` runs `scripts/analytics-onboarding.sql`.
The report covers: signups, first-run introduction **completion**, finish-vs-skip
(`user_preferences.app_onboarding_completed_via` / `_at`, written when the
one-panel introduction is finished or skipped), **guest-to-registered
conversion**, and **favourites**. The home-tour engagement section went with the
tour (#2109): `shown_button_tours` is still a column and still exported, but
nothing writes it, so reporting it would present a frozen residue as current.

⚠️ **"Completion", not "conversion", for finishing the introduction.**
`CONTEXT.md` reserves _conversion_ for guest → registered, and this report used
the word for both — two different funnel steps under one name, in the one report
that now measures both.

**Guest-to-registered conversion** is a rate over a 7-day maturity window, keyed
on the identity clock described above. It reports three arms plus a
**contradiction arm** — registered with no identity at all — which turns the
hazard of two competing definitions of _guest_ into the instrument's own
consistency check: that arm should always be empty, and an entry in it means the
two definitions have drifted apart. ⚠️ If `enable_confirmations` is ever turned
on, the timing threshold needs re-checking, because the identity may then be
written at confirmation rather than at signup.

**The Home widget-picks section is retired.** `widget_preferences` fails the
same test `enabled_modules` failed: the current app neither reads nor seeds that
table, so it measures a mechanism the product no longer has. ☠️ It is **not**
frozen residue, which would be safer — pre-Favourites native builds still write
it, so keeping the section would print live data about a removed feature as
though it were current behaviour. **Favourites takes the slot**, being the live
successor and previously reported nowhere.
The two funnel columns are
ordinary first-party preferences, included in `export_user_data()` and account
deletion. The concern-distribution sections (§4a/4b) were removed with the
`selected_concerns` column on 2026-09-05 (#1958): the introduction no longer asks
a concern, so nothing writes the column and it is gone; anything cohorted by
concern reads the immutable `initial_concerns` in the segment report below, which
covers the pre-redesign cohort only and is never written again by the app.

`npm run analytics:segment` runs `scripts/analytics-segment.sql` (added
2026-09-01). It cross-tabs W4 retention against **locale and module usage**. It
collects nothing new: every column it reads already exists.

☠️ **It was re-based off the concern axis because that axis was measured to have
never held a value for a single account, ever.** The migration that added
`initial_concerns` and the commit that removed the code writing it are **both
contained in tag v0.18.0** — the column reached users in the very build that
stopped asking. The arms were dead on arrival, not closed later, and all nine
non-`unknown` arms died together: `skipped` and `finished-with-none` need the
column to be non-null-but-empty, and with it null everywhere the `unknown`
branch shadows them.

⚠️ **The failure this hid was worse than an unreadable report.** Section 1's
gate counted W4-retained users across the **whole population** rather than
across axis-bearing users, so the gate could open on `unknown` users and declare
section 2 readable **over an empty table** — a false green. An unreachable gate
is at least honestly silent. The fix is an **axis-coverage precondition**:
section 2 is unreadable unless the axis it cohorts by actually carries values.
The gate number itself is untouched, deliberately — the file reuses #1598's
warrant-to-continue number, and forking it would give that number a second
meaning.

**Locale** answers the objection [positioning.md](positioning.md) raises against
it rather than waving it past: that document warns _an attribute is not a
segment; neither is a language_. The warning is against **declaring** a segment
from an attribute. Cohorting retention by one and reading what comes back is the
legitimate empirical route, and the same document names Bulgarian the strongest
segment candidate. **Module usage** needs no such argument: it is behavioural,
and it comes from the `content_events` view this report already builds.

☠️ **Platform was one of three pre-named fallback axes, and it is struck.** The
reason matters, because the obvious one is wrong: a platform column **does
exist** — `device_push_tokens.platform`, with `web_push_subscriptions` marking
the web side — so this is not a case of missing data. It is struck because **a
push row exists only for an account that opted into notifications**, a small and
self-selected slice, so cohorting by it would not compare platform to platform;
it would compare notification-adopters to everyone else. The concern column is
kept, with its schema comment corrected: that comment claims the column is
written by `apply_widget_recommendations`, which production disproves. Dropping
it would change nothing observable and would cost an export-gate entry.

How to read it, in the order the report prints:

- **Read orderings, never percentages, until the gate opens.** Section 2 is
  ordered by retention rate for exactly that reason.
- **The gate is 30 W4-retained users**, reusing the warrant-to-continue number
  rather than inventing a second constant. Section 1 prints how far off it is.
  That puts the segment question on the **2027-08-31** clock, not the
  **2027-02-28** frame-review clock: the February read is informational only,
  and the segment slot in [positioning.md](positioning.md) cannot be filled
  there. ⚠️ **This document's own February obligation is discharged**, because
  the digest serves the purpose that date existed for — it was informational, and
  the information now arrives monthly. That discharges nothing belonging to
  another document: [positioning.md](positioning.md)'s frame review on the same
  date is untouched. **2027-08-31 stands**, because delivery replaces a duty to
  _read_, never a duty to _decide_.
- **Section 2 is unreadable unless its axis carries values.** The precondition
  above is checked before the ordering is printed, not after.
- **Cells below k=5 print `<5`.** See _Small cells print as `<5`_ above, which
  now governs all three reports rather than this one.
- ☠️ **A flat reading is a finding, and it now terminates rather than
  redirecting.** If retention is alike across locale and across module usage,
  **that is the finding** — the data Selftend collects reveals no segment — and
  it is reported as such on **2027-08-31**. **No fourth axis is named.** The old
  rule pointed at three fallbacks; platform is struck, and the other two are
  adopted here, so a rule that redirected would now point at nothing and become
  the bottomless "try another axis" it was written to prevent.
- ⚠️ **The pre-authorised axis move was extended, not invoked.** This document
  permitted changing axis **for a flat reading** — data showing no difference. A
  dead axis is no data at all, which is a different thing, and a later reader
  should not cite the old sentence as having already permitted what was done
  here.

The **2027-08-31** decision date stands. ☠️ **"Quarterly by hand, only the owner
can run it, there is no CI job and no schedule" is struck, not replaced** — see
_The monthly digest_ below. That sentence carried two rules at once, and only
one of them survives: its mechanism half rested on a premise that is simply
false, because the reports run read-only against production from an agent
session and `SUPABASE_DB_URL` with `psql` was always the documented path rather
than the only one.

Its reason half survives and is **promoted out of this subsection to govern the
whole document**:

> **The report is the instrument, not the judgement.**

The segment decision stays something a person makes while looking at it, and so
does every other decision these reports inform. Scoping that sentence to the
segment report would have left a document-wide principle hostage to whatever
happened to the segment report.

#### The monthly digest

**The reports arrive; they are not fetched.** A scheduled workflow in this
repository runs all three on the **1st of each month**, covering the complete
previous calendar month, and posts the output as **one comment on a single
standing, closed issue in the private `vasilyoshev/control-tower` repository**.

☠️ **Delivery is not a clock, and this creates no obligation.** Nobody is on
duty to read it. The 2026-09-02 gap opened because reading required _doing_ —
finding a credential, running a script — and unbidden arrival flips the default
so that **ignoring becomes the action**. The instrument-not-judgement rule above
is what bounds the contents: the digest may print any quantity the reports
already compute, orderings and trends included, and the distance to a threshold
this document has **already committed to in writing**. It may not introduce a
threshold, comparison, verdict or recommendation this document has not already
made.

- **The 1st, deliberately not the 9th.** The 9th is
  [operations-runbook.md](operations-runbook.md)'s recurring-checks duty day, and
  a no-duty delivery landing on a duty day gets read as a duty later.
- **It always arrives, even empty**, so its absence can never be mistaken for a
  quiet month.
- **Every report runs independently and the comment posts regardless**, printing
  an explicit failure line for any report that threw. A run that aborted would
  leave a gap indistinguishable from a month nobody ran.
- ⚠️ **The thread's self-witnessing is asymmetric, and saying so is the point.**
  It records a report failure, but a failure to _post_ cannot post — only the
  red workflow run catches that.
- **This is owner-facing operational tooling**, not a user-facing surface, so the
  streak, reminder and notification guardrails do not bind it. Said out loud
  because a scheduled recurring message reads like a breach to a skimmer. The
  no-loss-framing and aggregate-only rules bind it anyway, by other routes.

##### What the digest contains

A fixed **masthead**, then the full output of all three reports in a fixed
order: **masthead → engagement → onboarding → segment**.

Summarising was rejected. A digest that selects sections has to **choose what
matters**, which is the judgement this document forbids, and the section nobody
chose is the one that goes unread. Every table is bounded — twelve weeks, five
modules, a handful of features — so the full output fits a GitHub comment and
stays that way as the population grows.

The masthead states, never ranks: **the period** with explicit bounds, **the
releases that fell inside it** as names and dates, and **the instrument status**.
Annotating each release with whether it "touched a measured surface" was
rejected — mechanically it is a fragile diff heuristic, by hand it is a standing
judgement.

☠️ **First occurrences: facts that happened for the first time ever during the
covered month.** This is the part of the digest that answers the failure this
whole arrangement exists because of, and it is the part most likely to be
deleted as decoration by someone who has not read this paragraph.

The 2026-09-02 failure is usually described as _nobody read the report_. **That
is not what happened, and designing against it produces the wrong digest.**
Activation collapsing is precisely what a digest of numbers _would_ have shown,
and the reader would have concluded "activation is down" — which is wrong. What
went missing is that **a metric's meaning changed**: anonymous sign-in went live,
"signups" quietly became "visitors who tapped a button", and this document had
predicted exactly that in writing. So printing quantities more often cannot fix
it. Something has to make a **regime change** visible.

First occurrences do, and cheaply: computed from `min(created_at)` per fact, with
no stored state and nothing to maintain between runs. The first-ever guest
account falls inside September 2026, so the section would have fired in the very
next digest, beside a release list naming the release responsible.

- **It is not the rejected "flag notable movement".** _Notable_ is a judgement
  wearing a number's clothes, and it needs a threshold. **Zero to non-zero is the
  boundary of existence, not a chosen number** — no magnitude, no comparison.
- **Each fact fires at most once, ever**, so the section shrinks monotonically.
  It is structurally incapable of becoming alert fatigue.
- **It prints facts — never dates, never counts.** A first occurrence is n=1 by
  definition, and the date is the part that would individuate. The digest already
  covers a month, so "first occurred this period" is the whole statement, and a
  later reader should not restore the timestamp as a helpful detail.
- **The watch list is the fixed-shape rows the reports already print**: each
  account type, each module, each core tool, each programme milestone, reminder
  consent, age-gate attestation, first conversion. ⚠️ A programme funnel reading
  all zeros is therefore **the watch list working**, not an embarrassment — the
  month someone first completes a programme, it fires.

**Silence is never allowed to mean anything.** Fixed-shape tables already print
their zeros; **open-shape tables print an explicit "no rows" marker**; a thrown
report prints its failure line. A section that prints literally nothing is then
proof of a bug rather than a reading. This is what keeps the three states —
_data_, _correctly empty_, _broken_ — distinguishable, and the first two of them
used to look alike.

⚠️ **Order is load-bearing, not cosmetic.** The release list and the first
occurrences have to be read together — one says what changed, the other says
something began — so the first-occurrences section is printed by
`analytics-engagement.sql` (which the integration suite executes on every CI run)
rather than assembled by the workflow, and engagement is printed first.

⚠️ **The population block is printed by each report, three times, deliberately.**
Hoisting it into the masthead would print it once and move it into the workflow,
which is the strippable territory it was put into the SQL to escape. Each report
runs independently, so a surviving report must carry its own population
statement when another one throws.

**When a number moves sharply: nothing happens.** That is a decision, not an
omission. Alerting is where a threshold, and with it loss framing, would
re-enter.

##### What may leave the database

**Aggregate rows only — never a user id, an email, or a per-user timeline.**
This binds **every** route out of production, not only the digest. ☠️ The ad-hoc
route — an agent session querying through the Supabase MCP — already exists and
is the looser of the two; a rule written for the scheduled job alone would leave
the wider hole uncontrolled while implying that automation is where the risk
lives.

The digest runs as a **dedicated read-only Postgres role**, not the credential
the nightly backup uses. The asymmetry that decides it: the backup runs a fixed
`pg_dump`, while the digest feeds **repository-authored SQL to production on a
schedule** — the first scheduled job whose executed text a merged pull request
can change.

When basic product questions arise ("how many users signed up this week?", "how many exercises were completed?"), use server-side SQL against existing tables:

- Auth tables already have timestamped sign-up records.
- CBT thought records and future exercise tables have timestamps.
- Supabase dashboard or a contributor-only SQL script can query these.

This requires no new data collection, no consent change, and no SDK.

Example queries to create when needed:

```sql
-- Weekly sign-ups
SELECT date_trunc('week', created_at) AS week, count(*)
FROM auth.users GROUP BY 1 ORDER BY 1 DESC LIMIT 12;

-- Weekly completed exercises
SELECT date_trunc('week', created_at) AS week, count(*)
FROM public.thought_records GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
```

Keep these in a contributor-only context (Supabase dashboard, a local script, or a protected admin route). Do not ship aggregate query infrastructure in the user-facing app bundle.

### Phase 2: Error and crash monitoring

> **Status (2026-07-04): implemented with Sentry SaaS (sentry.io).** The
> closed-testing launch was the trigger. SaaS was chosen over the
> self-hosted options below for operational simplicity at this stage; the
> SDK is Sentry-protocol-compatible, so self-hosted GlitchTip remains the
> documented fallback if hosting posture changes. Classification: essential
> (Art. 6(1)(f)), per "Consent classification" below. Monitoring is fully
> disabled when `EXPO_PUBLIC_SENTRY_DSN` is unset.

Adds minimal observability alongside the incident response process documented in [operations-runbook.md](operations-runbook.md).

#### Tool options (self-hostable required)

| Tool      | License                | Self-hosted | Expo/RN support       | Notes                      |
| --------- | ---------------------- | ----------- | --------------------- | -------------------------- |
| Sentry    | BSL (source-available) | Yes         | Yes (official SDK)    | Industry standard, heavy   |
| GlitchTip | MIT                    | Yes         | Sentry-compatible SDK | Lighter, fully open-source |

#### Consent classification

Error monitoring captures stack traces and device metadata, not user behavior. Recommended classification: **essential** (GDPR Article 6(1)(f) legitimate interest).

If the team prefers maximum caution, gate it behind the existing `analytics` consent toggle instead.

#### Implementation notes

When this phase begins: choose Sentry self-hosted or GlitchTip; add the SDK dependency (`@sentry/react-native` or compatible); initialize in `src/providers/app-providers.tsx` gated on the chosen consent classification; update privacy text in `src/features/policies/policy-content.ts`; add the vendor to the `docs/policies.md` data processor list; add self-hosted setup instructions to `docs/self-hosting.md`; update `docs/costs.md` with the hosting cost estimate; and note the approved exception in `docs/android-closed-testing.md`.

### Phase 3: Opt-in product analytics (only if Phase 1 is insufficient)

Only proceed if Supabase aggregate queries cannot answer a concrete product question that requires client-side event data.

> **Status (2026-07-14): considered and deferred.** Reviewed ahead of closed
> testing; no concrete product question required client-side events. The
> candidate questions (silent churn location, in-wizard abandonment, feature
> discovery) are better answered during closed testing by talking to testers
> directly — opt-in event data from a cohort of tens of users would be too
> sparse to beat that. Phase 1 was extended with the engagement report instead.
>
> **Restated on stronger evidence, and still deferred. No trigger is named.**
> ☠️ "In-flow abandonment" was **two different questions under one name**.
> Abandonment at the level of a **programme phase** is answerable today and needs
> no events at all — `*_program_started_at`, `*_program_phase_index`,
> `*_program_completed_at` and their siblings are written for the whole
> population — and it is now a reported section. Only abandonment **inside a
> single wizard form** needs client-side events.
>
> That leaves in-wizard abandonment and seen-but-unused discovery as the genuine
> candidates, and **neither is named as a trigger**: the strongest of them
> dissolved into a Phase 1 question. Before anyone reaches for an event library
> to learn where people stall, **read the programme funnel** — it already shows
> how far people get. A named trigger is a loaded gun for the next reader, and
> nothing here warrants leaving one out.

#### Tool options (self-hostable, privacy-respecting)

| Tool      | License    | Self-hosted | Cookieless | Platform     | Notes                                                           |
| --------- | ---------- | ----------- | ---------- | ------------ | --------------------------------------------------------------- |
| Plausible | AGPL       | Yes         | Yes (web)  | Web only     | Very lightweight (~20 MB RAM), no consent banner needed for web |
| Umami     | MIT        | Yes         | Yes (web)  | Web only     | Similar to Plausible, MIT license                               |
| PostHog   | MIT (core) | Yes         | No         | Web + native | Feature flags, funnels, heavier (needs ClickHouse)              |

Recommendations:

- **Web-only initially**: Plausible or Umami for cookieless page-view analytics. No consent required for cookieless web analytics under GDPR.
- **Native event tracking later**: PostHog self-hosted if native app events are needed, or a lightweight custom Supabase event table.

#### Event allowlist pattern

All tracked events must be defined in an allowlist. No open-ended `track(anything)` calls.

Events should be:

- Aggregate-friendly (counts, not individual user timelines)
- Not personally identifiable
- Approved in the allowlist before implementation

Example allowlist:

```typescript
type AllowedEvent =
  "exercise_completed" | "tool_opened" | "check_in_submitted" | "onboarding_completed";
```

#### Implementation notes

When this phase begins: document the concrete product question that requires client-side analytics; choose the tool based on web-only vs. native needs; create `src/providers/analytics-provider.tsx` that reads consent state from `useCookieConsentStore`, initializes or tears down the SDK based on consent changes, exposes `trackEvent(name: AllowedEvent, properties?: Record<string, string>)`, and no-ops silently when consent is not granted; gate initialization behind `analytics === true` from the consent store; define the event allowlist in this file or a dedicated constants file; update the privacy policy, cookie policy, and processor list; add self-hosted setup instructions to `docs/self-hosting.md`; and update `docs/costs.md` with the hosting cost estimate.

## Excluded approaches

These are deliberately excluded and should not be proposed without exceptional justification:

- **Google Analytics, Mixpanel, Amplitude, Segment**: proprietary, not self-hostable, heavy behavioral profiling
- **Session replay or heatmaps**: surveillance-style, conflicts with product principles
- **Default-on tracking**: always opt-in or legitimately essential
- **User-level behavioral profiling**: especially given sensitive mental-health content and possible future under-18 support
- **Ad-network pixels or attribution SDKs**: no ads, no ad-funded model

## Trigger for advancing phases

Do not add analytics preemptively. Advance to the next phase only when:

- **Phase 2**: Done (2026-07-04) - implemented ahead of closed testing; see status note above.
- **Phase 3**: A concrete, documented product question cannot be answered by Supabase aggregate queries alone.

☠️☠️ **An acquisition question is never grounds for advancing to Phase 3.** "Where did our users come from", "which channel is working", "how many visitors did the site get" and anything else about **how people arrive** are answered — or deliberately refused — in [measurement.md](measurement.md), never here. They are not the concrete product question Phase 3 waits for, and they must not be used to justify a client-side SDK.

This guard exists because the failure is predictable and was nearly made: an acquisition question reads exactly like a question Phase 1 cannot answer, so the next reader reaches for an event library in good faith. ⚠️ **Phase 3 is about in-product behaviour** — where someone stalls inside a flow, which surface goes unused. The relevant refusals live in [measurement.md](measurement.md) § 3, and two of them are guardrails this document cannot repeal: **no source, channel or referrer field on an account record**, and **no analytics script or beacon on the website**. Decided across [map #2301](https://github.com/Selftend/selftend/issues/2301).

## The build, in dependency order

Ready for `/to-tickets`. Decided across [map #2362](https://github.com/Selftend/selftend/issues/2362).
Items 1–2 are one coherent change and must land together; 3–5 are report changes
independent of each other; 6–8 are the delivery mechanism.

1. **The k=5 rule in SQL** — bring `analytics-engagement.sql` and
   `analytics-onboarding.sql` under it (it is currently implemented in the segment
   file alone), keeping the whole-population carve-out.
2. **The two exemptions, in the same change as item 1** — the population block and
   the first-occurrences section, each carrying its recorded reason. ☠️ Landing
   item 1 first would suppress the population block on the first run.
3. **Content-table completeness** — add `goals`, `milestones` and
   `act_bulls_eye_snapshots` to the shared `content_events` block (both copies,
   byte-identical), and add the completeness gate to
   `test/integration/analytics-reports.integration.test.ts`, following the
   `INTENTIONALLY_DROPPED` pattern where an exemption that stops being necessary
   fails the test.
4. **Engagement report** — the population block; the first-occurrences section
   (printed before section 0); the programme funnel; reminder adoption.
5. **Onboarding report** — the population block; the guest-to-registered
   conversion section with its contradiction arm; retire the widget-picks section
   and add favourites; rename the introduction step to _completion_.
   **Segment report** — the population block; re-base onto locale and module
   usage; the axis-coverage precondition; correct the `initial_concerns` schema
   comment.
6. **Open-shape "no rows" markers** across all three reports.
7. **Delivery** — a read-only Postgres role; a fine-grained PAT scoped to
   `vasilyoshev/control-tower` with issues-write and **no expiry** (an expiring
   token stops delivery silently, re-creating the failure "it always arrives" was
   built to prevent); the standing closed issue; a scheduled workflow in this
   repository at `17 6 1 * *` that assembles the masthead and posts one comment.
8. **Control-tower** — the architecture rule is discharged by **item 7**, not
   before it. Filing at specification time would inventory infrastructure that
   does not exist; the ticket that builds item 7 files the issue, covering the
   read-only role, the PAT, the scheduled workflow and the egress path into a
   second repository.

⚠️ **Not a build item: excluding owner, demo or test accounts.** That was refused;
what ships is the measurement above, never a filter.

## Related files

- `src/stores/cookie-consent-store.ts` - consent state with `analytics` toggle
- `src/components/app/cookie-consent-banner.tsx` - consent UI
- `src/providers/app-providers.tsx` - provider tree for future analytics provider
- `src/features/policies/policy-content.ts` - privacy and cookie policy text
- `docs/policies.md` - data processor list
- `docs/self-hosting.md` - self-hosting setup
- `docs/costs.md` - cost estimates
- `docs/product-principles.md` - principle #7 (privacy and dignity)
