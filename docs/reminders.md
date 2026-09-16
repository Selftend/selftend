# Reminders spec - one general reminder suggested, every other reminder manual-only

**Status:** Decided spec, assembled 2026-09-15 from wayfinder map [#2409](https://github.com/Selftend/selftend/issues/2409) on its last ticket, [#2418](https://github.com/Selftend/selftend/issues/2418). **Mostly built, 2026-09-16.** § 11's items 1-7 and 10 are on `dev`: the routine sheet's completion-state offer removed ([#2488](https://github.com/Selftend/selftend/issues/2488)), the columns ([#2489](https://github.com/Selftend/selftend/issues/2489)), the registry, client, edge function and copy with `general` held out ([#2491](https://github.com/Selftend/selftend/issues/2491)), the screen's two runs ([#2492](https://github.com/Selftend/selftend/issues/2492)), the docs-and-counts sweep ([#2493](https://github.com/Selftend/selftend/issues/2493)), and the `act_program_state.preferred_check_in_time` cleanup ([#2490](https://github.com/Selftend/selftend/issues/2490)). Still open: item 8, the release; and item 9, the owner-gated lift of the hold-out once a build carrying `/` is live on both stores ([#2494](https://github.com/Selftend/selftend/issues/2494)). Every section links the ticket whose resolution comment holds the full reasoning and the owner's ruling; the rule itself is recorded in [ADR-0010](adr/0010-one-reminder-is-suggested-by-placement-alone.md) so it outlives the build. The spec was verified against `origin/dev@0b07e2d2` when it was assembled, and every `file:line` below is at that commit — the build has moved some of them since.

---

## 0. What this spec is, and how to read it

The owner's instruction, in three sentences (charting, 2026-09-15): _don't suggest reminders for each individual tool; do it globally, only for a general reminder to check out the app; individual tool reminders are manual only, off by default._ Those three sentences are settled and were not re-litigated; six tickets worked out what they mean against the code as it stands.

Sections 1-6 are the decisions, one ticket each. Section 7 is the data model, from the fan-out research. Section 8 settles the one analytics question the map left in fog. Sections 9-10 name the tests and documents the build touches. **Section 11 is the numbered build list for `/to-tickets`**, in dependency order. Section 12 says what is deliberately not here. Appendix A lists the premises that turned out to be wrong while assembling, so nobody re-derives them.

Three doctrines bind everything below and are quoted rather than paraphrased: `docs/product-principles.md` §12 (_every nudge opt-in, off by default, traced to one explicit choice; nothing on any channel is triggered by non-use_), [ADR-0004](adr/0004-retention-by-return-not-engagement.md) (non-use-triggered contact is refused, not deferred) and [ADR-0008](adr/0008-the-completion-moment-carries-no-ask.md) (no ask at a completion moment; the unprompted-interruption rule binds regardless of component). #28's one-nudge-system invariant (every OS nudge traces to exactly one explicit opt-in; nothing is silently enabled, disabled or deduped; overlaps are made visible) and #1782's master-switch ruling stand untouched; § 12 lists how each was checked.

---

## 1. The rule

**The product suggests exactly one reminder - the general one - and suggests it by placement alone. Every other reminder is manual-only: reachable, never offered, off by default.**

- _Suggested_ means the general reminder is the only reminder the product names in its own voice, and it names it where reminders already live: the first row of the Reminders screen and the settings card's sentence (§ 2). It is not a card, a banner, a flag or a trigger. Nothing is ever shown, so nothing can repeat: "suggested once" reads as _one suggestion_, not _shown once_.
- _Manual-only_ means reachable through a door the person opens on their own - Settings › Reminders, a tool's bell, a routine's editor - and never offered. The eleven per-tool reminders and the routine reminder are all manual-only (§ 4). This closes the gap #28 left: #28 fixed the routine reminder as its own opt-in but never ruled where it may be _offered_.
- _Off by default_ is unchanged: every reminder column defaults false, the general one included.

The one general reminder fires at the time the person chose, every day, identically whether or not the app was opened, and use does not cancel it (§ 3.5). **The clock is the trigger, never absence.** That sentence is what keeps it on the right side of ADR-0004: a reminder that fired _because_ the app had not been opened would be non-use-triggered contact; this one reads nothing about the person's day.

---

## 2. Where the one suggestion lives - two surfaces, both existing ([#2412](https://github.com/Selftend/selftend/issues/2412))

1. **The Reminders screen** (`/notifications`, `src/features/notifications/notifications-screen.tsx`): the general row is the **first row, always, statically** - before every tool row on every arrival. A bell arrival (`?target=<tool>`) still scrolls to and highlights its tool row past it, exactly as #967 ruled; the arrival anchor is keyed by target, not index (`:378`), so nothing changes there. The screen's intro sentence names it (words in § 3.2).
2. **The settings card** (`src/features/settings/settings-screen.tsx:153-162`): stays a **single navigation row** - label, description, chevron, **no inline switch**. Its description is reworded to name the general reminder (§ 3.2). The Reminders screen remains the only place any reminder is armed, because it alone owns the channel-permission flow, the blocked-channel card and the master switch; a switch on Settings would be a second arming point that bypasses all three.

**Rejected**, and why, so the question does not reopen: a line on the onboarding wizard's only panel (its footer already carries the registration line and is declared the whole invitation surface by spec, `app-onboarding-wizard.tsx:67-70`; §12's registration rule - _exactly two surfaces, a third is not added by finding a calmer place for it_ - is the precedent for counting); a static invitation on Home (#960 pins the greeting block at exactly two children, `today-screen.tsx:106-110`; ADR-0004 bars anything Home says about returning); a once-ever card anywhere (ADR-0008 bars every completion moment; `AGENTS.md`'s unprompted-modal rule bars a trigger that is the person's behaviour; there is no moment left that is "a fact about the app"); an inline switch on the settings card.

**Reach is accepted as-is.** On a phone the doors are the settings card and the tool bells; a person who opens neither never meets the suggestion. That is the rule working, not a gap.

---

## 3. What the general reminder is ([#2413](https://github.com/Selftend/selftend/issues/2413))

### 3.1 Key, columns, dedup key, tag

| Thing              | Value                                                                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry key       | `general`                                                                                                                                                                                                                       |
| `user_preferences` | `general_reminders_enabled boolean not null default false` · `general_reminder_hour int not null default 18` (check 0-23) · `general_reminder_minute int not null default 0` (check 0-59) · `general_reminder_timezone varchar` |
| Dedup key          | `last_general_reminder_key text` on `web_push_subscriptions` and on `device_push_tokens` (withheld from export by the existing `*.last_*_reminder_key*` rule, `supabase/README.md:476`)                                         |
| Client fields      | `generalRemindersEnabled` · `generalReminderHour` · `generalReminderMinute` · `generalReminderTimezone`                                                                                                                         |
| Notification tag   | `selftend-general-reminder`                                                                                                                                                                                                     |
| Icon               | `home` (the tap lands on Home, § 3.4)                                                                                                                                                                                           |

Rejected keys: `app` (every reminder is from the app), `daily` (names the cadence, which everything shares).

### 3.2 Copy, both locales

Every string was checked by the ticket against the three copy gates that read every i18n value with no allowlist - `test/practice-copy.test.ts` (return prescriptions), `test/restraint-copy.test.ts` (advertised restraint), `test/positioning-copy.test.ts` (frame words and British house style). **"Check-in" and "проверка" are avoided outright**: the mood tool is called Check-in, three push titles already end in "check-in", and the bg mood push title is "Проверка на настроението".

| Key                                                                                             | en                                                                                                                               | bg                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notifications:targets.general.label`                                                           | **Selftend**                                                                                                                     | **Selftend**                                                                                                                                               |
| `notifications:copy.general.title`                                                              | **One small thing**                                                                                                              | **Едно малко нещо**                                                                                                                                        |
| `notifications:copy.general.body`                                                               | **A few minutes with whichever tool helps. Whenever you're ready.**                                                              | **Няколко минути с инструмента, който помага. Когато ти е удобно.**                                                                                        |
| `notifications:description` (screen intro, replaces the current sentence)                       | **Every reminder here is off until you turn it on. One from Selftend, or one for each tool you use - pick the time it arrives.** | **Всяко напомняне тук е изключено, докато не го включиш. Едно от Selftend или по едно за всеки инструмент, който ползваш - избери часа, в който да идва.** |
| `notifications:runs.perTool` (new; the eyebrow of § 6)                                          | **For each tool**                                                                                                                | **За всеки инструмент**                                                                                                                                    |
| `settings:reminders.description` (replaces "Off by default. You choose which ones to turn on.") | **One reminder from Selftend at a time you pick, or one per tool. All off until you turn them on.**                              | **Едно напомняне от Selftend в час, който избираш, или по едно за всеки инструмент. Всички са изключени, докато не ги включиш.**                           |

Why these words: the row names the app the way every tool row names its tool, so the list reads _Selftend 18:00 / CBT 19:00_. The push title is the wizard's own phrase for the practice with no named tool; the body mirrors the routine body's _whenever you're ready_; neither states a record, an absence, a tool, a return or a health object. The "or one per tool" clause in both door sentences is **description, not suggestion** (§ 4) - naming what is behind a door is not an offer, and without it the card reads as one reminder and the list surprises with twelve rows.

`copy.general` is read by the edge function through a type cast (`send-web-reminders/index.ts:38-45` casts the locale JSON to `Record<ReminderTarget | "routine", …>`), so a missing key compiles; the build pins both locales carry it (§ 9).

### 3.3 Cadence - one daily time, default 18:00

`hour / minute / timezone`, the only shape that exists. **Default 18:00**: a free slot (taken today: 7 meditation, 9 habits, 12 check-in, 15 grounding, 16 breathing, 19 CBT/ACT/DBT, 20 gratitude, 21 journal, 22 sleep; `src/features/modules/types.ts:197-245`), early evening, and _before_ the 19:00 module cluster so a person with a module reminder on is not hit twice within a minute by default.

### 3.4 Deep link - Home, shipped held out

`url: "/"`. Home is greeting → Favourites → Tools → Modules: every door in one place, and the reminder names no tool. Rejected: `/notifications` (lands a person who wanted to _do_ something on a settings surface); `/modules/cbt` (names a tool, and CBT's own status is the modules map's, [#2445](https://github.com/Selftend/selftend/issues/2445)).

The native tap gate `ALLOWED_REMINDER_ROUTES` (`src/lib/notifications.ts:106-118`) drops an unknown route with no fallback (#2213), so `/` joins the set **and the key ships held out** - `general` joins `HELD_OUT_REMINDER_TARGETS` beside `dbt` (`src/features/notifications/reminder-rollout.ts:31-37`) until the native build carrying `/` is live on both stores. While held out: the cron skips it, and the Reminders row shows switched off with the existing `heldOut.note` under the name (`notification-target-row.tsx:130-131,255-261`), exactly DBT's shape today. The lift is the existing release step in `docs/releasing.md` ("Post-release: lift held-out reminder targets"). The web push worker needs nothing: any same-origin path opens (`public/selftend-push-worker.js:9-20`).

### 3.5 Suppression - none. The clock is the trigger, never absence

**The general reminder fires at the time the person chose, every day, and is identical whether or not they opened the app. It reads nothing about the person's day. Use does not cancel it.** Dedup is one per day per channel through `last_general_reminder_key`, exactly as every target dedupes today.

Why not "skip it if any tool was used today": the product has nothing honest to read. The research ([#2415](https://github.com/Selftend/selftend/issues/2415), `docs/research/general-reminder-fanout.md` on branch `research/general-reminder-fanout`) put the cost at **21 tables and up to 21 sequential `limit 1` reads per channel row per due tick** (against 1 today for eight targets), paid exactly when the person used nothing; in the sender's zone, ignoring the fifteen tables that carry a captured-day offset; and it measures _wrote a tool row_, not _opened the app_ - there is no server-side open signal, and CBT's activities tool is in no target's sources. The routines precedent is the only shape the code has for a target with nothing to read: routines never suppress and dedupe once a day (`web-reminders.ts:540-550`).

Per-tool suppression stays as it is for the eleven tool targets: #1655's "a nudge vanishes when satisfied" needs a _satisfied_, and only a tool has one. How the configuration expresses "this target never suppresses" as a rule rather than a carve-out is § 7.3.

### 3.6 The practice gate - it is a practice target: the practice with no named tool

`registry.test.ts:14-47` states that every notification target is a practice target - _something the person DOES_ - and never an announcement, and that adding a non-practice target "means editing a rule that explains why you should not". The general reminder is argued **through** that gate, not around it: the gate exists to keep broadcasts out - targets that fire on a project event or a growth argument - and the general reminder is a personal schedule toward doing one thing, set by the person, carrying no project event. The docblock is **reworded** to say a target is a practice - a tool's, or the one general practice with no tool named - and never a broadcast; `general` joins `PRACTICE_TARGETS`; the broadcast vocabulary lock (`:177-201`) is untouched. A future contributor reads a rule, not an exception.

### 3.7 Glossary entry, for `CONTEXT.md` §Reminders

> **General reminder**: the one reminder that leads to the app rather than to a tool or a routine. A single daily time the person sets, off unless they set it, identical whether or not the app was opened that day, and the only reminder the product names in its own voice. Distinct from a per-tool reminder (set from that tool's bell or from Settings › Reminders) and from a routine's reminder (set from the routine's editor).

---

## 4. What survives manual-only ([#2414](https://github.com/Selftend/selftend/issues/2414))

| Surface                                                                                                                                                                     | Ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The eleven bells** (`src/components/app/module-home-header.tsx:86-95`; callers: act, breathing, cbt, dbt, gratitude, grounding, habits, journal, meditation, mood, sleep) | **Keep**, stateless, arrival-focus unchanged. _A door is not an offer: it opens only on the person's own tap, states nothing, and asks nothing._ Deleting them would void ADR-0008's "stranded nothing" argument and #967's ruling for no gain in restraint.                                                                                                                                                                                                                            |
| **The continue-routine sheet's completion-state reminder offer** (`src/features/routines/continue-routine-sheet.tsx:215-250`)                                               | **Delete.** The completion state renders the plain Close branch that already exists for reminder-on and on-demand routines. It was a post-completion ask with an unrecorded decline ("Not now" is a bare `onClose`, so it re-asks every time) - the shape ADR-0008 removed for tools, and ADR-0008 `:135-138` had already rejected "the end of a routine" as a home for an ask. The routine's manual door is the editor's Daily reminder section (`routine-editor-screen.tsx:634-656`). |
| **"or one per tool" / "or one for each tool you use"** in the two door sentences                                                                                            | **Keep** (§ 3.2). Description, not suggestion.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Glossary** _Reminder (of a routine)_ (`CONTEXT.md:108-109`)                                                                                                               | Gains _set from the routine's editor_, so all three reminder kinds name their door.                                                                                                                                                                                                                                                                                                                                                                                                     |

Keys that go with the offer, both locales: `routines:sheet.reminderOffer`, `sheet.reminderTimeLabel`, `sheet.reminderAccept`, `sheet.reminderDecline`, `sheet.reminderSaveError` (`en/routines.json:178-182`). The on-demand disjunct in the same branch (`routine.cadence === "on-demand"`, defence in depth for #102) goes with it; the #102 guardrail - on-demand routines never nudge - is enforced upstream by the FAB's scheduled-today filter and stays pinned in `routine-fab.test.tsx` under its own name (§ 9).

---

## 5. Coexistence with routine and per-tool reminders ([#2417](https://github.com/Selftend/selftend/issues/2417))

> **Overlap is the same work nudged twice, never the same minute. The general reminder names no work, so it overlaps nothing and nothing overlaps it. It adds at most one notification a day per device, exactly as one tool or one routine does; a day's total is the count of reminders the person turned on, never more and never fewer.**

- **No overlap note anywhere** - not in the routine editor, not on the Reminders screen. #28's overlap detector (`routine-editor-screen.tsx:438-449`) flags a routine step whose tool has its own reminder on; it never compares times, and two tool reminders at one minute have never been an overlap. Same-minute is not a category the product has.
- **Enabling a per-tool reminder beside the general one: nothing happens.** Independent opt-ins, per #28. A note would be the third suggestion surface § 2 ruled out.
- **Tags and dedup keys keep every reminder apart by construction**: each target has its own tag and its own `last_<target>_reminder_key`, routines a per-row map, so same-minute pushes never replace each other on web and nothing caps sends per tick. #28's "never dedupes silently" holds.
- The default 18:00 sits in a free slot (§ 3.3), so default-on-default collisions cannot happen; a collision is a time the person set twice on purpose, which #28 "never blocks".
- One test makes the accident a rule: the editor's `overlapTargets` can never contain `general` (§ 9).

---

## 6. The Reminders screen - one card, two runs ([#2416](https://github.com/Selftend/selftend/issues/2416))

Prototype: https://claude.ai/artifact/9svtH7ZzqSdunfZGTmz9S7 (source on the throwaway branch `prototype/2416-general-reminder-row`, `prototypes/2416-general-reminder-row.html`, never merged).

- **Arrangement C**: the general row is **row one of the existing rows card** (`notifications-screen.tsx:365-420`); an **eyebrow inside the card** - `runs.perTool`, rendered with the `eyebrow` text variant (`text.tsx:48`, muted) - divides it from the eleven, which follow in registry order. The skeleton branch (`:405-418`) carries the same eyebrow at the same height, so loading and loaded lay out identically (#981, ADR-0009).
- **The master card stays where it is** (#1782). Measured at 360 CSS px, the master switch and the general switch are 119.5 px (en) / 138.4 px (bg) apart, in different cards, one over a hint and one beside a time field; they do not read as one control.
- **Icon `home`**; **held-out state as drawn** with the existing `heldOut.note` (row 169.6 px en / 188.5 px bg while held out, 88.3 px once lifted and on).
- **Existing users see the same static row**: it has no state of its own, so someone with per-tool reminders on gets the general row first, off, like everyone else. Nothing to migrate, nothing to draw.
- Rejected: A (row one with no divider - "Selftend" reads as a twelfth tool with an odd name); B (its own card between the master and the tools card - three stacked switch-bearing cards).

Measured at 360 (Noto Sans loaded): row body 196 px; plain row 89.3 px; bg gratitude row 109.5 px on two lines (label 212.8 px, per #1248); master card 95.9 / 114.8 px; screen content 1568 / 1665 px, so the eleven are below the fold either way.

---

## 7. Data model and the fan-out ([#2415](https://github.com/Selftend/selftend/issues/2415))

The research walked 29 surfaces. Twenty-three take a prefix, a url, a default hour and copy; six assume a tool, and each of those is resolved below by a ruling above. The full table is in `docs/research/general-reminder-fanout.md` on branch `research/general-reminder-fanout` (`b947c369`).

### 7.1 Migration

One migration, versioned **`max(existing) + 1 day` at write time** (`20260917000000` is the newest on `dev` today; never today's date - see the migration-version rule the repo follows), on the DBT template (`20260910000000_dbt_module.sql:1027-1038`):

- the four `user_preferences` columns of § 3.1, hour default **18**;
- `last_general_reminder_key text` on `web_push_subscriptions` and `device_push_tokens`;
- `export_user_data` re-declared **wholesale** from its newest declaration (`20260915000000_drop_reminder_prompted_tools.sql:45`, 1,077 lines) with the four columns added to the reminder merge (`:964-987`). `test/integration/export-user-data-completeness.integration.test.ts:122` fails on any live column not exported or README-withheld; `test/export-user-data-monotonic.test.ts` fails on any exported column that goes missing - so the re-declaration adds and drops nothing else.

Nothing is backfilled: existing rows take the defaults, which is the off state.

### 7.2 Registry (`src/features/notifications/registry.ts`)

- `general` joins `NotificationTargetKey` and the four field unions (`:4-64`); the entry carries `labelKey: "targets.general.label"`, `icon: "home"`, the four fields.
- **Order rule edited**: the general target **leads**; then the widget-catalogue order; then targets the catalogue does not name (`dbt`). The docblock at `:88-94` and the derivation in `registry.test.ts:90-108` both say so - `[general, ...catalogueOrder, ...withoutWidget]`.
- **Practice gate**: docblock reworded per § 3.6; `general` in `PRACTICE_TARGETS` (`registry.test.ts:48-60`).
- **Catalogue lock** (`registry.test.ts:151-157`, every target is a Favourites `CATALOGUE` item with an `href`): exempts exactly `general`, whose destination is Home itself; the exemption is stated in the test's docblock as the one target whose door is the screen every catalogue item sits on, and `web-reminders.test.ts` pins its url as `/` (§ 9).
- Column naming (`:110-116`) and the vocabulary lock (`:177-201`) generalise untouched.

### 7.3 Edge function (`supabase/functions/_shared/web-reminders.ts`, `send-web-reminders/index.ts`) - the suppression discriminant

`TargetConfig.activitySources` is non-empty **by type** (`:163-176`: "a target with nothing to read is not a configuration this module accepts"), and `web-reminders.test.ts:233-240` pins ≥1 source and ≥1 window for every target. A general entry cannot compile as the type stands. #2413 left the shape to this spec, with one constraint: a one-key exception that reads as a rule, not a carve-out. **The spec chooses a discriminant:**

```ts
type TargetSuppression =
  | { suppression: "on-use"; activitySources: readonly [ActivitySource, ...ActivitySource[]] }
  | { suppression: "never" };
```

`TargetConfig` carries one of the two. Every tool target is `"on-use"` with its sources exactly as today; `general` is `"never"`. `index.ts` skips `usedToolToday` (`:86-121`) for a `"never"` target instead of calling it with an empty list. The docblock at `:171-174` is rewritten to state the rule: _a tool target suppresses on use because a tool has a satisfied (#1655, #1668); a target with no tool to read declares `"never"`, which today is exactly the general reminder, and a tool target may not._ The test "every tool reminder suppresses on same-day use - none is exempt (#1668)" iterates the `"on-use"` targets; a sibling test pins that the set of `"never"` targets is exactly `["general"]`, so a tool cannot slip into the exemption and the exemption cannot silently widen.

Rejected: routing `general` through the routine code path (routines are per-row with a jsonb key map; the general target is a per-target column, and the routine path would have to grow a second shape to carry it); admitting an empty array on the existing field (the type would then say nothing, and the "none is exempt" test would have to allowlist a key - the carve-out shape #2413 refused).

The rest generalises: `ReminderTarget` union (`:17-28`), row types (`:30-101`), the two select lists and `PREFERENCE_COLUMNS` in `index.ts` (`:150,162,177-226`), `reminderKeyIfDue` (`:413-446`), `TARGET_CONFIGS.general` = `{ enabledField, hourField, minuteField, timezoneField, lastKeyField: "last_general_reminder_key", url: "/", tag: "selftend-general-reminder", suppression: "never" }`. `HELD_OUT_TARGETS` reads the app-side list (`:341-375`), so the hold-out is one edit in `reminder-rollout.ts`.

### 7.4 Client

- `defaultUserPreferences` (`src/features/modules/types.ts:197-245`): four defaults, hour 18.
- `src/features/settings/repository.ts`: the row type (`:70-73` shape), the read map (`:186-191` shape) and the write map (`:443-446` shape) each gain four lines.
- `enableTargetPatch` (`enable-patch.ts:45-54`) writes `reminder_consent` on enable with no change, so consent and the §8 analytics count generalise for free.
- `src/lib/notifications.ts:106-118`: `"/"` joins `ALLOWED_REMINDER_ROUTES`.
- `reminder-rollout.ts:31-37`: `"general"` joins `HELD_OUT_REMINDER_TARGETS` with a comment naming the build that allowlists `/`.
- The Reminders screen and row read the registry entry; the only screen change is the eyebrow (§ 6).

### 7.5 Existing users, demo seed, hand-listed target lists

- **Existing users**: nothing. The row is static and off; the columns default off; `notifications_enabled_global` stays what it is (a kill switch, default true, #1782).
- **Demo seed: the general reminder stays off.** `scripts/seed-demo-data.mjs` arms only `cbt_reminders_enabled` for the demo accounts today and every reminder defaults off; the seed's consent guard (`:5774-5787`) hand-lists the enabled columns and **already omits `dbt`** - the build adds `dbt_reminders_enabled` and `general_reminders_enabled` to that list in the same change.
- `test/integration/db-functions.integration.test.ts:129-140` hand-lists ten keys and also omits `dbt`; it gains `dbt` and `general`. A hand-listed enumeration is not a gate (Appendix A), so both lists are fixed rather than trusted.

---

## 8. Analytics - counted, no line of its own

`scripts/analytics-engagement.sql` §8 (`:815-842`) reads only `reminder_consent`, and a general enable goes through `enableTargetPatch`, which writes it - so **adoption of the general reminder is counted with no change**. The map's open question was whether the general target is reported on its own line. **No.** No target has its own line today; §8 measures the consent decision, not which reminder carried it, and that is the figure that evidences the quiet-by-default guardrail. A per-target split is a measurement question for the measurement map's tail ([#2301](https://github.com/Selftend/selftend/issues/2301)), not this spec's; at present adoption a per-target cell would be k-suppressed anyway. `test/analytics-shared-sql.test.ts:193-214` (must read `reminder_consent`, must not read `notifications_enabled_global`) stays as it is.

---

## 9. Tests - what pins each piece

| Piece                                               | Test                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| General leads; catalogue order; catalogue-less tail | `registry.test.ts` "is ordered by the widget catalogue" (`:90-108`), derivation rewritten to `[general, ...catalogueOrder, ...withoutWidget]`                                                                                                                                                                                                                                                                                                                                 |
| Practice gate                                       | `registry.test.ts` "carries only practice targets" (`:123-127`) with `general` in `PRACTICE_TARGETS`; docblock reworded (§ 3.6)                                                                                                                                                                                                                                                                                                                                               |
| Catalogue lock exemption                            | `registry.test.ts` "is a catalogue item with somewhere to go" (`:151-157`) runs over every target but `general`; a sibling asserts the exemption set is exactly `["general"]`                                                                                                                                                                                                                                                                                                 |
| Suppression discriminant                            | `web-reminders.test.ts`: "none is exempt (#1668)" over `"on-use"` targets; new "exactly the general target never suppresses"; `TARGET_CONFIGS.general.url === "/"`, tag `selftend-general-reminder`                                                                                                                                                                                                                                                                           |
| Hold-out and partition                              | `reminder-rollout.test.ts:22` list = `["dbt", "general"]`; `web-reminders.test.ts:224-230` partition                                                                                                                                                                                                                                                                                                                                                                          |
| Push copy present in both locales                   | `send-web-reminders` test (or `web-reminders.test.ts`): `copy.general.title/body` exist in `en` and `bg` - the cast at `index.ts:38-45` hides a missing key                                                                                                                                                                                                                                                                                                                   |
| Native route                                        | `test/check-in-route-compat.test.tsx` unchanged; `isAllowedReminderRoute("/")` true                                                                                                                                                                                                                                                                                                                                                                                           |
| Reminders screen                                    | `notifications-screen.test.tsx`: the eyebrow renders between row 0 and 1 in the real and skeleton branches; the arrival highlight lands on a tool row past the general row (`?target=gratitude`); row count derives from the registry (`:154`)                                                                                                                                                                                                                                |
| Held-out row                                        | `notification-target-row.test.tsx` existing held-out case, run for `general`                                                                                                                                                                                                                                                                                                                                                                                                  |
| Overlap                                             | `routine-editor-screen.test.tsx`: `overlapTargets` never contains `general` - with the routine reminder on, every step's tool reminder on, and the general reminder on, the note names only step tools                                                                                                                                                                                                                                                                        |
| Routine sheet                                       | `continue-routine-sheet.test.tsx:200-270`: the three offer cases replaced by one - the completion state renders Close and nothing else, for reminder-off, reminder-on and on-demand routines; `routine-fab.test.tsx:301` keeps its describe **named for #102** - built as "no reminder ever reaches an on-demand routine (#102)", there being no offer left to name - with its body asserting the FAB's scheduled-today filter, so the #102 guardrail is not silently dropped |
| Locale parity and key coverage                      | `src/i18n/locale-parity.test.ts` (both locales carry every key; the five deleted routine keys go from both); `test/i18n-key-coverage.test.ts` for the literal `t("runs.perTool")`                                                                                                                                                                                                                                                                                             |
| Copy gates                                          | `test/practice-copy.test.ts`, `test/restraint-copy.test.ts`, `test/positioning-copy.test.ts` - no allowlist, every value                                                                                                                                                                                                                                                                                                                                                      |
| Export                                              | `export-user-data-completeness` (new columns exported), `export-user-data-monotonic` (nothing lost)                                                                                                                                                                                                                                                                                                                                                                           |
| Hand lists                                          | `db-functions.integration.test.ts:129-140` and the seed guard (`seed-demo-data.mjs:5777-5787`) list twelve keys                                                                                                                                                                                                                                                                                                                                                               |

---

## 10. Documents the build touches

**Definitions and doctrine**

- `CONTEXT.md` §Reminders: the _General reminder_ entry (§ 3.7) beside _Reminder (of a routine)_ (`:108-109`, which gains _set from the routine's editor_); `:136` "enabling a tenth reminder never asks the user again" → _a twelfth_; `:144` "consent, a per-tool enabled flag, and a channel" → _a per-reminder enabled flag_.
- `docs/adr/0008-the-completion-moment-carries-no-ask.md:73,138` says "all twelve" tool home screens; the bells are eleven. **An ADR is amended by a dated note, not rewritten** (the convention ADR-0003 set): one line at the end of ADR-0008 recording the count and pointing here.
- [ADR-0010](adr/0010-one-reminder-is-suggested-by-placement-alone.md) - lands with this spec, not with the build.

**Counts** - the repo holds three counts of one surface (ten in the docs and the header docblock, twelve in ADR-0008); the bells are **eleven**, the Reminders screen becomes **twelve rows**:

- `src/components/app/module-home-header.tsx:59` ("all ten homes - the eight tools plus ACT and CBT") and `:88` ("all ten bells") → eleven, DBT named.
- `docs/app-store-review-information.md:72,177` "Ten reminder targets, every one off by default" → _Twelve reminder targets - one general, eleven per tool - every one off by default_.
- `docs/child-safety-review.md`: a new pass row for the one general string on the DBT template (`:238-242`: a static string, off by default, time-of-day only; no missed-day, come-back or loss line; nothing varying by date). The review is a build step because the string reaches a person who did not open the app.
- `docs/dpia-minors-assessment.md:520` ("Reminders are off by default, opt in per channel, and switch off in Settings; nothing is sent because someone stopped using the app") stays true as written; the row's evidence column gains ADR-0010.
- Test prose that says "ten" and asserts nothing: `notifications-screen.test.tsx:163,173,499`, `notification-target-row.test.tsx:300,523`.

**Stale mechanism line**

- `docs/modules/cbt.md:89` says native reminders "remain local device schedules through Expo Notifications". Delivery is server-driven on every platform: the client arms a channel (Web Push or an Expo token) and the cron'd edge function reads the columns at send time. Rewritten - together with the same claim in `docs/self-hosting.md` and in the two manual-test checklists (`docs/android-closed-testing.md`, `docs/internal-testing.md`), which #2493's sweep turned up.

**Release and index**

- `docs/releasing.md` "Post-release: lift held-out reminder targets": "Today's list" gains `general`, held until the build carrying `/` in `ALLOWED_REMINDER_ROUTES` is live on Google Play and the App Store.
- `docs/README.md`: this file's index line, and its Status paragraph as items land.

---

## 11. The build, in dependency order

For `/to-tickets`. The order is the dependency order, not a schedule; items with no arrow between them are independent. Items 1 and 10 are cleanups that touch no general-reminder code and can land first or last.

1. **The routine sheet's completion-state offer comes out** (§ 4) - the branch at `continue-routine-sheet.tsx:215-250` becomes the plain Close branch for every completed routine; the five `sheet.reminder*` keys go from both locales; `continue-routine-sheet.test.tsx`'s three offer cases become one; `routine-fab.test.tsx:301` keeps the #102 describe by name. Depends on nothing.
2. **The migration** (§ 7.1) - four columns with hour default 18, two dedup keys, `export_user_data` re-declared wholesale with four columns in the merge; `db-functions.integration.test.ts` and the seed guard list twelve keys (`dbt` and `general`); the seed arms nothing new. Depends on nothing. Versioned `max(existing) + 1 day` on the day it is written.
3. **Copy, both locales** (§ 3.2) - `notifications:targets.general.label`, `copy.general.title/body`, `description`, `runs.perTool`; `settings:reminders.description`. Depends on nothing, but ships **with** item 4 (the edge cast reads `copy.general` the moment `general` is a `ReminderTarget`).
4. **Registry, client and edge function** (§ 7.2-7.4) - one change, because `reminder-rollout.ts` is read by both sides and the partition test pins them together: the key and field unions, the leading entry with icon `home`, the order rule, the practice-gate docblock and allowlist, the catalogue-lock exemption; `defaultUserPreferences` and the settings repository maps; `"/"` in `ALLOWED_REMINDER_ROUTES`; `general` in `HELD_OUT_REMINDER_TARGETS`; the `TargetSuppression` discriminant with `general` as the one `"never"` target, `index.ts` skipping the activity lookup for it, the two select lists and `PREFERENCE_COLUMNS`; every test in § 9 that names these. Depends on 2 and 3.
5. **The Reminders screen** (§ 6) - the `runs.perTool` eyebrow between row 0 and row 1 in the real and skeleton branches; the arrival test past the general row; the held-out case for `general`. Depends on 4.
6. **The overlap pin** (§ 5) - the `routine-editor-screen.test.tsx` case that `overlapTargets` never contains `general`. Depends on 4. Small enough to ride with 5.
7. **Docs and counts** (§ 10) - `CONTEXT.md` glossary and count lines; ADR-0008's dated amendment note; the header docblock and test prose; `app-store-review-information.md`; the child-safety pass row; the DPIA evidence column; `docs/modules/cbt.md:89`; `docs/releasing.md`'s held-out list; this file's Status. Lands with the release PR of item 8.
8. **The release** - `general` ships held out; the row is visible, off, with the note. Depends on 1-7 being on `dev`.
9. **The lift** - once the native build carrying `/` is live on **both** stores, the release step in `docs/releasing.md`: `general` leaves `HELD_OUT_REMINDER_TARGETS`, `reminder-rollout.test.ts` and `web-reminders.test.ts` are edited in the same change, merge redeploys the edge function. Owner-gated on store status, as DBT's lift is. Depends on 8.
10. **Cleanup, separate from the reminder work: drop `act_program_state.preferred_check_in_time`** (#2414) - the column exists (`supabase/migrations/20260535_act_module.sql:14`), the ACT repository maps and patches it (`src/features/act/repository/program-state.ts:16,29,53-54`), the export flattens it, and no screen writes it and nothing reads it. A stored preference nothing reads is a data-minimisation liability. One migration drops the column, re-declares `export_user_data` without it, and rewrites the encrypt/hardening triggers that copy it (`20260635_act_program_state_encrypt.sql`, `20260662_update_triggers_return_fresh_timestamps.sql:170`, `20260668_audit_phase2b_hardening.sql:26-48`); `test/export-user-data-monotonic.test.ts`'s `INTENTIONALLY_DROPPED` gains `act_program_state.preferred_check_in_time` with the migration named (the gate also fails on an allowlist entry that stops being needed); the ACT types (`types.ts:35,46`), repository and their tests, `test/integration/act-program-state-encryption.integration.test.ts` (which asserts the column stays plaintext), the demo seed's write (`seed-demo-data.mjs:4314`) and `docs/modules/act-harris-happiness-trap.md:561` all drop it. Depends on nothing.

---

## 12. Not in this spec, and where each thing went

- **Any inactivity-triggered or "we miss you" notification** - refused by ADR-0004, not deferred. The general reminder is not one: the clock is the trigger, never absence (§ 3.5).
- **A third suggestion surface** of any kind - wizard line, Home invitation, timed or once-ever card - ruled out in § 2 under §12's "every surface is a step".
- **Per-tool reminder mechanics** (times, same-day suppression, one-per-day dedup) and **the routine reminder's mechanics** - #28 stands; only the routine _offer_ is touched (§ 4).
- **A tool-side overlap note** - #28 named two directions and only the editor's was built; the other is precedent, not a build item, and the general reminder needs neither (§ 5).
- **The master switch's default** - #1782 ruled; a `true` default with every target off sends nothing, and the master stays off Settings.
- **Delivery off FCM / Web Push** - `docs/marketing-plan.md` refuses the re-architecture.
- **A per-target adoption line** - the measurement map's (§ 8).
- **CBT/ACT/DBT gating** - the modules map ([#2445](https://github.com/Selftend/selftend/issues/2445)); the general reminder's deep link was chosen so it depends on no module's status.

**How the prior rulings were checked.** #28: the general reminder is its own explicit opt-in, own tag, own dedup key; nothing is enabled, disabled or deduped silently; the overlap detector is unchanged and gains a pin (§ 5). #1782: the master switch keeps its place, its default and its hint copy ("One switch for every reminder, routines included" - still true with twelve). ADR-0008: no ask is added anywhere; deleting the routine sheet's offer is the same reasoning applied to the one post-completion ask ADR-0008's own text had already rejected as a relocation target. **No prior ruling is amended.** One prior _shape_ changes and is recorded rather than amended: #981 made the Reminders screen "one run in catalogue order" by deleting the `kind` split; § 6 puts an eyebrow inside that one card between the general row and the eleven - two runs, one card, no `kind` field and no second card. Noted on #981.

---

## Appendix A - premises corrected while assembling

Each was believed at charting or in a ticket and found wrong against the code; recorded so it is not re-derived.

- **The per-tool completion-moment offer was already gone before the map was charted.** `ReminderPromptCard` was deleted by #2342 (ADR-0008) and `reminder_prompted_tools` dropped by #2343. Charting's survey ran on a stale local checkout and reported it live. Fetch `origin/dev` before trusting any survey of this area.
- **`starter.reminderOffer` does not exist.** `StarterOfferCard` carries no reminder copy. The live routine offer was `sheet.reminderOffer` on the continue-routine sheet's completion state (§ 4). #2414's title still names the starter card; its resolution corrects it.
- **The bell count is eleven.** Docs and the header docblock say ten; ADR-0008 says twelve; the registry and the `ModuleHomeHeader` callers are eleven (§ 10).
- **A hand-listed enumeration is not a gate.** Two target lists (`db-functions.integration.test.ts:129-140`, `seed-demo-data.mjs:5777-5787`) had already drifted at eleven, omitting `dbt`, without failing (§ 7.5).
- **Delivery is server-driven on every platform**; `docs/modules/cbt.md:89` ("local device schedules") is stale (§ 10). A general target needs a server arm, not a client schedule.
- **The suppression check is viewer-local at send time** for every target, anchored to the channel's zone; it never reads a `*_offset_minutes` column. The captured-day/viewer-local split (#1990) is a fact about the tables, not this check.
- **`notifications_enabled_global` defaults true and is a kill switch, not a reminder** (#1782). Adoption is `reminder_consent`; the analytics gate enforces the distinction.
- **#28's overlap is same-work, never same-minute.** The detector matches a step's tool, not a time; "general at 09:00 and a routine at 09:00" was never a category (§ 5).
- **`registry.test.ts`'s doctrinal gate is its docblock, not its vocabulary stems.** The stems are the mechanical half; a general target has to be argued through the docblock (§ 3.6).
- **`act_program_state.preferred_check_in_time` has no app writer and no reader - but it is not untouched.** The demo seed writes it (`seed-demo-data.mjs:4314`) and an integration test asserts it is stored plaintext (`act-program-state-encryption.integration.test.ts:47-74`); both go with the column (§ 11 item 10). #2414's "no writer, no reader" was true of the app and is qualified here so the drop does not miss them.
- **The stale line is `docs/modules/cbt.md:89`, not `:83`** as the map and the ticket said.
- **Charting's `docs/modules/cbt.md` claim aside, no other mechanism line was stale**: `CONTEXT.md` §Reminders describes consent, flag and channel correctly; only its counts and its tool-shaped definitions change (§ 10).
