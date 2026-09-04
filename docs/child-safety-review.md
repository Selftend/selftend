# Child-safety content review

The module-by-module content review [spec #227](https://github.com/Selftend/selftend/issues/227) §4 requires before the Google Play audience flip, run for [#1770](https://github.com/Selftend/selftend/issues/1770).

**Run: 2026-09-04**, against `dev` at `efd79092` — the commit that made the 13+ per-country floor published product truth ([#1767](https://github.com/Selftend/selftend/issues/1767)). That is the reason this review happens now: until then the eligibility copy said 18 and over, and there was no thirteen-year-old to review for.

This file is the record. It exists so the next reviewer starts from a decision rather than re-deriving one, and so an accepted item is visibly accepted rather than merely unnoticed.

## Scope

**Every user-visible string in the app**: all 20 i18n namespaces, `en` and `bg` — 4,140 English strings, ~156,000 characters. Namespaces are the unit because AGENTS.md § i18n conventions requires every user-visible string to come from a translation file, so covering all 20 covers every module.

⚠️ **That coverage rests on a convention, not on a guard, and the difference matters.** Nothing in the suite detects a hardcoded user-visible literal. `test/i18n-key-coverage.test.ts` asserts that literal `t("…")` keys _resolve in `en`_ — it catches a moved or missing key, and its own header records that template-literal keys are invisible to it. So a string hardcoded into a component would be invisible to this review as well. It is a real hole in the method, not a theoretical one.

Out of scope, and owned elsewhere:

- Store listing and Play declarations — [#1771](https://github.com/Selftend/selftend/issues/1771), the owner's rollout pass.
- The DPIA / minors' assessment — [#1768](https://github.com/Selftend/selftend/issues/1768).
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
| DBT overview                                                                                                                                              | `modules`                   | **Fixed**            | Pass                   | Pass                | Pass      | Pass     |
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
- **No violence, sexual content, gambling, or drug references anywhere.** The only substance reference in the app is the sleep-diary example noted above ("caffeine, alcohol, stress, late screens") — a neutral list of sleep disruptors, no depiction and no encouragement.
- Nothing user-generated is shared, so there is no user-to-user content surface to rate.

This is consistent with the live Everyone / PEGI 3 / USK 0 / IARC 3+ ratings recorded in `store/play-listing.md`, and supports the expectation in #1771 that the questionnaire re-run is a confirmation rather than a change. **Answer the live questions truthfully regardless of this note** — it records what the copy contains, not what the form asks.

## What holds this in place

`test/child-safety-copy.test.ts` carries the rules this review established, as a merge gate. **Twelve of its fourteen rules were red against live copy** before the fixes above; the two born green are preventive, and the file says at each of them why a rule with no live violation is worth keeping.

☠️ **Every rule is keyed on a claim shape, never on subject matter.** Selftend is a mental health app; it has to be able to say "anxiety", "depression", "panic", "crisis", and "not a cure", and the crisis page's whole job is to say some of them plainly. A rule keyed on the vocabulary would go red on the copy that protects people — the over-sweep failure that gets a guard deleted instead of fixed. ⚠️ The first draft of this file broke its own rule: the two "hierarchy" rules were unscoped, so they banned an ordinary English word across all 20 namespaces and would have failed an accessibility string about a heading hierarchy. They are now scoped to the exposure tool's own keys, which is where the finding actually was. Nine legitimate neighbours are pinned in the same file as must-stay-legal for that reason — including the crisis page's plainest sentence in both languages, and the two breathing descriptions that survived finding 6.

The **reading-level** row is deliberately not in the test. Sentence length is a signal, not a rule, and a word-count gate over translated legal text would fail on correct copy every time it was touched. That row lives in this document instead, and is re-judged by reading.

## Re-running this

The trigger for a re-run is §4's cadence rule, which [#1769](https://github.com/Selftend/selftend/issues/1769) turns into a PR-template gate line: **a new module, or an engagement-adjacent feature.**

A re-run means repeating the two passes above over the namespaces the change touches, adding a row to the results table, and either fixing, raising, or accepting-with-reasoning. An accepted item from a previous run is not settled forever — the meditation stages were accepted because of where they sit, and moving that screen would reopen them.
