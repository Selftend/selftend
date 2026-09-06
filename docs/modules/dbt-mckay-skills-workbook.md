# DBT Module Spec - McKay, Wood & Brantley: the DBT skills workbook

**Source:** _The DBT Skills Workbook: Practical DBT Exercises for Learning Mindfulness, Interpersonal Effectiveness, Emotion Regulation, and Distress Tolerance_ - Matthew McKay, Jeffrey C. Wood & Jeffrey Brantley, **second edition** (New Harbinger, 2019; ISBN 978-1-68403-458-1). ⚠️ The publisher's full title spells the therapy's name out in American English; it is abbreviated here because the repository's spelling gate (`test/positioning-copy.test.ts`, scope `all`) reads this file. The Bulgarian edition (Изток-Запад, 2023, tr. Детелина Иванова) is the source of one ruled noun (§8.6).
**Secondary source:** _DBT Skills Training Manual_ - Marsha M. Linehan, second edition (Guilford, 2015; ISBN 978-1-4625-1699-5) - for the public skill vocabulary only (wise mind, radical acceptance, opposite action, the four skill groups, the acronyms named in §8.4). No content is taken from it.
**Licensing posture:** the spec **paraphrases**. It names skills as terms of art, describes the structure of the book's exercises in its own words, and reproduces no book text, checklist, worksheet or vignette. The workbook authors' own mnemonics and worksheet titles are not lifted (map decision 6). Both books are recorded in `docs/reference-log.md` § _Books_. A reviewer reads this document against that rule.
**Status:** Decided spec for the DBT module, assembled 2026-09-05 from wayfinder map [#1980](https://github.com/Selftend/selftend/issues/1980) - every decision below links to the ticket whose resolution comment holds its full reasoning. **Nothing here is built.** The companion design brief is `docs/design/1980-handoff/`; whatever Claude Design returns opens the implementation map, which cuts the tickets.
**Audience:** Developers and product contributors.

---

## 0. What this spec is, and how to read it

- **A decided spec, not a proposal.** Sixteen owner decisions were settled while charting the map (its body, § _Settled while charting_) and nine decision tickets ruled the rest with the owner ([#1985](https://github.com/Selftend/selftend/issues/1985) safety, [#1986](https://github.com/Selftend/selftend/issues/1986) distress tolerance, [#1987](https://github.com/Selftend/selftend/issues/1987) mindfulness, [#1988](https://github.com/Selftend/selftend/issues/1988) emotion regulation, [#1989](https://github.com/Selftend/selftend/issues/1989) interpersonal effectiveness, [#1990](https://github.com/Selftend/selftend/issues/1990) programme, [#1991](https://github.com/Selftend/selftend/issues/1991) home, routes and copy, [#1992](https://github.com/Selftend/selftend/issues/1992) data model and contract, [#1993](https://github.com/Selftend/selftend/issues/1993) design brief). Three research tickets fed them ([#1981](https://github.com/Selftend/selftend/issues/1981) overlap inventory, [#1982](https://github.com/Selftend/selftend/issues/1982) module contract, [#1983](https://github.com/Selftend/selftend/issues/1983) vocabulary); their findings live on throwaway `research/dbt-*` branches that are **never merged** (two spell the book's American title). Where this spec and a resolution comment disagree, the comment wins and this file has a defect.
- **Written against the code, not against the ACT spec.** Roughly a third of the tickets' premises turned out wrong when checked against `origin/dev`; the corrections are collected in Appendix A. In particular the ACT spec's §4 describes programme machinery that never shipped ([#2011](https://github.com/Selftend/selftend/issues/2011)) - §4 here cites the shipped shape.
- **The frame.** Every DBT screen is post-threshold ([#1755](https://github.com/Selftend/selftend/issues/1755)), so none carries Selftend's category sentence. The module's own sentence (§8.1) is the frame of every DBT surface. Every string names **DBT** and never Selftend's category, so the module holds under the frame `docs/positioning.md` carries today and under any later one.
- **Spelling.** House style is British and it is gated: _programme_, _behaviour_, _judgement_, _practising_, _recognising_. The tool is the **Judgement record** in every user-visible string; ticket titles that say "judgment" are the tracker's spelling and stay there. _Crisis_ and _emergency_ are reserved vocabulary (§9, rule S4).

---

## 1. Framework Overview

### What DBT is, in the module's words

Dialectical behaviour therapy was developed for moments when feelings run high and fast. It pairs **acceptance** with **change** in equal measure: skills for getting through a hard moment as it is, and skills for changing the patterns that keep bringing it back. The name comes from _dialectic_ - two things that seem opposed being true at once. Here the two are acceptance and change: this moment is as it is, and it can be different. Every skill in the module leans one way or the other, and the skills work together.

### The four skill groups

The book teaches four skill groups, each in a basic and an advanced chapter, and asks the reader to take them in this order. The module keeps the groups, their public names and the order; the same four are the programme's four phases (§4).

| #   | Skill group                     | What it is for, in one line                                              | The module's built tools                           |
| --- | ------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| 1   | **Distress tolerance**          | Getting through a hard moment without making it worse.                   | Coping plan · Pause and choose · Muscle relaxation |
| 2   | **Mindfulness**                 | Noticing what is here, without judgement.                                | Wise mind check-in · Judgement record              |
| 3   | **Emotion regulation**          | Reducing vulnerability, understanding emotions, changing painful ones.   | Emotion record · Opposite action                   |
| 4   | **Interpersonal effectiveness** | Asking, saying no, and keeping the relationship and self-respect intact. | Ask for what you want (the script)                 |

### The book's shape, and what the module keeps of it

The book's dominant device is **menu → plan → card**: checklists of app-written-style items the reader marks, assembled into plans, copied onto a card to be read when thinking is impaired. It keeps **logs** over days and weeks (a judgement record, an emotion record, a weekly regulator, a diary), runs **guided scripts** the reader is told to record in their own voice and play back, and repeats a **retrospective** template (describe a real past situation, imagine it again with the new skill). It assumes a high-severity reader and offers no crisis plan.

The module keeps: the menu-to-card device (the coping plan), the dated records with plain history (five record kinds), the timed guided practice (one session in the first slice, on the app's own engine, no self-recording), the four-phase order, and the book's plain-language skill names. It drops, by map decision: the tick grids, per-day counts, weekly regulator and diary (decision 7); self-recording and narration (decision 8); the workbook's own mnemonics (decision 6); the self-injury and reward/cost material (decision 5, §9); and any surface that branches on what the person entered (§9, rule S2).

### Core principles (tone and stance)

- **Acceptance and change, both.** No skill is presented as the fix; each leans one way and the pair is the point.
- **A use context, never a trait.** The module is _for when feelings run high_ (decision 15). It never names a condition, a diagnosis or a kind of person.
- **Practice, not insight.** Every tool is a thing to do; the learn pages carry the reading.
- **The person is the only reader of their records.** Nothing computes a score, a pattern or a suggestion from what they wrote (§9, rules S2 and S3; principle 12).
- **Fulfilling, and done** (ADR-0004). Every save states the record and stops. Nothing asks to be reopened.
- **Non-clinical tone.** Second person, warm, plain; reading level 13 (§10).

---

## 2. Tool Inventory & Gap Status

Every exercise in the book's twelve chapters, classed. **Legend:** **build** (a DBT-native surface, because the book's shape differs materially from anything shipped - decision 4) · **link** (send the person to a shipped surface as-is, often as an _Also try_ chip) · **learn-only** (paraphrased on the DBT learn page, no tool, no record) · **omit** (nowhere, not even the learn page) · **post-MVP** (specified in §3.6, unbuilt until §9's conditions hold). _Where_ names the surface that absorbs the row. Numbering follows the book study's per-chapter inventory (§0).

### The first-release slice

**Seven native tools and one timed session**, on nine routes' worth of surfaces (§7): the **coping plan** (builder + card), **Pause and choose** (a flow that records nothing), **muscle relaxation** (the timed session), the **wise mind check-in**, the **judgement record**, the **emotion record**, the **opposite-action plan**, and the **script** (_Ask for what you want_). Plus the module home, the learn primer and four group learn pages, and the programme card. Everything else in the table is a link, learn-only, second slice (§3.5) or post-MVP (§3.6).

### Introduction

| #   | Skill                | Class      | Where / note                                                       |
| --- | -------------------- | ---------- | ------------------------------------------------------------------ |
| I.1 | Commitment to change | learn-only | a prompt on the primer; _write it in your journal_ is a plain link |

### Chapter 1 - basic distress tolerance ([#1986](https://github.com/Selftend/selftend/issues/1986))

| #    | Skill                               | Class           | Where / note                                                                                          |
| ---- | ----------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------- |
| 1.1  | Self-destructive coping checklist   | **omit**        | the pain-vs-suffering idea stays as one learn sentence that names no behaviour (S1, S3)               |
| 1.2  | Cost table                          | **omit**        | -                                                                                                     |
| 1.3  | Four-beat interrupt                 | **build**       | **Pause and choose** (§3.1.2); the retrospective becomes a learn prompt without the self-harm field   |
| 1.4  | Acceptance statements               | build (partial) | the coping plan's _Remind myself_ section; the idea learn-only                                        |
| 1.5  | Acceptance practice on small things | learn-only      | -                                                                                                     |
| 1.6  | Substitutes for self-injury         | **omit**        | decision 5                                                                                            |
| 1.7  | Pleasurable activities menu         | build + link    | the _Distract_ families; the crisis-line item omitted; _plan something I enjoy_ pick → CBT Activities |
| 1.8  | Attending to someone else           | build + link    | _Distract · Someone else_; _Also try_ the gratitude kindness break                                    |
| 1.9  | Distract your thoughts              | build           | _Distract · Change the channel_; the suppression demonstration learn-only                             |
| 1.10 | Distract by leaving                 | build           | _Distract · Leave_; the reading learn-only                                                            |
| 1.11 | Tasks and chores                    | build           | _Distract · Make or fix something_; the twelve-step item omitted                                      |
| 1.12 | Counting                            | build + link    | _Distract · Count something_; the breath-count pick → breathing                                       |
| 1.13 | Distraction plan                    | **build**       | **the coping plan** (§3.1.1)                                                                          |
| 1.14 | Five-sense self-soothing            | build + link    | the _Soothe_ families; the abuse-survivor aside omitted; 5-4-3-2-1 as a related pick                  |
| 1.15 | Relaxation plan (home / away)       | build           | the _at home only_ mark on a fallback item; no second list                                            |

### Chapter 2 - advanced distress tolerance ([#1986](https://github.com/Selftend/selftend/issues/1986))

| #    | Skill                                        | Class                   | Where / note                                                                                                                                                     |
| ---- | -------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Safe place                                   | build, **second slice** | a timed session on the muscle-relaxation engine; learn-only in the first release; no stored place                                                                |
| 2.2  | Cue-word relaxation                          | build, **second slice** | a timed session; no stored cue word; no time-to-relax log (decision 7)                                                                                           |
| 2.3  | Valued living questionnaire                  | link                    | ACT values (importance vs alignment per domain; four domains, not ten)                                                                                           |
| 2.4  | Committed action                             | link                    | ACT committed action                                                                                                                                             |
| 2.5  | Rehearsing a valued action                   | **post-MVP**            | decision 11; §3.6                                                                                                                                                |
| 2.6  | Higher power (nine questions)                | **omit**                | one neutral learn line inside self-soothing (_some people draw strength from faith, from nature, from people they admire_); S3 - religious belief is Art. 9 data |
| 2.7  | Higher-power activities                      | **omit**                | folded into 2.6's line; no menu                                                                                                                                  |
| 2.8  | Time-out                                     | build (partial)         | ideas as own items in _Distract_; the parable learn-only                                                                                                         |
| 2.9  | Where are you now                            | link                    | ACT drop anchor; the four questions learn-only                                                                                                                   |
| 2.10 | Listening to now                             | link                    | grounding 5-4-3-2-1 (hearing) / ACT connection                                                                                                                   |
| 2.11 | Belly breathing, counted                     | link                    | breathing                                                                                                                                                        |
| 2.12 | Coping thoughts (menu → favourites → log)    | build + link            | _Remind myself_; the situation-to-thought worksheet → CBT thought record                                                                                         |
| 2.13 | Radical acceptance, eleven questions         | learn-only              | paraphrased with a neutral example; the abuse-boundary line beside it (§9); _write it in your journal_                                                           |
| 2.14 | Self-affirming statements                    | build (partial)         | _Remind myself_                                                                                                                                                  |
| 2.15 | Feeling-vs-threat check                      | **omit** as a tool      | one learn sentence - _a strong feeling is not proof of a big threat_; a rating-driven branch is what S2 forbids (owner call)                                     |
| 2.16 | New coping strategies (situations, old, new) | learn-only              | a prompt; **the plan stores no situations** - a list of the person's distressing situations is a health self-description with no reader (S3)                     |
| 2.17 | Fallback plan                                | **build**               | the coping plan's fallback list                                                                                                                                  |

### Chapter 3 - physiological skills ([#1985](https://github.com/Selftend/selftend/issues/1985), [#1986](https://github.com/Selftend/selftend/issues/1986))

| #   | Skill                     | Class                | Where / note                                                                                                                                                           |
| --- | ------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Eye movements             | **omit**             | an exposure protocol in miniature, solo, at 13, with no stop criteria; thin evidence base                                                                              |
| 3.2 | Diving response           | caution + link       | described **without the breath-hold**; → grounding's `cold-water` technique (which gained the caution under [#1996](https://github.com/Selftend/selftend/issues/1996)) |
| 3.3 | Cold pressor              | caution + link       | same target; the 2–4 minute protocol and the self-injury-relief framing omitted; four minutes appears only as the cap in the caution                                   |
| 3.4 | Interval exercise         | learn-only + caution | → habits; the talk test kept, the heart-rate formula omitted (a physiological target invites over-exertion at 13)                                                      |
| 3.5 | Slow breathing            | link + caution       | breathing; copy names `coherent-breathing` (six breaths a minute) and suggests a custom 4-in / 6-out pattern; the baseline count and step-down chart learn-only        |
| 3.6 | Muscle relaxation         | **build**            | **the first timed session** (§3.1.3)                                                                                                                                   |
| 3.7 | Using the physical skills | learn-only           | the two reflections as prompts; _add it to your plan_ = the route-bearing picks                                                                                        |

### Chapters 4–6 - mindfulness ([#1987](https://github.com/Selftend/selftend/issues/1987))

| #    | Skill                                 | Class                   | Where / note                                                                                                                                                                                 |
| ---- | ------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.0  | "Mindless" checklist                  | learn-only              | a prompt (_where do you run on autopilot?_); nothing stored                                                                                                                                  |
| 4.1  | Focus on a single minute              | learn-only              | described; no stopwatch                                                                                                                                                                      |
| 4.2  | Focus on a single object              | link + learn-only       | → the meditation timer as the clock; the instruction (_nothing that could hurt you, nothing loaded_) in the learn text                                                                       |
| 4.3  | Band of light                         | link                    | → the practices `body-scan` card; ACT connection's body scan for a dated log                                                                                                                 |
| 4.4  | Inner-outer experience                | build, **second slice** | a timed session on the muscle-relaxation engine                                                                                                                                              |
| 4.5  | Three minutes of thoughts             | learn-only              | a demonstration; nothing counted                                                                                                                                                             |
| 4.6  | Thought defusion                      | link                    | → ACT defusion + the practices `observing-thoughts` card; the imagery menu learn-only in the app's words                                                                                     |
| 4.7  | Describe your emotion                 | learn-only + link       | a journal prompt; the emotion-word pick → the check-in's list; **no portrait field joins the emotion record**                                                                                |
| 4.8  | Focus shifting                        | build, **second slice** | a timed session; nothing about the emotion stored                                                                                                                                            |
| 4.9  | Mindful breathing, full version       | link                    | → the meditation timer + `breath-awareness` card for an unpaced sit; the breathing tool for a paced one (the slow-breathing caution on the learn page)                                       |
| 4.10 | Mindful awareness of emotions         | link                    | → ACT expansion                                                                                                                                                                              |
| 5.1  | Wise mind concept                     | learn-only              | the triad, one paragraph; _wise mind_ named as Linehan's term                                                                                                                                |
| 5.2  | Wise-mind meditation                  | **build**               | the check-in's beats 1–2 (§3.2.1)                                                                                                                                                            |
| 5.3  | Wise-mind decisions                   | **build**               | the check-in's beats 3–4; the outcome log **omitted** (decision 7)                                                                                                                           |
| 5.4  | Negative judgements record            | **build**               | **the judgement record** (§3.2.2)                                                                                                                                                            |
| 5.5  | Beginner's-mind record                | **build**               | the judgement record's _Positive_ mark                                                                                                                                                       |
| 5.6  | Judgement defusion                    | link                    | _Unhook from it_ on a judgement row → ACT defusion                                                                                                                                           |
| 5.7  | Judgements versus the present moment  | learn-only              | grounding and defusion named as its halves                                                                                                                                                   |
| 5.8  | Self-compassion, the five blocks      | learn-only              | paraphrased; no belief field                                                                                                                                                                 |
| 5.9  | Self-compassion meditation            | link                    | → the practices `loving-kindness` card                                                                                                                                                       |
| 5.10 | Mindful "I" statements                | learn-only              | the rule (_"I feel…", never "I feel that you…"_) → the script builder's hint                                                                                                                 |
| 5.11 | Doing what's effective                | learn-only              | -                                                                                                                                                                                            |
| 5.12 | Being mindful in daily life           | learn-only              | remembering aids described; **no random bell** (a behavioural nudge); the one opt-in reminder is §4's                                                                                        |
| 5.13 | Daily regimen + doing tasks mindfully | link + learn-only       | → Routines (decision 7), every DBT tool steppable; the five steps in the app's words, the mnemonic not lifted                                                                                |
| 5.14 | Weekly mindfulness activities record  | **omit**                | decision 7                                                                                                                                                                                   |
| 5.15 | Five hindrances                       | learn-only              | _Also try_ → meditation (its obstacle tags overlap); _doubt_ goes to _someone who has practised longer_, not _a teacher_                                                                     |
| 6.1  | Loving-kindness for self and others   | link                    | → the `loving-kindness` card, with the one-line _strong feelings may surface, and that is normal_ note and the boundary line (_kindness to a difficult person is not permission to be hurt_) |
| 6.2  | Mindfulness of space                  | learn-only + link       | → the meditation timer                                                                                                                                                                       |
| 6.3  | Stillness and silence                 | learn-only + link       | → the meditation timer                                                                                                                                                                       |

### Chapters 7–8 - emotion regulation ([#1988](https://github.com/Selftend/selftend/issues/1988))

| #    | Skill                                         | Class                          | Where / note                                                                                                                                                            |
| ---- | --------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Recognising your emotions (six steps)         | **build**                      | **the emotion record** (§3.3.1); the cutting vignette omitted, the worked example neutral                                                                               |
| 7.2  | Emotional record (say it out loud)            | link + learn-only              | → the check-in; _say the feeling out loud_ is one learn tip; no said-aloud field                                                                                        |
| 7.3  | Emotion–thought–behaviour cycle; reward loop  | learn-only                     | the loop in one paragraph that names no behaviour                                                                                                                       |
| 7.4  | Self-injury rewards and costs                 | **omit**                       | decision 5                                                                                                                                                              |
| 7.5  | Manipulating others: rewards and costs        | **omit**                       | worksheet and the paragraph naming suicide threats; the word _manipulat-_ appears nowhere in DBT copy                                                                   |
| 7.6  | Food and mood                                 | learn-only + link              | one line in _What makes feelings harder to handle_; the dietician referral line; no self-care link (a per-day tick model, decision 7)                                   |
| 7.7  | Over/undereating                              | **omit** worksheet; learn-only | one referral line naming no diagnosis - _if eating feels out of control, that is one to take to a professional_                                                         |
| 7.8  | Drugs and alcohol                             | **omit** worksheet; learn-only | one referral line keeping the withdrawal fact - _stopping alcohol or a drug can be unsafe to do alone; a doctor is the right door_ (§9, the second substance reference) |
| 7.9  | Exercise                                      | learn-only + link              | → habits; the talk test kept, no target numbers                                                                                                                         |
| 7.10 | Sleep + hygiene guide                         | link + learn-only              | → the sleep **log** for tracking; the eleven practices in the app's words on the DBT learn page (the sleep tool has no learn surface)                                   |
| 7.11 | Illness and pain                              | learn-only                     | the referral line                                                                                                                                                       |
| 7.12 | Tension and stress                            | link                           | → breathing and the coping plan                                                                                                                                         |
| 7.13 | Recognising self-destructive behaviours       | **build (folded)**             | the emotion record's _Afterwards_ hint carries the reward-and-cost question; no separate field, no label                                                                |
| 7.14 | Observing without judging                     | learn-only                     | one paragraph on the dialectic                                                                                                                                          |
| 7.15 | Trigger thoughts checklist                    | learn-only + link              | the themes in the app's words, no checklist stored (S3); _work one through_ → CBT core beliefs                                                                          |
| 7.16 | Thought and emotion defusion (memory variant) | link                           | → ACT defusion; the memory variant learn-only                                                                                                                           |
| 7.17 | Coping thoughts (+ two)                       | build (in ch. 1–2)             | _mistakes are normal_ and _feelings are a wave_ join the _Remind myself_ picks                                                                                          |
| 7.18 | Big-picture evidence log                      | link                           | → CBT thought record, through the emotion record's _Look at the whole picture_ door; _filtering_ is already in the distortion list                                      |
| 7.19 | Pleasurable activities log                    | link                           | → CBT Activities (`pleasure`); _do one enjoyable thing a day_ is a learn line, never a DBT count                                                                        |
| 8.1  | Mindful of emotions without judgement         | link + **post-MVP**            | → ACT expansion now; the nine-beat session **Watching an emotion** belongs to the exposure section (§3.6)                                                               |
| 8.2a | Emotion log (one week)                        | link                           | → the check-in; the review is the person's own reading of their history, no derived view                                                                                |
| 8.2b | Emotion exposure                              | **post-MVP**                   | decision 11; §3.6                                                                                                                                                       |
| 8.3  | Opposite action                               | **build**                      | **the opposite-action plan** (§3.3.2); the guidance table as hint copy and learn copy                                                                                   |
| 8.4  | Behaviour analysis                            | build, **second slice**        | **Trace the chain** (§3.5); three learn prompts in the first release                                                                                                    |
| 8.5  | ABC problem solving                           | build, **second slice** + link | the chain tool's second half; the commitment → ACT committed action                                                                                                     |
| 8.6  | Weekly regulator                              | **omit**                       | decision 7; nothing per day, nothing ticked, the _positive events_ lines included                                                                                       |

### Chapters 9–10 - interpersonal effectiveness ([#1989](https://github.com/Selftend/selftend/issues/1989))

| #     | Skill                                       | Class                        | Where / note                                                                                                                                                                 |
| ----- | ------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1   | Mindful attention in conversation           | learn-only                   | the five check-in questions in the app's words                                                                                                                               |
| 9.2   | Compassion for others; other-compassion sit | link + learn-only            | → the `loving-kindness` card (its outward stages), with the _strong feelings may surface_ note; the _just like me_ line learn-only                                           |
| 9.3   | Passive vs aggressive behaviour             | learn-only                   | descriptions of behaviour, never a label for the person                                                                                                                      |
| 9.4   | Identify your style (scored quiz)           | **omit** score; learn-only   | S3, decision 15                                                                                                                                                              |
| 9.5   | I want–they want                            | learn-only                   | a prompt; no stored data about a named other                                                                                                                                 |
| 9.6   | The shoulds                                 | learn-only                   | the idea; no checklist stored                                                                                                                                                |
| 9.7   | Six key interpersonal skills                | learn-only                   | the learn page's opening paragraph                                                                                                                                           |
| 9.8   | Interpersonal values                        | learn-only + link            | the two questions as a journal prompt; _Also try_ → ACT values (`relationships`)                                                                                             |
| 9.9   | Eight aversive strategies                   | learn-only                   | **seven** - the self-harm-threat item omitted (S1); the three reflection questions as a journal prompt                                                                       |
| 9.10  | Passive habits                              | learn-only                   | -                                                                                                                                                                            |
| 9.11  | Conflict log                                | **omit** as record; link     | → the anger log where the conflict is anger; the debrief is the script's _how it went_                                                                                       |
| 9.12  | Red-flag feelings and behaviours            | learn-only + link            | the six warning signs in the app's words, the dissociation/violence framing omitted; _breathe when you notice them_ → breathing; not a plan section                          |
| 9.13  | Failure to identify needs                   | learn-only                   | one line pointing at the builder's first step                                                                                                                                |
| 9.14  | Risk assessment / risk planning             | **link**                     | → CBT worry (`/modules/cbt/worry/new`): fear, evidence both ways, probability, coping statement - the same form                                                              |
| 9.15  | Toxic relationships                         | learn-only                   | reworded: _you do not have to fix a relationship in which you are being hurt; a trusted adult or a helpline is the right door_, linking the builder for the unavoidable case |
| 9.16  | Four myths                                  | learn-only                   | each with its replacement thought in the app's words                                                                                                                         |
| 10.1  | Knowing what you want + legitimate rights   | **build**                    | step 1 of the builder and the _I want_ line; the rights as _You are allowed to…_ learn lines                                                                                 |
| 10.2  | Modulating intensity                        | learn-only                   | two questions; one hint line in step 3; **no ratings** - a summed pair that yields _push harder_ is the branch-on-state shape S2 forbids, and rates a third party            |
| 10.3  | Making a simple request                     | learn-only                   | the four parts; the daily drill and calendar omitted (decision 7)                                                                                                            |
| 10.4  | Assertiveness scripts                       | **build**                    | **the script** (§3.4) - the builder's step 2                                                                                                                                 |
| 10.5  | Assertive listening                         | learn-only                   | the six questions in the app's words                                                                                                                                         |
| 10.6  | Blocks to listening                         | learn-only                   | the ten habits; the week-log omitted                                                                                                                                         |
| 10.7  | Saying no                                   | learn-only                   | the two beats with neutral examples; a _no_ script uses the builder's four lines                                                                                             |
| 10.8  | Assertive situation hierarchy               | **build (as the list)**      | the script list ordered by `difficulty`, done scripts falling away; no separate entity, no CBT exposure link                                                                 |
| 10.9  | Coping with resistance (five skills)        | learn-only + on the card     | the _If they push back_ reference on the script card                                                                                                                         |
| 10.10 | Negotiation and the eight compromises       | learn-only                   | the mnemonic not lifted; the compromise menu paraphrased as _ways to meet halfway_                                                                                           |
| 10.11 | Communication effectiveness checklist       | **omit** as form; learn-only | the short _what got in the way_ list; the plan → journal                                                                                                                     |

### Chapters 11–12 - rehearsal and integration ([#1981](https://github.com/Selftend/selftend/issues/1981), [#1985](https://github.com/Selftend/selftend/issues/1985))

| #    | Skill                                | Class        | Where / note                                                                                                         |
| ---- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| 11.1 | Exposure-based cognitive rehearsal   | **post-MVP** | decision 11; §3.6                                                                                                    |
| 11.2 | Four worked rehearsals               | **post-MVP** | learn vignettes only if 11.1 ships, in the app's words                                                               |
| 11.3 | Plan ahead                           | **post-MVP** | §3.6                                                                                                                 |
| 12.1 | Daily practices (five slots, a time) | link         | → Routines - the person composes their own from the six steppable DBT tools (§6); no DBT-owned schedule (decision 7) |
| 12.2 | The DBT diary                        | **omit**     | decision 7                                                                                                           |

---

## 3. The Tools by Skill Group

Each built tool lists what it is, its fields in order, its prompts (the app's words, quoted where decided - see §8 for the string set), and the rules it obeys. Three module-wide rules from §9 apply everywhere: **nothing branches on the person's input** (S2); **Stop saves nothing and asks nothing** (every timed session and every multi-step flow); **fulfilling, and done** (every save states the record and stops).

### 3.1 Distress tolerance ([#1986](https://github.com/Selftend/selftend/issues/1986))

#### 3.1.1 The coping plan

**What it is:** one plan per person - the book's distraction plan, relaxation plan and fallback plan collapsed into one document with a **card view** to be read in a hard moment. `/modules/dbt/coping-plan` is the card when a plan exists and the builder's intro when none does; `/modules/dbt/coping-plan/edit` is the builder. Edited in place; `updatedAt` only; no versions, no history, no per-day anything.

**Three sections**, each a menu of app-written picks plus the person's own lines:

| Section           | Picks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Own items                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Distract**      | six families, ≈6 picks each: **Move** (walk, stretch, shower, dance to one song) · **Make or fix something** (tidy one surface, wash up, water the plants) · **Someone else** (message a friend, help with something, people-watch, look at a photo of someone you care about) · **Change the channel** (a show, a game, a song, a book, a happy memory, a place in your head) · **Count something** (breaths, blue things, backwards from 100 by sevens) · **Leave** (step outside, another room) | free text, 1–120 chars                 |
| **Soothe**        | five families, one per sense, ≈6 picks each: **Smell** · **See** · **Hear** · **Taste** · **Touch**                                                                                                                                                                                                                                                                                                                                                                                                | free text                              |
| **Remind myself** | ≈8 short app-written lines - the book's coping-thought, self-affirming and acceptance menus collapsed in the app's words: _this will pass_ · _I have got through hard moments before_ · _feeling it is not the same as acting on it_ · _mistakes are normal_ · _feelings are a wave_ …                                                                                                                                                                                                             | free text - the section's real content |

**Picks that are tools.** A pick may carry a route, so the card is actionable: _a paced breathing session_ → `/tools/breathing` · _5-4-3-2-1_ → grounding · _cool water on my wrists_ → grounding's `cold-water` (its intro carries the caution since #1996; the card shows none) · _tense and release_ → the muscle-relaxation session · _plan something I enjoy_ → CBT Activities · _an ambient sound_ → meditation · _write it down_ → journal. The chapter-3 skills reach the plan this way. ⚠️ **Every pick is new app-written copy** - no curated menu exists anywhere in the app to borrow - and every line runs the child-safety absolute-effect-verb gate and `positioning-copy` before it ships (§9). The pick set above is indicative; the implementation finalises it through the gates.

**Left out of the menus, by ruling:** the self-injury substitutes (1.6), the crisis-line item (1.7), the _massage for abuse survivors_ aside (1.14), the twelve-step-meeting chore (1.11), the higher-power activities (2.7), and any item whose point is _relief like_ something.

**The fallback list** - _If that doesn't work, next…_: **one ordered list of 3–6 items**, each drawn from the plan's picks or own items (an item must be on the plan to be on the list), reordered by drag (`react-native-sortables`, Home's arrange pattern). Each entry carries an optional **at home only** mark - the book's two contexts collapse into this one per-item flag. No second list. Removing an item from a section removes it from the list; the list re-numbers.

**Item model:** `{ id, section: distract | soothe | remind, kind: pick | own, pickKey?, text?, homeOnly: boolean, position }`, plus `fallback: [itemId…]` ordered, 3–6 long. Picks store a **registry key** (`src/features/dbt/coping-plan-registry.ts` resolves label + optional route), never the label, so copy can change under a saved plan and export stays readable (decision 14). Own lines are the person's words.

**The card:** fallback list first, large type, numbered as a sequence - _First…_ · _If that doesn't help…_ - with the home-only mark as a small glyph; then Distract and Soothe picks as compact rows (route-bearing ones tappable); then the Remind-myself lines; a small **Edit** last. **No `CrisisSupportBar`** (the ruled exception - a read-only surface opened _in_ a hard moment shows the plan, not a warning above it). **No completion button, no "I used this", no last-used date, no count.** Opening the card writes nothing.

**Offline:** the plan query is prefetched when the module home mounts, so the shipped persisted query cache (`src/lib/query-client.ts`, 24 h, native only) holds it. Stated in copy nowhere and in this spec once: _on the phone, the card works without a connection for a day after you last opened the module; on the web it needs a connection._ Web is memory-only by design (shared-computer refusal); no dedicated mirror. With nothing cached and no connection, the card shows the shipped error state with retry.

**Done:** saving lands on the card with one line - _Your plan is ready_ - and stops. The only fact the programme reads is _the plan was touched since the phase began_ (§4).

#### 3.1.2 Pause and choose

`/modules/dbt/pause`. **A four-step flow, Next/Back, that records nothing** - no row, no count, no routine step, no programme signal (a log of moments the person nearly lost it is a stored health fact with a per-use count, S3). The `CrisisSupportBar` renders on every step; **Stop** is visible on every step, ends the flow at once, returns to where the person came from; the back gesture is Stop.

| Step | Shape                                                                                                                                                                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Static:** _If anyone is in danger right now, that comes first - the crisis guidance is below._ Identical for every person, every run. The bar is the door; the sentence points at it. No question, no branch (S2).                           |
| 2    | _Stop and breathe_ - three slow breaths, described; an optional simple breathing visual. No timer, no required duration.                                                                                                                       |
| 3    | _Look_ - two prompts read, nothing typed: _What is actually happening? What am I about to do?_                                                                                                                                                 |
| 4    | _Pick one thing_ - the person's fallback list inline (its first three) and **Open my plan**; with no plan: **Build a plan** plus two app defaults (_a paced breathing session_ · _step outside_). Ends by opening the card or the picked tool. |

Linehan's public **STOP** is named once on the learn page beside its expansion; the workbook's own mnemonic is not lifted.

#### 3.1.3 Muscle relaxation - the first timed session

`/modules/dbt/sessions/muscle-relaxation`. **The one timed session in the first slice**, on the breathing engine's timing (per-step `durationSeconds`, background-safe countdown, auto-advance) and the grounding flow's step shape - and **departing from both on exit**.

- **Intro:** one line of what it is (_Tense and release, one muscle group at a time._); the **caution**, two sentences as `TechniqueCaution`, always visible, never acknowledged, never stored: _Tense gently, never to the point of pain, and let go quickly. Skip any area that hurts - back, neck, joints._ / _If you are pregnant or faint easily, keep it light or leave it._; the variant as a segmented control - **Full** (about 12 muscle groups, 12–15 minutes) · **Short** (five combined poses, about 5 minutes); **Start**; the bar.
- **Run:** the muscle group as the heading, the instruction beneath (tense for five seconds, then let go for twenty, twice per group; the copy says _gently_ only - the book's three tensing levels and cue phrase are not built), the countdown, **Back · Next · Pause**, and **Stop** - plain, always visible, saves nothing, no dialog, returns to the module home. The back gesture is Stop. The bar renders here too.
- **Record, on completion only:** `{ sessionSlug: "muscle-relaxation", variant: full | short, durationSeconds, completedAt, completedOffsetMinutes }` - a captured-day row in `dbt_sessions` (§5), **never `mindfulness_sessions`** (which tallies any unknown slug as breathing). No `stepsCompleted`: only a finished session is a record.
- **Done:** states the record - _Muscle relaxation, 14 minutes_ - one **Done** back to the module home. No rating, no _how do you feel_. The once-ever reminder offer (§4) is the shipped post-completion card.

☠️ **This is the opposite of the shipped early exit.** Grounding, breathing and meditation save a partial row on _Finish early_ and answer the back gesture with a finish-or-continue dialog (#928). DBT sessions record on completion only, Stop saves nothing, back gesture = Stop, no dialog - a departure the brief draws, not a reuse.

### 3.2 Mindfulness ([#1987](https://github.com/Selftend/selftend/issues/1987))

#### 3.2.1 The wise mind check-in

`/modules/dbt/wise-mind` (history) · `/new` · `/[id]`. **A guided pause that ends in a decision note** - the shipped precedent is ACT drop anchor (read, then log) plus a typed note. **No timer.** The bar and **Stop** on every beat; **no draft** - a half-asked question is not kept (a stated departure from the ACT forms' persisted drafts).

| Beat                   | Shape                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Intro                  | The triad in one line - _emotion mind decides by feeling, reasonable mind by facts, wise mind by both_ - then **Start**. Linehan's term expanded once, here. |
| 1 · Settle             | Read-only: put a hand on the middle of your body, below the ribs; let the attention rest there. No _gut_ or _enteric brain_ claim.                           |
| 2 · Breathe            | Read-only: a few slow breaths; the same optional visual Pause and choose uses. No timer.                                                                     |
| 3 · Bring the question | Typed, **required**: _What am I deciding?_ (1–200)                                                                                                           |
| 4 · Ask                | Three optional prompts (≤500 each): _Emotion mind says…_ · _Reason says…_ · _Wise mind says…_ - then **Save**                                                |
| Done                   | _Checked in: <question>_ - and stops                                                                                                                         |

**Record:** `{ question, emotionMind?, reason?, wiseMind?, createdAt, createdOffsetMinutes }`. **No outcome field and no later prompt** (a slot waiting to be filled is a surface engineered to be reopened). History: a plain dated list showing the question and the wise-mind line; no score, no _how often you chose wisely_. Routine-steppable (`wiseMind`).

#### 3.2.2 The judgement record

`/modules/dbt/judgements` · `/new` · `/[id]`. **A quick capture, three fields, one tap to save.** The bar on `/new` only.

| Field                   | Shape                                               | Note                                                                                                      |
| ----------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The judgement           | free text, 1–300, **required**                      | _What went through your mind_                                                                             |
| Mark                    | segmented **Negative · Positive**, default Negative | the beginner's-mind record folded in as the valence                                                       |
| What was actually there | free text, ≤300, optional                           | the plain description with the judgement taken out - the DBT _describe_ skill                             |
| When                    | captured automatically with the offset              | no _where_ - a location column exists in the book to spot patterns, and decision 7 builds no pattern view |

**Record:** `{ judgement, valence: negative | positive, restatement?, createdAt, createdOffsetMinutes }` (the ticket's `noticedAt` collapsed into `createdAt` - the record is not back-datable). History: grouped by day, the mark as a small glyph, **no counts** (never _you caught 12 this week_). The detail offers one door - **Unhook from it** → ACT defusion with the judgement seeded as the fused thought and `thoughtCategory: selfJudgment` preset through the ACT draft store (neither the ACT form nor the journal takes a query parameter). Routine-steppable (`judgement`). UI spelling **Judgement** everywhere; identifiers may keep either.

### 3.3 Emotion regulation ([#1988](https://github.com/Selftend/selftend/issues/1988))

#### 3.3.1 The emotion record

`/modules/dbt/emotions` · `/new` · `/[id]`. **A six-part column on the thought record's rail pattern** (`ProgressSegments` in rail mode, six captioned segments, fill in any order, validate at save) - because a person recalling an episode does not recall it in order. The bar on `/new`, and directly beneath it as plain copy the cap line: _If right now feels too heavy, this can wait_ - no gate, no question. **A persisted draft with the shipped discard dialog** (the thought-record pattern via the draft-store registry): this is a form written over minutes, so losing it to an interruption is the trap. Neither the wise mind's no-draft rule nor the sessions' Stop rule applies here.

| Part               | Field                                                      | Shape                                                                                                                                                                    | Hint (the app's words)                                                                                                       |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **What happened**  | `whatHappened`                                             | text 1–4000, **required**                                                                                                                                                | _Just the event - what you would have seen on a video._ No separate date field: the record's day is the day it was written.  |
| **Why I think so** | `meaning`                                                  | text ≤4000                                                                                                                                                               | _The meaning you gave it, not the facts._ The person's own attribution, uncorrected; the correction is the door below.       |
| **Feelings**       | `primaryEmotions` · `secondaryEmotions` · `bodySensations` | two pickers over the check-in's own editable list (customs inline), ids in `text[]`, **at least one primary required**; body sensations = the check-in's free-text chips | _First feeling_ · _Feelings about the feeling_ · _In the body_                                                               |
| **Urges**          | `urges`                                                    | text ≤4000                                                                                                                                                               | _What you wanted to do - an urge you did not act on counts, and is worth writing down._                                      |
| **What I did**     | `didAndSaid`                                               | text ≤4000                                                                                                                                                               | -                                                                                                                            |
| **Afterwards**     | `afterwards`                                               | text ≤4000                                                                                                                                                               | _What came of it - what it gave you in the moment, and what it cost after._ (7.13's reward question, folded in as hint copy) |

**No rating of any kind** (no intensity, no before/after - nothing reads one), **no portrait fields** (4.7's intensity, quality, action, sound belong to a once-only journal exercise). Save ends on _Recorded_ plus the first line of what happened, and stops. Routine-steppable (`emotionRecord`, created day).

**The detail's one door: _Look at the whole picture_** → the CBT thought record (`/modules/cbt/new`), seeded through the existing in-memory seed store (`src/stores/thought-record-seed-store.ts`, never a route parameter - a parameter would put the person's emotions in the web address bar) with the **built-in ids** of primary + secondary emotions (custom ids drop, the check-in's shipped rule) and `whatHappened` as the **situation** - the store gains a `situation` field, client-only. `push`, never `replace`.

#### 3.3.2 The opposite-action plan

`/modules/dbt/opposite-action` (list: open plans first, then done, grouped by day) · `/new` · `/[id]` (detail with **Done**). **An open record closed from its detail** - the Activities shape (planned, later completed from the detail). The bar on `/new` only.

| Field                  | Shape                                                    | Note                                                                                               |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| The feeling            | `emotion`, one id from the check-in's list, **required** | any emotion allowed - _is there reason to regulate_ is the person's call, made by opening the tool |
| What it pulls me to do | `pull`, text ≤500, **required**                          | hint keyed off the emotion's family (below)                                                        |
| The opposite           | `oppositeAction`, text 1–500, **required**               | hint: _the body too - posture, voice, face_, plus the family's line                                |
| How long I'll hold it  | `holdFor`, text ≤120, optional                           | _the whole conversation_, _ten minutes_; **no timer** - a timer implies a required duration        |
| Done                   | `doneAt` + `doneOffsetMinutes`, null while open          | set from the detail's **Done**, captured day                                                       |
| What shifted           | `whatShifted`, text ≤1000, optional                      | written at Done in one optional sheet - the book's _outcomes, filled in later_                     |

**Nothing asks.** No reminder, no _3 plans waiting_, no age or _overdue_ on an open plan, no count of done ones - an open plan is a plain row until the person closes or deletes it (ADR-0004). Done copy: _Done: <the opposite action>_, and stops. Routine-steppable (`oppositeAction`, list-first route, qualifying on the done day).

**Per-emotion guidance, as copy.** Four families keyed off the built-in ids, rendered as hints under _pull_ and _opposite_ once the feeling is picked, and in full on the learn page. Hints, never rules - no _should_:

| Family          | Built-in ids                        | The pull                           | The opposite                                                                                             |
| --------------- | ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Anger           | `angry`, `frustrated`, `irritated`  | _to attack, snap, prove the point_ | _soften your voice, step back, find the one thing on their side you can grant_                           |
| Fear            | `anxious`, `fearful`, `overwhelmed` | _to avoid, escape, put it off_     | _go towards it in one small step; stand tall; breathe slowly_                                            |
| Sadness         | `sad`, `lonely`, `hopeless`, `numb` | _to withdraw, shut down, stay in_  | _get moving; reach out to one person; do one small thing you can finish_                                 |
| Guilt and shame | `ashamed`, `guilty`                 | _to hide, or to punish yourself_   | _if it does not fit the facts, keep doing the thing, in the open; if it does, make it right and move on_ |

Pleasant built-ins and custom emotions: no hint. _Opposite action_ is named as Linehan's term once on the learn page.

### 3.4 Interpersonal effectiveness ([#1989](https://github.com/Selftend/selftend/issues/1989))

#### 3.4.1 The script - _Ask for what you want_

`/modules/dbt/scripts` (the list) · `/new` (the builder) · `/[id]` (the card). **One record absorbs every chapter 9–10 build.** A three-step `WizardScreen` with `useWizardDraft` and the shipped discard dialog - a wizard, not a column, because here the order _is_ the teaching: the facts constrain the feeling, the feeling points at the one ask, and the self-care line is written last so it never leaks into the ask. The bar on `/new` only.

| Step                            | Field               | Shape                                                           | Hint (the app's words)                                                                                                                          |
| ------------------------------- | ------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · What's going on**         | `situation`         | text 1–2000, **required**                                       | _The problem, in a line or two - what keeps happening._                                                                                         |
|                                 | `wantChanged`       | one of `moreOf` · `lessOf` · `stop` · `start`, optional         | _What would you want changed?_                                                                                                                  |
| **2 · The script**              | `iThink`            | text 1–1000, **required**                                       | _Just the facts - what happened, not why you think they did it._                                                                                |
|                                 | `emotion` + `iFeel` | one id from the check-in's list, optional · text ≤500, optional | _Your feeling, in your own words. "I feel hurt", never "I feel that you…" - that is a thought about them wearing a feeling's clothes._          |
|                                 | `iWant`             | text 1–1000, **required**                                       | _One thing, specific, something they could do this week. Not "be nicer" - "text me if you'll be late."_                                         |
|                                 | `selfCare`          | text ≤1000, optional                                            | _If the answer is no: what you will do for yourself. Something you do for you, not something you do to them - and you can keep it to yourself._ |
| **3 · Before the conversation** | `difficulty`        | 0–100 in steps of ten (`NumberRating`), optional                | _How hard does this one feel?_ Read by the list's order only; nothing triggers on it (S2).                                                      |
|                                 | `whenWhere`         | text ≤300, optional                                             | _When and where - a calm moment, not mid-argument._ Free text, never a date type: nothing can become overdue.                                   |
|                                 | (hint only)         | -                                                               | _How hard to push? Ask yourself how much you need this, and how much the relationship can take right now._ - 10.2 as one line, storing nothing. |

**The card (`/[id]`)** is the reopen-before-the-conversation surface: the four lines large, in order (the self-care line shown quietly - it is the person's reserve), **no bar**; beneath them, collapsed, **If they push back** - the five conflict skills in one line each, read-only: _grant the true part_ · _say the one sentence again, calmly_ · _ask what exactly bothers them_ · _agree with what is true, let the always and never go_ · _ask for time_. Then **Done** - the Activities shape: sets the done-day and opens one optional sheet, _How did it go?_ (`howItWent`, ≤1000). Nothing ever asks. Done copy: _Done: <the I want line>_, and stops.

**The list is the ladder.** Open scripts first, rated ones easiest-first by `difficulty`, unrated after them newest-first; done scripts below by done-day. No separate hierarchy, no rung numbers, no gate; the climb is visible because done ones fall away. A _no_ script is the same four lines with the ask being _I want to not…_; no kind toggle. **No CBT exposure link** - a session saved there would light CBT's `exposureLadder` milestone.

**Record:** `{ situation, wantChanged?, iThink, emotion?, iFeel?, iWant, selfCare?, difficulty?, whenWhere?, createdAt, createdOffsetMinutes, doneAt?, doneOffsetMinutes?, howItWent? }`. **No _who_ field** and nothing structured about another person (no shipped record has one). Routine-steppable (`script`, created day).

### 3.5 The second slice (specified, not first release)

Learn-only in the first release; named here so the second slice cuts from a spec rather than a memory. Each reuses a first-slice engine and adds nothing to the data model but a slug or a table already reserved.

| Tool                            | Engine                               | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Safe place** (2.1)            | the muscle-relaxation session engine | asks the person to bring a place to mind; **stores no place**; `session_slug: safe-place`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Cue-word relaxation** (2.2)   | same                                 | **stores no cue word**; no time-to-relax log; `cue-word`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Inner-outer** (4.4)           | same                                 | one-minute alternating blocks, caution-free intro; `inner-outer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Focus shifting** (4.8)        | same                                 | nothing about the emotion stored; `focus-shifting`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Trace the chain** (8.4 + 8.5) | a new form, `/modules/dbt/chain`     | the emotion; the link before (event · thought · feeling · did); up to three links, each _thought / feeling / did_; **the link I could change** (a pick over the links); then _other things I could do at that link_ (own items), _the one or two I'll try_, _when, where, exactly what_. The commitment's door is **ACT committed action** (a plain link). No link to CBT's procrastination tasks. Record shape for the slice: `{ emotion, before: {event?, thought?, feeling?, did?}, links: [{thought?, feeling?, did?}] (0–3), changeLink, alternatives[], chosen, commitment?, createdAt, createdOffsetMinutes }`. |

Reserved paths (§7) exist from day one so the slug shape is fixed; none is routed now.

### 3.6 Post-MVP: rehearsal and exposure (decision 11)

Specified, unbuilt, and unbuilt until **all four** of §9's conditions hold. Two sessions on the muscle-relaxation engine, plus rehearsal:

- **Watching an emotion** (8.1). ⚠️ Ruled into this section, not the second slice: its content is to bring a recent painful event to mind and rate its strength - exposure in miniature. Nine beats with one-minute pauses, ending on three minutes of plain breathing (≈12 min). Intro: the pick instruction - _bring to mind something that bothered you a bit, not the worst thing_ - above **Start**, the bar, **Stop** on every beat. Record on completion only: `{ sessionSlug: "watching-an-emotion", durationSeconds, completedAt, completedOffsetMinutes, note? }`. Nothing about the emotion is stored. Until built, 8.1 links ACT expansion.
- **Emotion exposure** (8.2b). Ten beats, ≈5 minutes, started when the feeling is present. The emotion-log prerequisite is the person's own check-in and emotion-record history, read by them - no dedicated log, no derived _your chronic emotions_ view. The target feeling is a choice made at the intro, not stored. The book's 0–10 _position on the wave_ may go in the optional note; it triggers nothing. Copy never says _stay with it_ or _until it changes_ as an instruction - the beat ends on the clock, and Stop is on screen.
- **Rehearsal while activated** (2.5, 11.1–11.3). The moderate-intensity cap is a **pick instruction** (_choose something that bothered you a bit, not the worst thing_), never a rating gate, because any 0–10 gate would have to _do_ something at 7, which S2 forbids. A rating may be recorded as the person's own note; it triggers nothing.

There is no condition under which any of these adds a rating gate, a trauma screen, a suicide-risk question, a stored target emotion, or a _who is your therapist_ field.

---

## 4. The Programme ([#1990](https://github.com/Selftend/selftend/issues/1990))

Four phases on the four skill-group keys, in the book's order, on the **shipped** CBT/ACT machinery - which is not the machinery the ACT spec's §4 describes (☠️ [#2011](https://github.com/Selftend/selftend/issues/2011)). What actually ships: every daily practice is a **same-day check on the viewed date with target 1**; nothing counts distinct days; the daily practice **never gates a phase** (`phaseReady` = milestones only); advancing is a **manual button** with an early-advance confirm; the last phase's button reads _Finish the programme_ and is what latches `completed_at`; replay resets to phase 1. Always optional; graduation latches once.

### The four phases

Phase keys reuse the four skill-group keys the home renders (`distressTolerance` · `mindfulness` · `emotionRegulation` · `interpersonal`); the phase's title/sub/description are the same strings as the home's group cards, read from one place. `since` = `phase_started_at ?? started_at`. **Every leg has target 1.**

| #   | Phase key           | Milestones (`countSince` from the phase start)                                                                                                                                                    | Daily practice (on the viewed day, captured `dayKey`)                                                                                                                                    |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `distressTolerance` | **`copingPlanReady`** - the plan singleton with `updatedAt ≥ since` → the builder · **`relaxOnce`** - one `dbt_sessions` row, slug `muscle-relaxation`, `completedAt ≥ since` → the session intro | **`relaxDaily`** - a muscle-relaxation session of either variant with `dayKey` = the day → the session intro                                                                             |
| 2   | `mindfulness`       | **`wiseMindOnce`** → `…/wise-mind/new` · **`judgementOnce`** → `…/judgements/new`                                                                                                                 | **`wiseMindOrJudgementDaily`** - either table's `dayKey` = the day → `…/wise-mind/new`                                                                                                   |
| 3   | `emotionRegulation` | **`emotionRecordOnce`** → `…/emotions/new` · **`oppositeActionDone`** - one plan with `doneAt ≥ since` (a plan's existence is never the fact) → the plan list                                     | **`emotionOrOppositeDaily`** - an emotion record's `dayKey` or a plan's `doneDayKey` = the day → `…/emotions/new`                                                                        |
| 4   | `interpersonal`     | **`scriptWrittenOnce`** → `…/scripts/new` · **`scriptDoneOnce`** - one script with `doneAt ≥ since` → the script list                                                                             | **`anyDbtRecordDaily`** - any DBT record or completed session with its `dayKey` (or `doneDayKey`) = the day, over every DBT table; the coping plan is not a daily fact → the module home |

**Rules the table obeys**

- **A DBT phase reads DBT tables only.** A breathing session, a grounding session, a meditation sit, a journal entry, an Activities row or a thought record appears on the phase as a link without a signal - even where a precedent exists (CBT's `calmingDaily` counts any meditation row; the owner still chose DBT-only).
- **Captured frame.** Every signal buckets by the row's own `dayKey` (`entryDayKey(occurredAt, offsetMinutes)`), never by re-deriving the day through the viewer's zone. The predicate is CBT's `didOnCapturedDay`, never ACT's viewer-local `didOnDate`.
- **The daily practice is a practice, not a gate:** target 1, on the viewed date, not counted, not remembered; a day without it changes nothing on the card and is never named (decision 7, principle 12).
- **Nothing is computed from a rating and nothing branches on the person's state** (S2). Milestones are existence facts; the crisis callout on the module home stays always-on regardless of phase.
- **Replay** resets to phase 1 with a fresh `started_at`, so `copingPlanReady` asks the person to revisit the plan (the values-profile / recovery-plan precedent).

### Machinery

- **New, mirroring ACT file for file:** `src/features/dbt/program-definition.ts` (`DBT_PROGRAM`, `DbtProgramSignalData` = the six DBT record arrays + `since` + `selectedDate`), `derive-dbt-program.ts` (`deriveDbtProgram` → `DbtProgramView` with `summaryStats` for the graduation lines), `use-dbt-program.ts` (the six preference columns; `startProgram` / `dismissProgramPrompt` / `showProgramPrompt` / `abandonProgram` / `replayProgram` / `advancePhase` / `dismissGraduation` with the shipped semantics), `src/components/app/dbt-program-card.tsx` = `<ProgramCard ns="dbt" helpKey="dbtProgram" />`. `HelpKey` gains `dbtProgram`. ☠️ `program-hero.tsx` does not exist; the shared, already-parameterised components are `program-card.tsx` (`ns` + `helpKey`) and `program-graduation.tsx` (`lines` + `namespace`). `derive-<module>-program.ts` and `use-<module>-program.ts` are per-module forks; a third fork is the shipped pattern, and generalising them is the implementation map's call.
- **State:** six `user_preferences` columns (§5.5); **no encrypted singleton** - `act_program_state` is ACT's onboarding state, which DBT has none of.
- **No server arm and no launcher leg.** `program_widget_task_status` keeps `if p_module not in ('cbt','act') then raise`; the launcher's `Record<"cbt" | "act">`, `getProgramWidgetTaskStatus(module: "cbt" | "act")` and the snapshot builder's map stay closed. The Home programme widget is gone ([#1977](https://github.com/Selftend/selftend/issues/1977)); the RPC's only client is the Android launcher, which decision 13 excludes. **Two copies, not three:** the client definition and the demo seed's read-back.
- **Placement:** the programme card sits on the module home under the header, above the four skill groups. Decision 12's "programme phase view" is the card's in-progress state, not a route.

### The invitation (the programme prompt)

Shown on the module home whenever the programme is **not started and not dismissed**; nowhere else - no Home surface, no modal, no notification, no post-record nudge. The × persists `dbt_program_prompt_dismissed_at`; a header action restores it. Strings under `dbt:program.*` (§8.5): title **Start the DBT programme**; description **A path in four phases - get through a hard moment, steady your attention, work with a feeling, and ask for what you want. Go at your own pace.**; **Start the programme**; `heroTitle` **DBT programme**; abandon **Leave the DBT programme?** / **Your saved records stay. You can start the programme again any time.**; the advance / ready / early-advance / manage / no-daily-practice strings copied from ACT's keys verbatim. Task labels: _Build your coping plan_ · _Do your first muscle relaxation_ · _Relax your muscles today_ · _Do your first wise mind check-in_ · _Write your first judgement record_ · _Check in with wise mind or catch a judgement today_ · _Write your first emotion record_ · _Finish an opposite-action plan_ · _Write an emotion record or finish a plan today_ · _Write your first script_ · _Follow through on a script_ · _Use any DBT skill today_.

### Graduation

**CBT's filtered shape** (☠️ ACT printed zero-count lines and _Keep using them._ until [#2013](https://github.com/Selftend/selftend/issues/2013) gave it the same filtered shape - all three modules now agree, so mirror CBT and do not resurrect ACT's old form). **You finished the DBT programme** · **Here's what you did:** · one line per phase **filtered to non-zero**, counted since the programme started - _{{count}} session(s) completed_ · _{{count}} wise mind check-in(s)_ · _{{count}} emotion record(s)_ · _{{count}} script(s) followed through_ - or, with every count zero, the shipped _You reached the end at your own pace. Your tools are here whenever you need them._ · **Done**. Dismissed → the shipped Replay row, _Replay the DBT programme_. **No closing prescription.** Nothing varies by date or visit. ⚠️ The graduation's counts are programme-window counts while the header's are lifetime - the same one-off gap the CBT and ACT homes show; shipped behaviour, not a defect.

### The one reminder (decision 13)

- **Preference:** `dbt_reminders_enabled` (default **false**), `dbt_reminder_hour`, `dbt_reminder_minute`, `dbt_reminder_timezone` on `user_preferences`; `last_dbt_reminder_key` on `web_push_subscriptions` **and** `device_push_tokens`. Registry entry `dbt` after `act`; `TARGET_CONFIGS.dbt` with `url: "/modules/dbt"`, `tag: "selftend-dbt-reminder"`; `ALLOWED_REMINDER_ROUTES` gains `/modules/dbt`; export lists the four columns.
- **What it reminds toward:** the module home. **One static string:** `copy.dbt.title` **DBT practice** · `copy.dbt.body` **A few minutes with one skill - relax your body, or write one record.** · `targets.dbt.label` **DBT**.
- **Suppression** (the shipped shape): skipped when any DBT table has a row today - `activitySources` any-of over sessions (`completed_at`), wise mind check-ins, judgements, emotion records (`created_at`), opposite-action plans and scripts (`created_at`, `done_at`). The coping plan is excluded: its `updated_at` moves on a reorder.
- **When it is offered:** once ever, by the shipped post-completion card (`requestReminderPrompt("dbt")`) after any DBT save, under the shipped eligibility; and always on Settings › Reminders. Off by default, time-of-day trigger only, one explicit choice.
- **What it never says:** _crisis_ or _emergency_; any self-harm or suicide word; a missed-day, come-back or loss line (nothing on any channel is triggered by non-use, and this copy may not imply it was); the person's state or a count; anything varying by date, phase or visit; the DBT® mark.

---

## 5. Core Data Model ([#1992](https://github.com/Selftend/selftend/issues/1992))

### 5.1 Seven tables, one template

All seven are **born encrypted** on `supabase/migrations/20260715_routines.sql:24-135` - the only non-retrofit encrypted table: a `dbt_<t>_data` base with `*_enc bytea` ciphertext, the inline 128 KiB cap per `_enc` column, a `(user_id, created_at desc)` index, a `set_<t>_updated_at` trigger, RLS `for all to authenticated using ((select auth.uid()) = user_id) with check (same)`, a same-named `security_invoker` view over `app.decrypt_text`, a `<t>_guard` per free-text field with the char caps below, `_ins/_upd/_del` INSTEAD OF triggers, and grants to `authenticated`. `user_id … on delete cascade` so purge needs no edit. One `test/integration/dbt-<t>-encryption.integration.test.ts` and one row in the hand-listed `test/integration/rls.integration.test.ts` per table.

**The plaintext rule, stated once:** an id, an enum, a number a list orders on, a timestamp, an offset or a boolean is a plaintext column with a `check`; every free-text field is `*_enc`. Nothing plaintext is ever the person's words. DBT takes the **capped** side of the split precedent (CBT and journal cap; ACT declares no cap).

| Table                                                         | Encrypted (`_enc`, cap)                                                                                                                                                                                                                                                                                                     | Plaintext                                                                                                                                                                                                                                                                                                                                                                                                                       | Dated by                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`dbt_coping_plans`** - one row per user, `unique (user_id)` | `plan` - the whole document `{ items: [{ id, section, kind, pickKey?, text?, homeOnly, position }], fallback: [itemId…] }` as jsonb-as-text (the `thought_records.nats_enc` shape). Guard: ≤60 items, own `text` 1–120, `fallback` ≤6 ids each present in `items`, `section ∈ distract\|soothe\|remind`, `kind ∈ pick\|own` | -                                                                                                                                                                                                                                                                                                                                                                                                                               | `updated_at` is the **touched** fact; the plan has no day of its own and never counts as a record         |
| **`dbt_sessions`** - record on completion only                | - (a nullable `note_enc` is **reserved** for the post-MVP sessions and added by that migration, not now)                                                                                                                                                                                                                    | `session_slug text check (in ('muscle-relaxation'))` - widened per slice (`safe-place`, `cue-word`, `inner-outer`, `focus-shifting`, `watching-an-emotion`, `emotion-exposure` are the reserved values) so a mis-tagged session is a loud error, not a breathing tally · `variant text check (in ('full','short'))` · `duration_seconds integer check (> 0)` · `completed_at timestamptz not null` · `completed_offset_minutes` | `completed_at`                                                                                            |
| **`dbt_wise_mind_checkins`**                                  | `question` (1–200, required) · `emotion_mind` · `reason` · `wise_mind` (each ≤500)                                                                                                                                                                                                                                          | -                                                                                                                                                                                                                                                                                                                                                                                                                               | `created_at`                                                                                              |
| **`dbt_judgements`**                                          | `judgement` (1–300, required) · `restatement` (≤300)                                                                                                                                                                                                                                                                        | `valence text not null check (in ('negative','positive'))`                                                                                                                                                                                                                                                                                                                                                                      | `created_at` (not back-datable, so no `noticed_at`)                                                       |
| **`dbt_emotion_records`**                                     | `what_happened` (1–4000, required) · `meaning` · `body_sensations` (the check-in's comma-joined chip string) · `urges` · `did_and_said` · `afterwards` (each ≤4000)                                                                                                                                                         | `primary_emotions text[] not null check (cardinality ≥ 1)` · `secondary_emotions text[] not null default '{}'` - ids on the check-in's id space incl. `custom_*`; a soft-removed custom id still resolves through `useEmotionDisplay`                                                                                                                                                                                           | `created_at`                                                                                              |
| **`dbt_opposite_action_plans`** - open until done             | `pull` (≤500) · `opposite_action` (1–500, required) · `hold_for` (≤120) · `what_shifted` (≤1000)                                                                                                                                                                                                                            | `emotion text not null` · `done_at timestamptz null` · `done_offset_minutes`                                                                                                                                                                                                                                                                                                                                                    | `created_at` for the list; **`done_at` is the record's day** for the programme, routines and Looking back |
| **`dbt_scripts`**                                             | `situation` (1–2000, required) · `i_think` · `i_feel` · `i_want` · `self_care` (each ≤1000) · `when_where` (≤300, text, never a date type) · `how_it_went` (≤1000)                                                                                                                                                          | `want_changed text null check (in ('moreOf','lessOf','stop','start'))` · `emotion text null` · `difficulty smallint null check (between 0 and 100)` - read by the list order only · `done_at timestamptz null` · `done_offset_minutes`                                                                                                                                                                                          | `created_at` (written) and `done_at` (done) - both phase-4 facts                                          |

Every table also carries the template's `id`, `user_id`, `created_at`, `updated_at`. **No `archived_at` on any table.** **No table for Pause and choose**, none for the learn pages. Emotion ids are plaintext id arrays by design (`mood_logs.emotions` is the house shape; a custom emotion's id is opaque and its name lives on the encrypted `emotion_preferences` row). Body sensations are free text and encrypted.

### 5.2 Day keys - the module-wide captured frame

Every dated column has a twin `<ts>_offset_minutes smallint null check (between -840 and 840)`, no default; null = not captured, falls back to the viewer's day, never a UTC claim. The view surfaces both; the repository resolves `dayKey` once via `entryDayKey`; surfaces group on it and never convert. Server side, any "done today" reads `coalesce(public.occurrence_day_key(ts, off) = p_day_key, window)`. `src/features/dbt/**` joins `CAPTURED_FRAME_FILES` in `eslint.config.js`. The ACT offset gate (`test/act-captured-offset-gate.test.ts`) filters `act_*` and stays untouched; DBT needs no twin because it graduates whole.

### 5.3 Editability and delete - ruled

- **Records** (wise mind, judgements, emotion records, plans, scripts): **no edit route, hard delete from the detail** on the ACT pattern (`useDeleteMutation`, `suppressGlobalErrorToast`). The only UPDATE paths in the module are the coping-plan save, a plan's `done_at`/`done_offset_minutes`/`what_shifted`, and a script's `done_at`/`done_offset_minutes`/`how_it_went` - each a single write from the detail.
- **Sessions:** append-only like meditation and mindfulness - no edit, no delete surface, no list route in the first slice. Account deletion is the delete.
- **Coping plan:** editable in place; a save replaces the document. Deleting the plan = deleting the row (the builder returns to its empty state).
- **No `archived_at` anywhere.** An archive with no restore UI (the thought record's and habits' `archived_at` have none) is retention without a purpose; S3 minimisation wins. Nothing filters `archived_at is null`, so stats, routine sources, `record_days` and the seed carry no filter to drift.

### 5.4 The coping plan - one row, one encrypted document

`dbt_coping_plans.plan_enc` holds the §3.1.1 item model verbatim, picks as registry keys. Export decrypts the document, so it reads as a JSON plan of keys and lines. Client validation is zod (`userText(120)` per own line, `fallback` 3–6 with `homeOnly` carried); the guard re-checks the caps. ☠️ A normalised child table was refused: a `routine_steps` write does not bump `routines.updated_at`, so a normalised plan could never have carried the programme's _touched_ fact without a trigger. Query key `dbtKeys.copingPlan`.

### 5.5 `user_preferences`, reminders, `ModuleKey`

- **Programme:** `dbt_program_started_at`, `dbt_program_completed_at`, `dbt_program_prompt_dismissed_at`, `dbt_program_phase_started_at`, `dbt_graduation_dismissed_at` (`timestamptz null`), `dbt_program_phase_index integer not null default 0`.
- **Reminder:** `dbt_reminders_enabled boolean not null default false`, `dbt_reminder_hour int not null default 19 check (0–23)`, `dbt_reminder_minute int not null default 0 check (0–59)`, `dbt_reminder_timezone varchar`; `last_dbt_reminder_key` on both push tables.
- **Client:** row type + `mapPreferences` + `PREFERENCE_COLUMNS` in `src/features/settings/repository.ts` (☠️ a key left out **silently never writes** - there is no completeness test), type + `defaultUserPreferences` in `src/features/modules/types.ts`.
- **`ModuleKey`:** add `"dbt"` to the union **and** to `VALID_MODULES` (omit it and `sanitizeEnabledModules` strips it on every read). Nothing writes it in this spec - there is no onboarding chip (decision 13) - it is there for the contract. `enabled_modules` gates nothing.

### 5.6 What is not stored

No medical answer or caution acknowledgement (S5, S3); no severity, intensity or distress rating on any first-slice record (the only numbers are `difficulty`, which orders a list, and `duration_seconds`); no per-day count, tick grid, diary card or weekly regulator; no `stepsCompleted` or partial session; no situations, cue word or safe place on the plan; no _where_ or count on a judgement; no date-of-incident on an emotion record; no _who_ on a script; no harmful-behaviour list, reward/cost, style score, belief or higher-power field; no outcome column on the wise mind check-in; no `dbt_onboarding_completed` column and no onboarding singleton; no `archived_at`; nothing the tool does not render back.

---

## 6. Module Contract ([#1982](https://github.com/Selftend/selftend/issues/1982), [#1992](https://github.com/Selftend/selftend/issues/1992))

Follows `tools.md` § _Module Contract_, written from the contract research's checklist rather than the ACT spec's prose (which omits `act_program_state` and names a component that does not exist).

- **`ModuleKey: "dbt"`** in the union and `VALID_MODULES`; the local shadow in `modules-screen.tsx` already has it. Default `enabledModules` stays `["cbt"]` and gates nothing.
- **i18n:** one namespace, **`dbt`** (the 21st), holding the home, the groups, the tools, the learn pages and `program.*`; `modules:dbt.*` is **deleted**. `help.json` gains `dbtProgram` + eight tool entries; `notifications.json` gains `copy.dbt.*` + `targets.dbt.label`; `navigation` keeps `sidebar.dbt`, gains `breadcrumb.*` keys, and moves `today.modules.dbtSub`. `en` and `bg` in the same change (locale parity and key coverage are gated; Bulgarian authoring is at implementation, §8.6). ⚠️ `no-unshipped-status-copy`'s corpus should add the `dbt` namespace; a Weblate component for the 21st namespace and `docs/stack.md`'s count ride the implementation.
- **Route group:** `/modules/dbt/*` (§7); every push through `usePushWithOrigin`.
- **RLS:** one policy per `_data` table in the sub-select form (the legacy ACT policies without `to authenticated` are not the template). ☠️ **No RLS census test exists** - the spec names the policy per table and the hand-listed suite gains seven rows.
- **Export:** redeclare `export_user_data()` from the newest declaration (`20260906000000_health_data_consent.sql`); one camelCase key per table reading the **view**, `order by created_at asc` (`completed_at` for sessions): `dbtCopingPlans`, `dbtSessions`, `dbtWiseMindCheckins`, `dbtJudgements`, `dbtEmotionRecords`, `dbtOppositeActionPlans`, `dbtScripts`; all ten preference columns by snake_case name in the `preferences` projection. `last_dbt_reminder_key` is covered by the `*.last_*_reminder_key*` withheld glob; **nothing else is withheld** (`supabase/README.md` gains no withheld row). `test/export-user-data-monotonic.test.ts` and the completeness suite then hold.
- **Purge:** nothing - every `dbt_*_data.user_id` cascades from `auth.users`; `purge_user_account()` is not redeclared.
- **Looking back:** all six dated tables join `record_days` - a migration redeclares it with six more `union` legs over the **base** tables (`dbt_sessions_data` by `completed_at`; the four `created_at` tables; `dbt_opposite_action_plans_data` by `done_at where done_at is not null`), each through `occurrence_day_key`. `test/record-days-sources.test.ts` moves from **ten to sixteen** deliberately; every DBT mutation hook invalidates `recordDaysKeys.all`. The coping plan is out - it has no day.
- **Routines - six steppable tools:** `SteppableToolId` gains `muscleRelaxation` (a `dbt_sessions` row with that slug on its completed day), `wiseMind`, `judgement`, `emotionRecord` (created day), `oppositeAction` (**done** day, list-first route), `script` (created day). Copies: `derive.ts` (type, `STEPPABLE_TOOL_IDS`, `RoutineToolRecords` slices with `dayKey`, `stepDoneOnDate`), `tool-routes.ts`, `use-routine-tool-records.ts`, the editor's grouping + `routines.json` `STEP_TOOL_GROUPS.dbt` in both locales, `starter-offer.ts` if DBT records should compose a starter. The seed's `ROUTINE_STEP_SOURCES` gains entries only if a seeded routine points at DBT - none does.
- **Counts and pages:** header stats on the `countRows` pattern (`head: true`, nothing decrypts): `records` = five head counts summed, `sessions` = one; an em dash until all six resolve. DBT gets its own `src/features/dbt/repository/helpers.ts` (`isMissingACTSchemaError` is ACT-named - copy it as `isMissingDbtSchemaError` or generalise, do not import ACT's). Five `list<T>Page` functions on `descendingCursorFilter("created_at")` + `id`, added to the pinned list in `test/history-pagination-contract.test.ts`; sessions have no list. Every `get<T>(id)` validates with `isValidUuid` first.
- **Sanitise once, on write:** the emotion record and the script are wizards → zod `userText(max)`; the rest sanitise with `sanitizeUserText` in the repository create/update; never on read. Wizard drafts: `createWizardDraftStore("dbt-emotion-record")`, `useWizardDraft` for the script; the wise mind check-in has **no** draft. User-triggered saves wrap in `useSingleFlight`. Schema/repository tests plus one component state test per user-facing flow.
- **Demo seed** (`scripts/seed-demo-data.mjs`, through the views with the service role): one coping plan (three sections, a 4-item fallback with one `homeOnly`), 3–4 muscle-relaxation sessions (one `short`), 3 wise mind check-ins, 4 judgements (both valences), 3 emotion records (one with a custom emotion id the seed also creates in `emotion_preferences`), 2 opposite-action plans (one done with `what_shifted`), 2 scripts (one done with `how_it_went`, both with a `difficulty`). Programme in **phase 2 (mindfulness)** with `DBT_PROGRAM_STARTED_DAY` / `DBT_PHASE_STARTED_DAY` constants, the six-column anchor write, and the read-back block that re-derives phase 1's legs with `capturedDayKey` and throws on disagreement - the second copy. **No band or margin machinery** (that exists only because ACT captures no offset). All seven views join `DEMO_SEED_TABLES` in the cascade guard. `supabase/seed.sql` (bob) carries no module rows and gains none. ⚠️ The seed's `policy_version_accepted` is stale against `policyVersion` (a seed defect outside this spec) - anyone capturing the demo account hits the consent modal first.
- **Reminders** default off, one target, non-punitive copy (§4). Settings can abandon/replay the programme.
- **Crisis surfaces:** `CrisisSupportCallout` on the module home; `CrisisSupportBar` on every entry screen and every learn page (§9). The callout's text names no module ([#1957](https://github.com/Selftend/selftend/issues/1957) rules it; not this spec's copy).

### ☠️ Contract points nothing gates - listed by name because nothing else will catch them

`VALID_MODULES`; `PREFERENCE_COLUMNS` (client) and the edge function's `PREFERENCE_COLUMNS` + two `select(...)` strings; `TARGETS` and `TARGET_CONFIGS.dbt` in `_shared/web-reminders.ts` (run `deno check --no-config` by hand - CI typechecks no edge function); `ALLOWED_REMINDER_ROUTES` (`/modules/dbt`); `copy.dbt` + `targets.dbt.label` in `notifications.json` (cast, runtime `undefined`); RLS presence; the inline ciphertext cap; the analytics spine (`scripts/analytics-engagement.sql`, `analytics-segment.sql`: a `dbt` module value + union legs over `dbt_*` tables, else the report silently omits the module); `docs/stack.md`'s namespace count; `docs/data-privacy-model.md`'s table count (~36 → +7); the `tools.md` helper bullets (`isValidUuid`, `useSingleFlight`, sanitise-once, wizard drafts, one state test per flow). Also: `escape-coverage`'s pinned route counts move (§7); `dbt-module-screen.test.tsx`'s overview assertions invert by design (keep the "promises no module" and "four skill groups" ones); `modules-screen` / `today-screen` fixtures move to _For when feelings run high_; `sidebar-nav`'s a11y string; the DBT pacing card must not reuse CBT's over-use phrasing (`test/over-use-copy.test.ts`).

---

## 7. Routes ([#1991](https://github.com/Selftend/selftend/issues/1991))

The route file moves from `app/(app)/modules/dbt.tsx` to `modules/dbt/index.tsx` (a directory, like `cbt/` and `act/`); `Stack.Screen name="modules/dbt"` becomes `modules/dbt/index`. `/modules/dbt`, its sidebar row, crumb and `Stack.Screen` already ship - the module **converts** the overview screen.

| Route                                             | Purpose                                                                                                               | Singular  | Crumb key                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------- |
| `/modules/dbt`                                    | Module home (§8.2)                                                                                                    | yes       | `sidebar.dbt` (exists)                         |
| `/modules/dbt/learn`                              | Primer: what DBT is, the dialectical line, pacing, four group doors                                                   | yes       | `breadcrumb.learn`                             |
| `/modules/dbt/learn/[group]`                      | One skill group's learn page; `group` ∈ `distress-tolerance` · `mindfulness` · `emotion-regulation` · `interpersonal` | -         | dynamic-segment resolver → the group name      |
| `/modules/dbt/coping-plan`                        | The card, or the builder's intro when no plan                                                                         | yes       | `breadcrumb.copingPlan`                        |
| `/modules/dbt/coping-plan/edit`                   | The builder                                                                                                           | -         | `breadcrumb.edit`                              |
| `/modules/dbt/pause`                              | Pause and choose - four steps, records nothing                                                                        | yes       | `breadcrumb.pause`                             |
| `/modules/dbt/sessions/muscle-relaxation`         | The timed session: intro + caution above Start; Stop saves nothing                                                    | yes       | `breadcrumb.muscleRelaxation`                  |
| `/modules/dbt/wise-mind` · `/new` · `/[id]`       | Wise mind check-ins                                                                                                   | list only | `breadcrumb.wiseMind` · `breadcrumb.new`       |
| `/modules/dbt/judgements` · `/new` · `/[id]`      | Judgement records                                                                                                     | list only | `breadcrumb.judgements` · `breadcrumb.new`     |
| `/modules/dbt/emotions` · `/new` · `/[id]`        | Emotion records                                                                                                       | list only | `breadcrumb.emotions` · `breadcrumb.new`       |
| `/modules/dbt/opposite-action` · `/new` · `/[id]` | Opposite-action plans; Done from the detail                                                                           | list only | `breadcrumb.oppositeAction` · `breadcrumb.new` |
| `/modules/dbt/scripts` · `/new` · `/[id]`         | Scripts; the list is the ladder; Done from the card                                                                   | list only | `breadcrumb.scripts` · `breadcrumb.new`        |

**Reserved for the second slice, not routed now:** `/modules/dbt/sessions/safe-place`, `/sessions/cue-word`, `/sessions/inner-outer`, `/sessions/focus-shifting`, `/modules/dbt/chain`. The `sessions/` directory exists from day one.

**Count:** 24 new routes (home moves, learn 5, coping plan 2, pause 1, session 1, five record tools × 3). `test/escape-coverage.test.ts` pins move **135 → 159** and **125 → 149** (☠️ re-read the pins on the day; they moved once already under this map). Every `new` and `[id]` is a plain screen, none a redirect stub. Singular where the row says so, declared the way `protected-layout.tsx` declares CBT's and ACT's.

**Also try rows** (ACT's shape, on the list screens): wise mind → meditation, breathing, journal, ACT defusion; judgements → ACT defusion, meditation; emotions → check-in, CBT thought record, ACT expansion, journal; opposite action → activities, habits, ACT committed action; scripts → anger log, CBT worry, ACT values, journal; **the coping-plan card carries none**. ⚠️ A chip into another module (`/modules/act/defusion`) is new - every shipped chip roots under `/tools`. Allowed as a stated departure: the row's Up-climb argument holds for a module route too, and the seed-store hand-offs already cross modules.

**Offline:** on the phone the coping-plan card works without a connection for a day after the module was last opened; on the web it needs a connection (§3.1.1).

---

## 8. Copy ([#1991](https://github.com/Selftend/selftend/issues/1991), [#1983](https://github.com/Selftend/selftend/issues/1983))

One namespace, **`dbt`**. Spelling gates: _judgement_, _programme_, _practising_, _recognising_, _behaviour_. The full string set is on #1991's resolution (§3 there); the load-bearing strings are here verbatim.

### 8.1 The module's own sentence, and the dialectical line

`dbt:home.description` (the tagline; a use context only, decision 15) - **the frame of every DBT surface**:

> Skills for when feelings run high - for getting through the moment without making it worse, and for changing what keeps bringing it back.

`dbt:home.groupsDescription` (under the h2 _The four skill groups_):

> Dialectical means holding two things at once: accepting this moment as it is, and working to change what you can. Each group leans one way, and the skills work together.

### 8.2 The module home (`/modules/dbt`)

On the shared shell (`ModuleHomeHeader` over `HOME_COLUMN`), top to bottom:

1. **Header** - h1 _Dialectical behaviour therapy_; tagline = the module's sentence; **two lifetime stats** `N records · N sessions` (_records_ = the five record tables' head counts summed, _sessions_ = completed sessions; an em dash until every count resolves, never a zero while loading); actions **bell** (target `dbt`) · **flag** (only while the programme is `not_started` and the invitation dismissed - restores it) · **info** → **pushes `/modules/dbt/learn`** (a page, not a modal; there is no DBT primer modal and no DBT onboarding).
2. **The programme card** or the graduation card (§4); nothing here when the invitation is dismissed and nothing started.
3. h2 **The four skill groups** + the dialectical line, then four `PillarCard`s in the book's order, badge = the group's ordinal 1–4 (never a colour), title = group name, kicker = group description, tool rows, a **Learn** row last, and under each card CBT's **Shared tools** row: DT → breathing, grounding, meditation; M → meditation, journal; ER → check-in, journal, sleep diary, habits; IE → journal.
4. **No recent-records feed** - six record kinds make any one feed favouritism; every list is one tap away; the programme card already surfaces state.
5. **`CrisisSupportCallout`** last.
6. The coping-plan prefetch rides this screen's mount (native only).

Gone from today's overview: the eyebrow, the _What DBT is_ card (its text moves to the primer), the sentence sending readers to CBT and ACT, and _crisis_ in the distress-tolerance line. ⚠️ The three module h1s disagree on casing today (DBT sentence case, CBT and ACT title case); DBT's is ruled sentence case, the siblings are an observation for the implementation map, not a redesign here.

### 8.3 Groups and tools - door and room say the same words

| key                 | name                        | desc                                                                     |
| ------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `distressTolerance` | Distress tolerance          | Getting through a hard moment without making it worse. _(S4 reword)_     |
| `mindfulness`       | Mindfulness                 | Noticing what is here, without judgement.                                |
| `emotionRegulation` | Emotion regulation          | Reducing vulnerability, understanding emotions, changing painful ones.   |
| `interpersonal`     | Interpersonal effectiveness | Asking, saying no, and keeping the relationship and self-respect intact. |

| key                | name                  | desc (home row)                                                                           | record noun |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------- | ----------- |
| `copingPlan`       | Coping plan           | Your own list of what helps in a hard moment - built once, there when you need it.        | plan (one)  |
| `pause`            | Pause and choose      | Four short steps between the urge and what you do next.                                   | none        |
| `muscleRelaxation` | Muscle relaxation     | A timed practice: tense and release, one muscle group at a time.                          | session     |
| `wiseMind`         | Wise mind check-in    | Ask one question three ways: what emotion says, what reason says, what both say together. | check-in    |
| `judgements`       | Judgement record      | Catch a judgement, mark which way it leans, and note what was actually there.             | judgement   |
| `emotions`         | Emotion record        | Walk one feeling from what happened to what came after.                                   | record      |
| `oppositeAction`   | Opposite action       | Plan the move a feeling would not choose, and note when you have done it.                 | plan        |
| `scripts`          | Ask for what you want | Write the four lines before the conversation, then have it.                               | script      |
| _(row)_ `learn`    | Learn                 | The ideas behind these skills, and the ones you read rather than record.                  | -           |

The home row, the list h1 and the breadcrumb share the name; the record noun lives in body copy (_New script_, _Your scripts_). Header stats: `home.statRecords_one/_other`, `home.statSessions_one/_other`, `home.statLoadingValue` "—". Navigation: `sidebar.dbt` _DBT_ (kept); `sidebar.dbtA11y` → _DBT module - Dialectical Behaviour Therapy_; `today.modules.dbtName` kept; **`today.modules.dbtSub` → _For when feelings run high_** (the modules tile and the favourites card). Help entries (what/how/why, no image): `dbtProgram` plus the eight tools; the _why_ states what the skill is for, never an outcome.

### 8.4 Vocabulary applied (decision 6)

- **Public terms used as plain words anywhere:** _wise mind_ (with _emotion mind_ / _reason_ expanded on the check-in itself), _radical acceptance_, _opposite action_, _distress tolerance_, _saying no_.
- **Acronym rule:** an acronym is named only on a learn page, in the one section that teaches its full content, beside its expansion, and never as the thing a person is asked to act on (child-safety review row 10). Applied: **STOP** (distress tolerance, beside Pause and choose), **PLEASE** (emotion regulation, _What makes feelings harder to handle_), **DEAR MAN** (interpersonal, beside the script - "a four-line cousin"), **FAST** (saying no and self-respect). Not named anywhere: TIPP, ACCEPTS, IMPROVE, GIVE. The workbook's own mnemonics and worksheet titles appear nowhere.
- **Banned in DBT copy, collected:** the ten never-claims of §9; _emergency_, _crisis plan_, _safety plan_; _manipulat-_; _passive_ / _aggressive_ as a label for a person; _win_, _get your way_, _make them_, _threat_, _toxic_, _rights_ as a claim; the management verb over an emotion (_manage / control your emotions_ - say _change a feeling's pull_, _turn a feeling down_); _dysregulation_, _impulse control_, _assertiveness training_, _hierarchy_ (use _ladder_), _trigger_ as a label; _vulnerability_ as a trait (the learn heading is _What makes feelings harder to handle_, a state); _chronic_ or _target emotion_ as stored facts; _reward_ as a label on anything the person did; _should_ in the opposite-action hints; _intuition_ or _gut_ as a claim about the check-in; _the right answer_; _meditation_ as the mindfulness phase's noun; any date- or visit-varying content and any _come back_ line; the DBT® mark.

### 8.5 The learn pages (owner: a primer + four group pages)

Every learn page opens with `CrisisSupportBar` (a deliberate departure from CBT's distortion guide and ACT's info modal, argued by the content) and is static text on the CBT learn page's card shape - nothing records, nothing varies.

**Primer `/modules/dbt/learn`** - h1 _What DBT is_: (1) _What it is_ - "DBT was developed for moments when feelings run high and fast. It pairs acceptance with change in equal measure - skills for getting through a hard moment as it is, and skills for changing the patterns that bring it back."; (2) _Why "dialectical"_ - the longer form of §8.1; (3) _How much, and how_ - the pacing card in DBT's voice (ADR-0004's over-use obligation): "These are skills for a moment, not a schedule. One record when a feeling shifts is the pace; more in a day is not more progress. If a skill leaves you feeling worse afterwards more often than not, or the coping plan has become the way you avoid every feeling rather than get through a hard one, that is worth bringing to a professional." ☠️ It must not reuse CBT's _challenging has become checking_ phrasing (`test/over-use-copy.test.ts`); (4) four doors, one per group, each with the group's description.

**Group pages `/modules/dbt/learn/[group]`** - h1 = the group name, sections as JSON arrays (`returnObjects`), inheriting every learn-only row of §2:

- **Distress tolerance:** radical acceptance with the abuse boundary and the reworded relationship line; the feeling-vs-threat sentence; the neutral higher-power line; the arousal-reduction techniques as links with their cautions (§9) - cold water → grounding's `cold-water`, paced breathing → the breathing tool, muscle relaxation → the session, interval exercise → habits; STOP beside Pause and choose; safe place and cue word as notes until their sessions ship.
- **Mindfulness:** the wise mind triad; the mindless checklist and single-minute prompts; three minutes of thoughts; the defusion imagery in the app's words; the five self-compassion blocks; the "I" statement conversions; doing what's effective; being mindful in daily life with no bell; doing tasks mindfully without the mnemonic; the five hindrances; space and stillness; the loving-kindness note and boundary line.
- **Emotion regulation:** _What makes feelings harder to handle_ (food, sleep, movement, illness and pain, tension) carrying the four one-line referrals (eating, substances with the withdrawal fact, sleep, illness - no diagnosis named) and the sleep-hygiene list in the app's words, PLEASE named here; the trigger-thought themes with no checklist; the per-emotion opposite-action guidance table in full.
- **Interpersonal effectiveness:** the six skills; the two behaviour descriptions (never a label for the person); seven aversive and two passive strategies; the six red flags; the four myths; the _You are allowed to…_ lines (to need things, to say no without a reason, to change your mind, to not fix everyone's problems, to sometimes disappoint someone); the two intensity questions; the simple request; assertive listening and the ten blocks; **Saying no** (its own section, FAST here); the five push-back skills; the compromise menu; the _what got in the way_ list (six lines: I judged instead of describing · I said "you" when I meant "I" · I asked for a mood, not a behaviour · I pushed too hard, or not at all · I stopped listening · I forgot to grant the true part); the abuse-boundary line; DEAR MAN beside the script.

The abuse-boundary line appears twice on the learn pages (acceptance and interpersonal), once each; the self-harm-threat item is omitted, so the S1 invariant holds across the module.

### 8.6 Bulgarian - the decisions (authoring is at implementation, decision 13)

- **Distress tolerance = _Устойчивост на стрес_** (owner call; the workbook's own Bulgarian edition's noun). Replaces the app's _Толерантност към стрес_ in the group name and the phase name. ⚠️ Four public sources use four different nouns; this is a decision, not a translation.
- Adjective stays **_диалектична_**; _осъзнатост_, _регулация на емоции_, _междуличностна ефективност_ stay.
- Named terms: _мъдър ум_, _радикално приемане_, _противоположно действие_ - all established, nothing invented.
- Abbreviation: **_ДПТ_ in body copy** (`bg/common.json` already writes _КПТ_); Latin _DBT_ only in the slots where the bg locale already uses Latin _CBT_ / _ACT_ (sidebar label, the favourites mark). A namespace must not deepen the split.
- Everything else is authored at implementation from #1983's candidates, reviewed.

---

## 9. Safety ([#1985](https://github.com/Selftend/selftend/issues/1985))

Map decision 5 rules: conservative; Selftend's 13+ universal floor rules the spec, not the book's severity. The book assumes a high-severity reader and offers no crisis plan; the module's crisis guidance stays the app's own, visibly separate (`AGENTS.md`).

### The five standing rules

| #      | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | **Self-harm and suicide are named on the crisis page only.** The DBT module - learn pages, tools, sessions, programme copy, empty states - adds **zero** mentions, in either locale. Content whose point is self-harm (the substitute list, the reward/cost worksheets, the cold-pressor relief framing, the retrospective's self-harm field, the "threatening to hurt yourself" item, every vignette involving cutting or an overdose) is cut, not softened. ⚠️ The child-safety review's Play answer rests on this invariant. |
| **S2** | **No DBT surface branches on the person's state.** No rating-triggered prompt, no "are you safe?", no interstitial that appears because of what was entered. The crisis affordance is always present and never conditional. The one hand-off that names danger is a **static step** (Pause and choose's first beat), identical for every user. ☠️ The ACT spec's "mood 1–2 → crisis prompt" was never built; no shipped surface branches on a rating, and this rule keeps it that way.                                          |
| **S3** | **DBT never stores a health fact about the person beyond what the tool's record is.** Never a ticked list of harmful behaviours, a substitute list, a reward/cost self-report, a style score, a "checked with a doctor" acknowledgement, a caution-seen flag, a belief or higher-power field (religious belief is Art. 9 data on top of health data). An emotion record stores emotions the way the check-in already does.                                                                                                      |
| **S4** | **The word _crisis_ keeps one meaning in the app** - the crisis page's. DBT copy says _a hard moment_, _when feelings run high_, _distress_; never _crisis skills_, _crisis survival_, _in a crisis_. _Emergency_ is reserved the same way (the callout's own line is "not emergency support"). The live overview's "Getting through a crisis" moves with the conversion.                                                                                                                                                       |
| **S5** | **The app never asks a medical question.** Caution copy tells; it does not ask, gate, or record.                                                                                                                                                                                                                                                                                                                                                                                                                                |

### Caution copy - what it says, where it renders

Inline on the **intro screen of a runnable session** (above Start; `TechniqueCaution`, two lines at most) and inline in the **learn page's physical-skills section**. Always visible, never a modal, never dismissed, never acknowledged, never stored. Reading level 13: _a heart or blood-pressure condition_, never _hypertension_.

| Technique                                          | The caution says                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold water (grounding's, linked; shipped by #1996) | Cool tap water, not ice on skin. Keep breathing normally. Stop if it hurts. Four minutes is the most; this exercise asks thirty seconds. Not while driving. If you have a heart or blood-pressure condition or are pregnant, check with a doctor first. |
| Slow breathing (breathing tool, linked)            | If you feel dizzy, faint, or your lips or fingers tingle, breathe normally - that is the signal to stop, not to push.                                                                                                                                   |
| Muscle relaxation (the DBT session)                | Tense gently, never to the point of pain, and let go quickly. Skip any area that hurts - back, neck, joints. If you are pregnant or faint easily, keep it light or leave it.                                                                            |
| Interval exercise (learn-only, links habits)       | Warm up, and stop if anything hurts. If you have a heart, breathing or joint problem, ask a doctor before you start.                                                                                                                                    |

**What the app never asks:** whether the person has any of those conditions, whether they checked with a doctor, whether they are pregnant.

### What replaces the therapist at the emotional-load points

- **The Stop affordance.** Every DBT timed session and every multi-step DBT flow has a plain, always-visible **Stop** that ends it at once, saves nothing, returns to where the person came from, and says nothing about it - no "are you sure", no "you were close", no partial record. It ships with the first slice.
- **No dangerous-urge branch, on purpose** (S2). The book's "notice the urge, do not act" keeps its wording as an instruction and gains nothing conditional.
- **Copy that names the door:** the primer's professional-help paragraph, the crisis bar on every entry screen, and Pause and choose's static first step. Three doors, none triggered.
- **The emotion record's cap line** - _If right now feels too heavy, this can wait_ - beside the bar, no gate, no question (the book's "wait if overwhelmingly sad" as copy).
- **The abuse-boundary line** wherever acceptance or kindness to a difficult person is taught: acceptance is not tolerating abuse; _if someone is hurting you, a trusted adult or a helpline is the right door_. The relationship line is reworded from _get away_ to _you do not have to fix a relationship in which you are being hurt_ - advice to leave, addressed to a 13-year-old about their family, is not the app's to give.
- **Referral lines**, one each, naming no diagnosis: eating (_if eating feels out of control, that is one to take to a professional_), substances (_stopping alcohol or a drug can be unsafe to do alone; a doctor is the right door_), sleep, illness. ⚠️ The substance line is the app's **second** substance reference after the sleep diary's; `docs/child-safety-review.md` § _For the Play pass_ is updated and the IARC re-run must name it.

### Where the crisis surfaces sit

The red `CrisisSupportCallout` on the **module home** (kept). The hairline `CrisisSupportBar` on **every entry screen** (each `/new`, the builder, every flow step, every session intro and run screen) and, as a departure from the sibling learn surfaces, on **every learn page** (they carry the abuse-boundary and referral lines). **May render without it:** list screens, a saved record's detail, the script card, the programme card, and **the coping-plan card view** - a read-only surface a person opens _in_ a hard moment shows the plan, not a warning above it.

### Post-MVP sections - the conditions to ever build them (§3.6)

All four: (1) the Stop has shipped and been used on the first slice's session; (2) the moderate-intensity cap is a **pick instruction**, never a rating gate; (3) a child-safety review re-run over the section's copy specifically, recorded before the build ticket is cut; (4) the first slice has been in real use long enough for the owner to judge whether it is wanted.

### Copy claims the spec never makes

Beyond `docs/positioning.md` § _Words never to use_ and `test/child-safety-copy.test.ts`: (1) never that a technique **stops an urge**, is a **safer alternative** to anything, or gives **relief like** anything; (2) never a **condition or trait as audience** - only _for when feelings run high_; (3) never a **diagnostic label** (BPD, bulimia, anorexia, PTSD, dissociation) - _eating feels out of control_ and _feeling unreal or far away_ are the app's words; (4) never **crisis** for ordinary distress; (5) never **your therapist / your DBT group** - _someone you trust_, _a professional_; (6) never a **physiological target number**; (7) never **"check with your doctor" as a question or a checkbox**; (8) never an outcome promised from a physical skill - _calms you down_, _resets your nervous system_; describe (_can settle_), do not promise; (9) never **"stay with it"** as an instruction without the Stop on screen; (10) never the workbook's American title in the spec, the brief or the app.

### Review obligations recorded by this spec

- **A child-safety review re-run is owed at implementation** (`docs/child-safety-review.md` § _Re-running this_; the PR-template line fires on a new module). The string set: the whole `dbt` namespace, `copy.dbt.*`, the DBT `navigation` and `help` keys - and specifically the coping-plan menu copy, the per-emotion hints, the sleep-hygiene list, the _You are allowed to_ lines, the push-back lines, the _what got in the way_ list and the reminder string, each of which also runs `positioning-copy`, `child-safety-copy`, `restraint-copy` and `practice-copy` in both locales.
- **The DPIA was re-read for this spec** (`docs/dpia-minors-assessment.md` §8 lists a new module as a trigger); the record is in that document. No new field class, processor, transfer or entry path; §1's data table gains its rows at implementation.
- **The DBT® mark** is an open question for the pre-launch legal review (`docs/licensing.md` § _Important caveat_). Never write _DBT-certified_.

---

## 10. Tone

Second person, warm, plain, at a reading level of thirteen. Describe, never promise (_can settle_, not _calms you down_). Name a behaviour, never a person (_passive behaviour_, never _you are passive_). Hints, never rules (no _should_). The app's words for the book's clinical ones: _a hard moment_, _when feelings run high_, _feeling unreal or far away_, _eating feels out of control_, _someone you trust_, _a professional_, _a doctor_. Never shame an abandoned session, an open plan, a deleted record or an abandoned programme - nothing in the module names a day without a record. British spelling, gated.

---

## 11. Non-Goals

- A DBT door in onboarding's concern list, Home shortcuts to DBT exercises, an Android launcher card, a DBT onboarding wizard or primer modal (map § _Out of scope_; decision 13).
- Self-recording or narration of guided scripts (decision 8). No audio narration exists anywhere in the app.
- The diary card, the weekly regulator, tick grids, per-day counts, streaks, a pattern view (decision 7, principle 12).
- A therapist, group or shared mode; a practitioner in the loop; AI anything.
- A rating-triggered crisis prompt, a trauma screen, a safety plan inside the module (S2; the crisis page is the app's).
- Sleep-hygiene guidance inside the sleep tool (the DBT learn page carries the list; a sleep-tool learn card is that tool's own ticket).
- Implementation tickets and Bulgarian copy authoring (the implementation map's).
- A DBT-owned cold-water session (decision 10 as narrowed by #1985: DBT links to grounding's).

---

## 12. Glossary

| Term               | Definition as used in this module                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DBT                | Dialectical behaviour therapy; spelled out in the h1, **DBT** after. Bulgarian body copy: _ДПТ_.                                                                            |
| Dialectical        | Holding two things at once - accepting this moment as it is, and working to change what you can.                                                                            |
| Skill group        | One of DBT's four (distress tolerance, mindfulness, emotion regulation, interpersonal effectiveness); the same four are the programme's phases, in the book's order.        |
| Distress tolerance | Getting through a hard moment without making it worse. Bulgarian: _Устойчивост на стрес_.                                                                                   |
| Coping plan        | One per person: three sections of picks and own lines plus an ordered fallback list, read as a card. Never a record with history; its only fact is _touched_.               |
| Pick               | An app-written coping-plan item stored by registry key; some carry a route into a shipped tool.                                                                             |
| Fallback list      | _If that doesn't work, next…_ - 3–6 plan items in order, each with an optional _at home only_ mark.                                                                         |
| Pause and choose   | A four-step flow between the urge and the next act; records nothing; ends on the plan.                                                                                      |
| Session (DBT)      | A timed, text-guided practice that records on completion only; **Stop** saves nothing and asks nothing - the opposite of the tools' finish-early.                           |
| Wise mind          | Deciding by feeling and by facts together; _emotion mind_ and _reason_ are its halves.                                                                                      |
| Wise mind check-in | A guided pause (settle, breathe, type the question, three prompts) recorded as one dated row; no timer, no outcome, no draft.                                               |
| Judgement record   | A judgement, a Negative/Positive mark, an optional plain restatement; captured automatically; no _where_, no counts. UI spelling _Judgement_.                               |
| Emotion record     | Six parts from what happened to what came after; the check-in's emotion list; no rating; one door into the CBT thought record.                                              |
| Opposite action    | The move a feeling would not choose. The plan is an open record closed from its detail with a done-day and an optional _what shifted_.                                      |
| Script             | The four lines - I think, I feel, I want, what I'll do for myself - written before a conversation and reopened as a card; _Ask for what you want_ is the door and the room. |
| Ladder             | The script list ordered easiest-first by the optional difficulty; not an entity. Never _hierarchy_.                                                                         |
| Learn page         | A static primer or group page; DBT is the only module with a learn route, and every learn page carries the crisis bar.                                                      |
| Caution            | Two sentences of plain text above Start, never a modal, never acknowledged, never stored.                                                                                   |
| Stop               | The always-visible way out of a session or flow; saves nothing, asks nothing; the back gesture is Stop.                                                                     |
| Programme (DBT)    | Four phases on the skill-group keys, every leg target 1, daily practice never gating, manual advance, graduation latched by the fourth phase's _Finish the programme_.      |
| Captured frame     | Every DBT row names its own civil day through `<ts>_offset_minutes`; day keys are read from the row, never re-derived through the viewer's zone.                            |

---

## 13. Open Questions

| Question                                                                                                                                                        | Owner / when                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The "DBT®" mark (a registered mark in the US) - may the module use the abbreviation in store copy and the h1 as it does for CBT and ACT? Never _DBT-certified_. | Pre-launch legal review (`docs/licensing.md` § _Important caveat_)                                            |
| The final coping-plan pick set (≈66 lines) and the Remind-myself lines - written through the child-safety and positioning gates.                                | The implementation ticket for the coping plan                                                                 |
| The six rail captions at 360dp on the emotion record form (the thought record's are one word each; these run to three).                                         | The design brief expects the designer to answer it; the implementation map checks the answer against the code |
| Whether `derive-<module>-program.ts` / `use-<module>-program.ts` generalise across three modules or fork a third time.                                          | The implementation map                                                                                        |
| Whether DBT records compose a routine starter (`starter-offer.ts`).                                                                                             | The implementation map                                                                                        |
| The second slice (§3.5) and the post-MVP sections (§3.6) - when, if ever.                                                                                       | After real use of the first slice; §9's four conditions for the post-MVP sections                             |
| The sibling module h1 casing (CBT and ACT title case vs DBT sentence case).                                                                                     | The implementation map, as an observation - not a redesign                                                    |

---

## 14. Acceptance Bar

This spec is ready to drive the design brief and the implementation map when:

- Every skill in the book's twelve chapters is classed build / link / learn-only / omit / post-MVP with the surface that absorbs it, and the first-release slice is named (§2). ✅
- Every first-slice tool has its fields, caps, prompts, states and rules (§3), and the second slice and post-MVP sections are specified without being scheduled (§3.5, §3.6). ✅
- The programme is specified against the **shipped** machinery - phases, legs, signals, targets, captured frame, invitation, graduation, reminder - with no server arm and no launcher leg (§4). ✅
- The data model covers seven born-encrypted tables with a stated plaintext rule, day keys, delete semantics, ten preference columns, export, purge, `record_days`, routines and the seed (§5, §6), and the ungated contract points are listed by name. ✅
- Safety rules S1–S5, the caution copy, the Stop, the crisis-surface placement and the never-claims are written, and the review obligations (child-safety re-run, DPIA re-read, the ® question) are recorded in their documents (§9). ✅
- Routes, escape pins, the string set, the vocabulary rule, the learn-page plan and the Bulgarian nouns are decided (§7, §8). ✅

The module is ready to **ship** (the implementation map's bar, restated so it is not lost) when: the seven tables persist under RLS with their encryption and RLS integration rows; `DBT_PROGRAM`, `deriveDbtProgram` and `useDbtProgram` pass their tests (state, phase derivation, graduation latch, replay); the shared programme card and graduation render for DBT; every route is escape-covered and origin-gated; the `dbt` namespace has parity in `en` and `bg` and the child-safety re-run is recorded; reminders stay off by default; the demo seed's read-back agrees with its stored phase; and the ten never-claims and the S1 invariant hold across all strings.

---

## Appendix A - premises corrected against the code while deciding

Collected so the implementation map does not re-derive them. Each is on the map's body under § _Charting facts falsified by the frontier_ with its ticket.

- The breathing "presets" `478 / box / coherent / relaxing` are the custom editor's quick-fill chips; the runnable built-ins are `box-breathing`, `4-7-8`, `coherent-breathing`; `relaxing` is 6-in/2-out, the opposite of the book's rule.
- Grounding's `cold-water` is a **step flow with no clock** ("30 seconds" is copy) that records a `mindfulness_sessions` row; it lacked caution copy until #1996. Grounding has no intro screen; the caution rides step 0 and the onboarding row.
- `mindfulness_sessions` tallies any non-grounding slug as **breathing** - DBT sessions need their own table.
- The meditation sit stamps a TMI stage on every row; "unguided sitting" is true of the clock only. ACT drop anchor is the shipped read-then-log pause.
- Neither the ACT defusion form nor `journal/new` takes a query parameter; hand-offs go through draft/seed stores.
- The check-in → thought-record hand-off is an in-memory seed store carrying built-in emotion ids only.
- "Outcome later = an edit of the same record" is not a shipped shape; the later-fill is Activities' planned → completed from the detail.
- The ACT spec's §4 daily-practice machinery (4/3/3/4 distinct days, `distinctDays`, `DAILY_PRACTICE_TARGET`, `program-hero`, three flags) **never shipped**; #2011 rewrote §4 and §6 to describe the shipped shape, so the ACT spec is now safe to mirror. `act_program_state` is ACT's onboarding state; the Home programme widget was deleted (#1977).
- ACT's graduation printed zero lines and _Keep using them._; #2013 gave it CBT's filtered shape, so CBT's shape is now what every module ships.
- The escape-coverage pins were 135 / 125 when #1991 ruled, not the 136 / 126 an earlier ticket recorded.
- `today.modules.dbtDescription` does not exist; the live DBT strings are `modules:dbt.*` and four `navigation` keys.
- ACT has no learn route (its primer is the replayable info modal); CBT's `learn.tsx` is the distortion guide.
- `record_days` reads ten sources today, not eight; a child-table write does not touch its parent's `updated_at`; no shipped session row can be deleted; `archived_at` has no restore UI anywhere.
- The design-handoff precedent's "phone floor 390" is wrong: `docs/accessibility.md` rules **360dp**.
- The demo seed's `policy_version_accepted` is stale against `policyVersion`; the account re-gates after every reset.
