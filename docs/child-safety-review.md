# Child-safety content review

The module-by-module content review [spec #227](https://github.com/Selftend/selftend/issues/227) §4 requires before the Google Play audience flip, run for [#1770](https://github.com/Selftend/selftend/issues/1770).

**Run: 2026-09-04**, against `dev` at `efd79092` — the commit that made the 13+ per-country floor published product truth ([#1767](https://github.com/Selftend/selftend/issues/1767)). That is the reason this review happens now: until then the eligibility copy said 18 and over, and there was no thirteen-year-old to review for.

This file is the record. It exists so the next reviewer starts from a decision rather than re-deriving one, and so an accepted item is visibly accepted rather than merely unnoticed.

## Scope

**Every user-visible string in the app**: all 20 i18n namespaces, `en` and `bg` — 4,140 English strings, ~156,000 characters. Namespaces are the unit because AGENTS.md § i18n conventions requires every user-visible string to come from a translation file, so covering all 20 covers every module.

⚠️ **That coverage rests on a convention, not on a guard, and the difference matters.** Nothing in the suite detects a hardcoded user-visible literal. `test/i18n-key-coverage.test.ts` asserts that literal `t("…")` keys _resolve in `en`_ — it catches a moved or missing key, and its own header records that template-literal keys are invisible to it. So a string hardcoded into a component would be invisible to this review as well. It is a real hole in the method, not a theoretical one.

Out of scope, and owned elsewhere:

- Store listing and Play declarations — [#1771](https://github.com/Selftend/selftend/issues/1771), the owner's rollout pass.
- The DPIA / minors' assessment — [dpia-minors-assessment.md](dpia-minors-assessment.md), [#1768](https://github.com/Selftend/selftend/issues/1768). This review is cited there as the evidence for the duty-of-care row.
- The delete-on-knowledge runbook, the PR-template gate line, and the annual legal-landscape check — [#1769](https://github.com/Selftend/selftend/issues/1769). §4's _ongoing cadence_ bullet is that ticket's, not this one's.

## Method

Reproducible, in two passes, because 4,140 strings cannot be read closely with equal attention and pretending otherwise is how a review misses things.

1. **Mechanical screen over every string** for five candidate shapes: medical/clinical vocabulary, treatment-protocol vocabulary, Play-sensitive subject matter (self-harm, suicide, violence, sex, substances), crisis vocabulary, and reading-level outliers (longest sentence ≥ 30 words, or ≥ 3 words of 12+ letters). **126 candidates**, which is a readable number.
2. **Close read** of all 126, plus a full read of the highest-risk blocks whether or not they were flagged: the CBT onboarding intro, the exposure tool, the crisis page, the meditation stage descriptions, the DBT overview, every reminder string, and the policy copy #1767 introduced.

A third targeted screen was added after pass 2 — absolute effect verbs applied to health outcomes — because the first screen keyed on clinical _vocabulary_ and this claim shape uses none. It found the breathing module's heart-rate-variability promise.

⚠️ **What the method does not cover.** It reads copy, not screens: it cannot see a string that is technically fine and lands badly next to an image, and it cannot see reading order. It also cannot see anything hardcoded outside the locale files (nothing should be, and `test/i18n-key-coverage.test.ts` is what holds that line).

## The checklist

§4's five rows, and how each was applied.

| #   | Row                                                  | How it was judged                                                                                                                                                                               |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 13-15 reading level and tone                         | Long sentences and long words as a shortlist, then read. Jargon judged on whether the app expands it anywhere.                                                                                  |
| 2   | No copy implying medical outcomes                    | A claim the product cannot keep — that an activity heals, treats, retrains the brain, or maximises a physiological measure. Naming a modality ("cognitive behavioural therapy") is not a claim. |
| 3   | Crisis guidance clearly separated from self-help     | Its own page, its own persistent bar, its own vocabulary, reachable from the tools without being mixed into them.                                                                               |
| 4   | Exposure/recovery framed as self-help, not treatment | Whether the words are the ones a person uses about their own practice, or the ones a clinician uses about a protocol they run.                                                                  |
| 5   | Play 13-15 / 16-17 appropriateness                   | Whether sensitive subject matter appears, and whether it appears with care.                                                                                                                     |

## Results by module

Every namespace, with the surfaces it covers. **Pass** means read and nothing to change; **Fixed** means a finding was corrected in this change; **Raised** means a finding exceeded a copy tweak and became an issue; **Accepted** means a flag was considered and deliberately kept, with the reasoning below.

| Module / surface                                                                                                                                          | Namespace                   | 1 Reading            | 2 Medical              | 3 Crisis            | 4 Framing | 5 Play   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------- | ---------------------- | ------------------- | --------- | -------- |
| CBT module — Think/Act/Be, thought records, distortions, beliefs, **exposure**, worry, anger, procrastination, activities, recovery, grounding, breathing | `cbt`                       | **Fixed**            | **Fixed** + **Raised** | Pass                | **Fixed** | Pass     |
| ACT module                                                                                                                                                | `act`                       | Accepted             | Pass                   | Pass                | Pass      | Pass     |
| DBT overview (now the module home)                                                                                                                        | `dbt`                       | **Fixed**            | Pass                   | Pass                | Pass      | Pass     |
| Meditation module                                                                                                                                         | `meditation`                | Accepted             | Pass                   | Pass                | Pass      | Pass     |
| Mood tracker                                                                                                                                              | `mood`                      | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Journal                                                                                                                                                   | `journal`                   | **Fixed**            | **Fixed**              | Pass                | Pass      | Pass     |
| Gratitude log                                                                                                                                             | `gratitude`                 | Accepted             | Pass                   | Pass                | Pass      | Pass     |
| Sleep                                                                                                                                                     | `sleep`                     | Pass                 | Pass                   | Pass                | Pass      | Accepted |
| Habits                                                                                                                                                    | `habits`                    | Pass                 | Accepted               | Pass                | Pass      | Pass     |
| Routines                                                                                                                                                  | `routines`                  | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Reminders                                                                                                                                                 | `notifications`             | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Help content                                                                                                                                              | `help`                      | Pass                 | Accepted               | Pass                | Pass      | Pass     |
| Onboarding, settings, support, account                                                                                                                    | `settings`                  | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Auth, age gate, under-floor exit                                                                                                                          | `auth`                      | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Navigation, home, tools, insights                                                                                                                         | `navigation`                | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Policies, crisis, FAQ                                                                                                                                     | `policies`                  | **Fixed** + Accepted | Pass                   | **Pass — verified** | Pass      | Pass     |
| App lock                                                                                                                                                  | `security`                  | Pass                 | Pass                   | Pass                | Pass      | Pass     |
| Timer, shared UI, errors                                                                                                                                  | `timer`, `common`, `errors` | Pass                 | Pass                   | Pass                | Pass      | Pass     |

## Findings fixed

All in `en` and `bg`, except finding 11, which is a British-spelling fix and has no Cyrillic analogue.

| #   | Where                                                | Was                                                                       | Why it moved                                                                                                                                                                              |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `journal:onboarding.welcome.title`                   | "Writing heals"                                                           | A health-outcome claim in two words, on the journal's first screen. AGENTS.md § _Privacy and safety expectations_ forbids copy implying medical outcomes. Now "Write it out".             |
| 2   | `journal:onboarding.welcome.subtitle`                | "…can do more than hours of rumination."                                  | Comparative efficacy claim, and "rumination" is clinical vocabulary the app expands nowhere.                                                                                              |
| 3   | `cbt:onboarding.intro.title`                         | "The CBT Toolkit: Think, Act, and Be Your Way to Better Mental Health"    | Promises the outcome in the title. Now "CBT: Think, Act, Be".                                                                                                                             |
| 4   | `cbt:onboarding.intro.subtitle`                      | "…habits required to retrain the brain for lasting emotional well-being." | A neurological mechanism claim plus a durability claim, in a 40-word sentence, on a first-run screen.                                                                                     |
| 5   | `cbt:onboarding.intro.sleepBody`                     | "…regulate the limbic system and improve daytime emotional resilience."   | Same shape, plus "limbic system" — anatomy vocabulary on an onboarding screen.                                                                                                            |
| 6   | `cbt:breathing.exercises.coherent-breathing.benefit` | "Maximises heart rate variability and reduces anxiety over time."         | The strongest claim found: an absolute verb on a measurable physiological quantity, plus a clinical outcome.                                                                              |
| 7   | `cbt:breathing.exercises.4-7-8.shortDescription`     | "…down-regulates the nervous system quickly."                             | "Down-regulates" is not thirteen-year-old vocabulary and the sentence works without it.                                                                                                   |
| 8   | `cbt:grounding.onboarding.when.body`                 | "…racing thoughts, dissociation, or any moment…"                          | "Dissociation" unglossed, on a first-run screen. Now "feeling unreal or far away", which is what it means.                                                                                |
| 9   | `cbt:exposure.*` — 19 strings                        | "hierarchy" as the UI noun; bare "SUDS" on four labels                    | §4 row 4 exactly. See below.                                                                                                                                                              |
| 10  | `modules:dbt.skills.distressTolerance.desc`          | "…TIPP, ACCEPTS, IMPROVE."                                                | Three acronyms expanded nowhere in the app, on a page that states it is an overview rather than exercises. They gave a reader nothing to act on.                                          |
| 11  | `policies:faq` — 3 strings                           | "counseling", "AI counselor" ×2                                           | House style is British (`docs/positioning.md` § _Words to use_), and #1767 had just added "counsellor" to the same file. `faq` is not consent-bearing, so the policy digest did not move. |
| 12  | `policies:privacy.sections[0].body[4]`               | one 41-word sentence                                                      | Inside the plain-language summary #1767 added — the section that promises plain words. Split in two; nothing disclosed changed.                                                           |

### On finding 9, the exposure tool

The tool's user-visible noun was **"hierarchy"** and four of its labels read **"SUDS"** — the vocabulary of a protocol a clinician runs, which is precisely what §4 row 4 asks the review to look for.

What settled it is that this was never a choice between two defensible words. Two of the three surfaces that describe the same object **already said "ladder"**, in both languages:

- `help:exposure.how` — "Build a **ladder** of situations by difficulty…" / "Изгради **стълба** от ситуации по трудност…"
- `cbt:program.tasks.exposureLadder` — "Build a graded exposure **ladder**" / "Изгради **стълба** на градуирано излагане"

Only the tool's own UI said hierarchy. So this unified on the word the app already used, rather than inventing one.

⚠️ **Identifiers were not touched, deliberately.** `exposure_hierarchies` is a table name, the Zod schemas keep theirs, and the route stays `/modules/cbt/exposure/[id]`. `docs/positioning.md` § _Words to use_ draws exactly this line — a respelling that breaks a bookmark or a column costs a user something to fix a word no user reads.

## Finding raised

**[#1867](https://github.com/Selftend/selftend/issues/1867) — the clinical conditions table in the CBT onboarding intro.** A three-row table of GAD / Panic Disorder / Depression with each one's "Core Feature", introduced as "what CBT is clinically used for", met on first entry to the module.

It is accurate and it is honestly disclaimed. What changed is who reads it: a table pairing a named diagnosis with its defining feature is a self-identification prompt, and the audience now starts at thirteen. Removing or relocating it is a content-structure decision, so per the ticket — _"a flag is a finding to raise rather than a change to make quietly"_ — it is an issue with options, not an edit. Nothing in this review depends on its outcome.

## Findings accepted, with reasoning

An accepted item is one the review looked at and deliberately kept. Recorded so the next reviewer does not re-derive the argument, and so a reversal is a decision rather than an oversight.

- **Meditation stage descriptions** (`meditation:stages.s1`–`s10`) are dense: "metacognitive introspective awareness", "pacification of the senses", "śamatha". They are the canonical stage definitions of The Mind Illuminated, documented in `docs/modules/meditation-tmi.md`, and they live on a dedicated stages screen reached by deliberate secondary navigation from the meditation home — reference depth a reader chooses, not a first-run screen. Rewriting them would trade fidelity to a named system for a readability gain on a page nobody lands on by accident. **Kept.**
- **The ACT "HARD barriers" hint** (`act:committedAction.obstaclesHint`) is a 33-word sentence with four parentheticals — the densest non-legal string in the app. But its field label is "What might get in the way? (HARD barriers)" and the hint _is_ the acronym's expansion. It is doing the job the DBT acronyms were not. **Kept** — and the contrast is why finding 10 went the other way.
- **`policies` reading level.** 25 of the 28 reading-level outliers are in the privacy policy and terms. Legal text is dense because it is precise, and the mitigation is structural rather than editorial: #1767 added a plain-language summary at the top of the privacy policy, written for exactly this reader. Shortening the clauses beneath it would trade legal precision for a second summary. **Kept**, with finding 12 fixing the one sentence that was inside the summary itself.
- **Habits onboarding** (`habits:onboarding.welcome.*`) — "Small habits, remarkable results", "Improving by 1% a day compounds to ~37× better in a year". A strong self-improvement claim, but not a _medical_ one, and it is the module's cited source framing. Row 2 is about health outcomes. **Kept**, noted here because a future reviewer will flag it again.
- **Breathing mechanism descriptions** that survived finding 6 — "settles the nervous system and lowers physical arousal", "used to quickly reduce acute stress". These describe what an exercise does rather than promising a result, and the guard is keyed on the absolute verb for that reason. **Kept, and pinned** as must-stay-legal in `test/child-safety-copy.test.ts`.
- **`sleep:onboarding.whatToLog.notesBody`** lists "caffeine, alcohol, stress, late screens" as things that might explain a sleep pattern. A neutral mention of alcohol in a sleep-hygiene list is not glamorisation, and removing it would make the prompt worse for the adults who are most of the audience. **Kept** — and flagged to #1771 below, because the IARC questionnaire asks about substance references and the honest answer names it.

## Crisis guidance — verified, structurally unchanged

§4 requires this explicitly, so it is recorded rather than assumed.

- **Structure is untouched by this review.** One `Find A Helpline` registry action (`policies:crisis.actions.openFindAHelpline`), which resolves to youth lines per country. No hand-curated hotlines, no teen-specific section — as §4 requires.
- **Separation holds.** Crisis guidance is its own policy page with its own title and description, plus a persistent safety bar (`common:safety.*`) whose label is "Not for emergencies · Crisis resources". It is reachable from the self-help surfaces without being mixed into them.
- **Readability at thirteen.** The load-bearing sentence is _"If you might hurt yourself or someone else, or if anyone is in immediate danger, contact local emergency services now."_ Nineteen words, one clause of instruction, no term a thirteen-year-old would not have. The page states twice that the app is not monitored. **No change made, and none needed.**

## For the Play pass (#1771)

The IARC questionnaire re-run asks about sensitive content, and the screen's answer is unusually clean, which is worth stating rather than leaving to be rediscovered:

- Across all 4,140 strings, **the only references to self-harm or suicide are on the crisis page**, in the sentence quoted above, framed as an instruction to get help.
- **No violence, sexual content, gambling, or drug references anywhere.** The only substance reference in the app is the sleep-diary example noted above ("caffeine, alcohol, stress, late screens") — a neutral list of sleep disruptors, no depiction and no encouragement. ⚠️ **A second one shipped on 2026-09-05** ([#1980](https://github.com/Selftend/selftend/issues/1980)): the DBT emotion-regulation learn page carries one referral line — _stopping alcohol or a drug can be unsafe to do alone; a doctor is the right door_ — a safety instruction naming no substance use of the reader's own. **The questionnaire answer now names two references, not one**, and the IARC re-run is owed at the next store submission.
- Nothing user-generated is shared, so there is no user-to-user content surface to rate.

This is consistent with the live Everyone / PEGI 3 / USK 0 / IARC 3+ ratings recorded in `store/play-listing.md`, and supports the expectation in #1771 that the questionnaire re-run is a confirmation rather than a change. **Answer the live questions truthfully regardless of this note** — it records what the copy contains, not what the form asks.

## What holds this in place

`test/child-safety-copy.test.ts` carries the rules this review established, as a merge gate. **Twelve of its fourteen rules were red against live copy** before the fixes above; the two born green are preventive, and the file says at each of them why a rule with no live violation is worth keeping.

☠️ **Every rule is keyed on a claim shape, never on subject matter.** Selftend is a mental health app; it has to be able to say "anxiety", "depression", "panic", "crisis", and "not a cure", and the crisis page's whole job is to say some of them plainly. A rule keyed on the vocabulary would go red on the copy that protects people — the over-sweep failure that gets a guard deleted instead of fixed. ⚠️ The first draft of this file broke its own rule: the two "hierarchy" rules were unscoped, so they banned an ordinary English word across all 20 namespaces and would have failed an accessibility string about a heading hierarchy. They are now scoped to the exposure tool's own keys, which is where the finding actually was. Nine legitimate neighbours are pinned in the same file as must-stay-legal for that reason — including the crisis page's plainest sentence in both languages, and the two breathing descriptions that survived finding 6.

The **reading-level** row is deliberately not in the test. Sentence length is a signal, not a rule, and a word-count gate over translated legal text would fail on correct copy every time it was touched. That row lives in this document instead, and is re-judged by reading.

## Re-runs

### 2026-09-04 — `navigation`, for the "Your days" band ([#1906](https://github.com/Selftend/selftend/issues/1906))

Triggered by the PR-template row: a record-over-time surface is engagement-adjacent by construction, so it takes the gate whether or not its copy looks risky.

**Scope.** Six new strings in the `navigation:progress` block, `en` and `bg` — the card's title and description, the two empty bodies, the accessible summary, and a read-failure line. The rest of `navigation` was covered by the run above and is unchanged.

**Both passes, and the third screen.** Zero candidates on all six shapes: no clinical or treatment-protocol vocabulary, no Play-sensitive subject matter, no crisis vocabulary, no absolute effect verb — the strings make no claim about the person at all, which is the point of the surface. Reading level is well inside row 1: the longest is _"Days you record anything will appear here."_ at seven words, the longest Bulgarian nine, and no word reaches twelve letters in either language.

**Row 4 is the one worth stating.** The card reports the record and interprets none of it — no count, no run length, no ratio, no comparison — so there is no reading for a thirteen-year-old to get wrong, and nothing a clinician would recognise as a protocol measure. The one number the surface can render is a year on its axis, which is a date and not a figure.

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.** The strings also run clean against `restraint-copy`, `practice-copy`, `positioning-copy` and `child-safety-copy` in both locales.

### The DBT module, first pass — the namespace, the home and the learn pages (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

A new module is the PR-template trigger, and the spec (`docs/modules/dbt-mckay-skills-workbook.md` §9) was written inside five standing rules — self-harm and suicide named on the crisis page only, nothing branching on the person's state, no stored health fact beyond the record, _crisis_ kept to the crisis page's meaning, no medical question asked — so the run is over the strings, not the shape.

**Scope of this pass.** The whole `dbt` namespace as it stands — the module home, the four skill groups, the nine tool names, the learn primer and the four group learn pages — plus the two `navigation` keys the module rewrote (`sidebar.dbtA11y`, `today.modules.dbtSub`). **264 strings per locale, `en` and `bg`.** The module's remaining copy does not exist yet: the tool screens, the reminder strings (`copy.dbt.*`) and the `help` entries arrive with the slices that build them, and each is owed its own row here.

**Pass 1, the mechanical screen.** Zero candidates on four of the five shapes: no self-harm or suicide vocabulary (S1 holds — the substitute list, the reward-and-cost worksheets, the cold-pressor relief framing and the "threatening to hurt yourself" item are all cut, not softened); no diagnostic label (_eating feels out of control_ carries row 7.7 without naming a condition); no crisis vocabulary (S4 — the learn pages say _a hard moment_, _when feelings run high_, _distress_, and the live overview's "Getting through a crisis without making it worse" was reworded on the way in); and none of the module's own banned frames (_manipulat-_, _toxic_, _dysregulation_, _impulse control_, _assertiveness training_, _hierarchy_, _your therapist_, the DBT® mark). **Seventeen medical-vocabulary candidates**, all expected: the four technique cautions and the four professional referrals.

**Pass 2, the close read of those seventeen.** Every one tells; not one asks. No caution is a question, a gate, a checkbox or a stored acknowledgement, and the app nowhere asks whether a person has a heart or blood-pressure condition, is pregnant, or has checked with a doctor (S5). The referral lines name a door and no diagnosis: eating, substances, sleep, illness. The abuse-boundary line appears exactly twice, once on acceptance and once on interpersonal effectiveness, in the reworded form — _you do not have to fix a relationship in which you are being hurt_ — never as advice to leave.

**The third screen, absolute effect verbs.** Two hits, both the shape's inverse: _"None of them fixes the problem"_ refuses a claim, and _"the next script fixes it"_ is about a sentence you will write, not a health outcome. The physical skills describe rather than promise throughout — _can slow a racing heart_, _can do the same_, _works for some people_.

**Two findings, both fixed before landing.** The first draft of the emotion-regulation page carried **two physiological target numbers** — a sleep figure and a movement dose — which §9's claim 6 bans outright, and the sleep one was additionally wrong for this audience: the adult range is not the teen range, and a number to fall short of turns guidance into failure. Both were rewritten to describe rather than prescribe, keeping the talk test. The second was the word **_reward_** applied to something the person did; it was there only to be denied (_"not a reward for coping"_), which still puts the label on the page. Rewritten to _not something you earn by coping_.

**Reading level.** Twelve sentences of 503 reach 30 words in `en` (2.4%) and thirteen of 504 in `bg`, against 0% for `cbt` and 0.3% for `act` — higher than its siblings, and the reason is structural rather than careless: these are the module's reading pages, and they carry the paraphrased content of twelve chapters that no tool absorbs. Every one of them is plain-clause; **zero `en` sentences carry three or more words of twelve letters or more**, and one `bg` sentence does (the PLEASE expansion, where the acronym's five items are spelled out beside it). Accepted with that reasoning, and worth revisiting if a group page grows again.

**Acronyms.** STOP, PLEASE, DEAR MAN and FAST appear once each, on a learn page only, beside their expansion, never as the thing the reader is asked to act on (row 10). TIPP, ACCEPTS, IMPROVE and GIVE appear nowhere, and neither do the workbook's own mnemonics.

**Result: two findings, both fixed; nothing raised; one item accepted with reasoning (sentence length).** The strings also run clean against `positioning-copy`, `child-safety-copy`, `restraint-copy` and `practice-copy` in both locales, and the learn page carries the app's second substance reference as decided (see _For the Play pass_ above).

### The DBT module, second pass — the coping plan and Pause and choose (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

**Scope.** The first two tool surfaces and the menus behind them: the coping plan's card, its builder and its **58 app-written picks**, plus the four steps of Pause and choose. Roughly 150 strings per locale, `en` and `bg`, on top of the pass above.

**The picks are the reason this pass matters.** They are a menu a person in distress reads and acts on, and the workbook's own lists are _not_ what shipped: its hundred-item catalogue is written for an adult in crisis, and six of its entries are cut by ruling — the self-injury substitutes, the crisis-line item, the twelve-step chore, the massage aside, the higher-power menu, and anything whose point is _relief like_ something. Every line here is new copy, written for a thirteen-year-old, and every one is a plain thing to do in five words or so.

**Both passes.** The new strings raise exactly **two** candidates. One is `pause.steps.danger.body` — _"If anyone is in danger right now, that comes first - the crisis guidance is below."_ — which uses _crisis_ in the crisis page's own sense, pointing at the app's guidance rather than describing the person's distress, and is the module's single ruled hand-off (S4). The other is `picks.aSongIKnow`, which matched the medical screen on the words _by heart_. Nothing else: no self-harm or suicide vocabulary, no diagnostic label, no banned frame, no physiological target number, no management verb over an emotion, no return prescription.

**Two rules the surfaces carry rather than the copy.** Pause and choose **asks the person nothing** — step one names danger in a sentence identical for everyone, on every run, and no answer changes any later step (S2); and the coping-plan card **records nothing** — no "I used this", no last-used date, no count on a surface someone opens in a hard moment. Both are asserted in tests rather than left to review, because both are the kind of thing a later improvement adds without noticing the cost.

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.** Clean against `positioning-copy`, `child-safety-copy`, `restraint-copy` and `practice-copy` in both locales.

### The DBT module, third pass — the muscle-relaxation session (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

**Scope.** The module's one timed session: its intro, its two-line caution, seventeen muscle-group names across both variants, the run's instructions and the done screen. Roughly 40 strings per locale.

**Both passes.** No new candidates on any of the five shapes beyond the four already recorded. The caution is the block this pass exists for, and it is the wording #1985 ruled, unchanged: _"Tense gently, never to the point of pain, and let go quickly. Skip any area that hurts - back, neck, joints."_ and _"If you are pregnant or faint easily, keep it light or leave it."_ It **tells** — no question mark, no gate, no acknowledgement, nothing stored, and the app nowhere asks whether either line applies (S5). A test asserts all of that rather than leaving it to a reader.

**Row 4, and the one thing worth stating.** The done screen states the record — _"Muscle relaxation, 12 minutes"_ — and stops. No rating, no _how do you feel now_, nothing to fill in, so there is no reading of themselves for a thirteen-year-old to get wrong. And **Stop saves nothing and says so before it is pressed**, which matters more here than anywhere else in the module: this is the surface a person is most likely to leave halfway, and leaving must never be a gamble about what gets written down.

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.**

### The DBT module, fourth pass — the emotion record (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

**Scope.** The emotion record's form, list and detail: six part names, six hints, the cap line, the two validation messages and the delete confirmation. Roughly 40 strings per locale.

**Both passes.** No new candidates on any of the five shapes. The block worth reading closely is the hints, because they are where the workbook's clinical framing would have leaked in, and it did not: _Afterwards_ carries the reward-and-cost question as **hint copy** — _"what it gave you in the moment, and what it cost after"_ — rather than as a field with a label, which is how 7.13's self-destructive-behaviour worksheet is folded in without naming a behaviour or storing a label (S3). _Urges_ says plainly that an urge not acted on counts and is worth writing down, which is the book's own point kept and its self-harm vignette dropped (S1).

**Two rules the surface carries rather than the copy.** There is **no rating of any kind** — no intensity, no before-and-after, nothing that yields a number, because nothing in the app would read one and a number nobody reads is a score to be compared against; a test asserts the absence across the whole namespace, not just the screen. And the **cap line is a statement** — _If right now feels too heavy, this can wait_ — sitting under the crisis bar with no gate, no question and no branch behind it (S2).

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.**

### The DBT module, fifth pass — the wise mind check-in and the judgement record (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

**Scope.** Both mindfulness tools: the check-in's five beats and three answer labels, the judgement record's three fields, its valence labels and its day headings. Roughly 60 strings per locale.

**Both passes.** No new candidates on any of the five shapes. Two blocks were read closely because they are where a claim would have crept in.

**Wise mind.** The triad is described as a way of deciding, never as a faculty that knows things: the copy contains no _gut_, no _intuition_, no _enteric brain_ and no _the right answer_ — all four are asserted absent, because the book leans on the first three and the fourth is what a reader would supply for themselves. _Wise mind_ is named once as Marsha Linehan's term, on the intro beat, which is the acronym rule applied to a named concept.

**The judgement record.** The mark is _which way it leans_, not a verdict: a glowing judgement is recorded on the same record as a harsh one, and the hint says why. There is **no `where` field** — the book keeps one to spot patterns across places, and this module builds no pattern view, so a location column would be a health fact stored with nothing to read it (S3, decision 7). And there are **no counts** on either history: catching a judgement is the skill, and counting turns noticing into scoring, so a quieter week would read as a worse one.

**One thing the surface carries rather than the copy.** The check-in has **no outcome field and no later prompt**. The book logs whether the decision turned out well; a record with a slot waiting to be filled is a surface engineered to be reopened (ADR-0004), and its absence is asserted in both the screen and the namespace.

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.** The module's English also carries no instance of the American _judgment_ — checked over the whole namespace, since the two spellings render side by side with the CBT and ACT names.

### The DBT module, sixth pass — the opposite-action plan and the script (2026-09-05, [#1980](https://github.com/Selftend/selftend/issues/1980))

**Scope.** The module's last two tools: the plan's fields and its **eight per-emotion guidance lines**, and the script's three steps, four line labels, five push-back lines and its card. Roughly 90 strings per locale.

**The guidance lines are the block this pass exists for.** They are the book's 8.3 table, and they are the closest the module comes to telling a person what to do about a feeling. Every one is a **hint, not a rule**: the word _should_ appears in none of them, asserted by a test over all four families. They describe what a feeling usually pulls towards and what the opposite looks like, and the app never decides whether a particular feeling deserves changing — opening the tool is the person making that call, and no screen asks (S2). A pleasant feeling or a word the app has never seen resolves to **no line at all**, because guessing at guidance for an unknown feeling would be inventing advice about it.

**The script's own claims.** _Ask for what you want_ is framed as **ask, and keep the relationship** throughout: the copy contains no _win_, no _get your way_, no _make them_, no _threat_, no _toxic_ and no _rights_ as a claim. The self-care line is described as _something you do for you, not something you do to them_, and is written **last** so it cannot leak into the ask and turn a request into a threat. The _I feel_ hint carries 5.10's rule verbatim — _"I feel hurt", never "I feel that you…"_ — which is the one place the module teaches the difference between a feeling and a judgement wearing a feeling's clothes.

**Two rules the surfaces carry rather than the copy.** There is **no `who` field** and nothing structured about the other person: a named person's behaviour stored inside a health record is data about someone who never consented to it, and no shipped record has one. And **nothing asks** — an open plan is a plain row with no age, no _overdue_, no _3 waiting_ and no count of the closed ones; the difficulty rating orders the script list and nothing else reads it.

**Result: nothing to fix, nothing to raise, nothing accepted-with-reasoning.** With this pass the module's first-release copy is fully reviewed apart from the programme, which arrives next.

### Owed — the rest of the DBT module, at implementation (spec decided 2026-09-05, [#1994](https://github.com/Selftend/selftend/issues/1994))

A new module is the PR-template trigger. The spec (`docs/modules/dbt-mckay-skills-workbook.md` §9) was written inside five standing rules — self-harm and suicide named on the crisis page only, nothing branching on the person's state, no stored health fact beyond the record, _crisis_ kept to the crisis page's meaning, no medical question asked — so the re-run is over the strings, not the shape. **Scope when it runs:** the `dbt` namespace's remaining copy — the programme's phases, its card and its graduation — plus the `copy.dbt.*` reminder strings and the DBT `help` keys, `en` and `bg` (the home, the groups, the learn pages, every tool was covered by the six passes above); and specifically the per-emotion opposite-action hints, the sleep-hygiene list, the _You are allowed to…_ lines, the five push-back lines, the _what got in the way_ list and the four caution sentences, each of which the spec flags for the absolute-effect-verb and positioning gates. Two facts for that run are already known: the learn page carries the app's second substance reference (see _For the Play pass_ above), and the acronyms STOP, PLEASE, DEAR MAN and FAST appear once each, beside their expansion, on a learn page only (row 10).

## Re-running this

The trigger for a re-run is §4's cadence rule, and [#1769](https://github.com/Selftend/selftend/issues/1769) made it a checkbox: `.github/pull_request_template.md`, in the Product guardrails block, asks every PR whether it ships **a new module, or an engagement-adjacent feature.** `test/child-safety-cadence.test.ts` keeps that line in the checklist rather than in the notes, where it would read the same and gate nothing.

A re-run means repeating the two passes above over the namespaces the change touches, adding a row to the results table, and either fixing, raising, or accepting-with-reasoning. An accepted item from a previous run is not settled forever — the meditation stages were accepted because of where they sit, and moving that screen would reopen them.
