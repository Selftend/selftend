# DBT vocabulary in public use — what the UI may name, and the copy gates a DBT surface must pass

Research for #1983 (map #1980, decisions 6 and 15). Checked 2026-09-05. Repo facts are cited as `path:line` on `origin/dev` at `474a648d`; the workbook study is cited on its branch as `origin/research/dbt-workbook-study:docs/research/2026-09-05-dbt-workbook-study.md:line`. Web facts carry a URL and the date. Nothing below reproduces a manual's or the workbook's text: names and one-line paraphrases only.

**Premise checks (☠️ two of the ticket's premises were wrong, one was half-right):**

- The ticket's tool list spells one tool *judgment record*. `test/positioning-copy.test.ts:779-781` bans `\bjudgm` in every translated value (#1651). The en label has to be **Judgement record**; the American spelling is a red build, not a style choice. See §D.2 and §E.
- The ticket says the four modules are "standard" in Bulgarian. They are not: three public Bulgarian sources use three different nouns for *distress tolerance* and two for *mindfulness*, and the app's own bg phrase (*Толерантност към стрес*) matches none of them. See §C.4.
- #1772 is no longer where the safety-callout problem lives. It was **closed 2026-09-05 as a duplicate and folded into #1957** (OPEN, `ready-for-agent`), whose triage comment records the DBT render site. See §D.7.

---

## A — Public DBT vocabulary

### A.1 Sources used, and what each actually carries

Reputable public-facing sources only. ⚠️ Several "official" pages turned out to carry **no skill names at all** — recorded so the next person does not re-fetch them.

| Source | Type | What it carries | URL (checked 2026-09-05) |
| --- | --- | --- | --- |
| Linehan handouts as reproduced by **Kaiser Permanente** (distress tolerance) | Health system, reproducing *DBT Skills Training Handouts and Worksheets, 2nd ed.* (Linehan 2015) with the copyright line on every page | Handout titles: *Crisis Survival Skills*, *STOP Skill*, *Pros and Cons*, *TIP Skills: Changing Your Body Chemistry*, *Wise Mind ACCEPTS*, *IMPROVE*, *Reality Acceptance Skills* = *Radical Acceptance*, *Turning the Mind*, *Willingness*, *Half-Smiling and Willing Hands*; *Mindfulness of Current Thoughts* | https://mydoctor.kaiserpermanente.org/ncal/Images/Distress%20Tolerance%20DBT%20Skills_ADA_04232020_tcm75-1598996.pdf |
| Linehan handouts as reproduced by **Kaiser Permanente** (emotion regulation) | same | *Check the Facts* (Handout 8), *Opposite Action and Problem Solving* (9), *Opposite Action* (10), *Opposite actions for fear / anger / disgust / envy / jealousy / love / sadness / shame / guilt* (11), *Problem Solving* (12), *Accumulating Positive Emotions: Short Term / Long Term* (15, 17), *Build Mastery and Cope Ahead* (19), *Mindfulness of Current Emotions* (21); handout 20 is the physical-vulnerability (*PLEASE*) block | https://mydoctor.kaiserpermanente.org/ncal/Images/Emotion%20Regulation%20DBT%20Skills%20ADA%2004292020_tcm75-1598999.pdf |
| **Wesleyan University CAPS** crisis-survival handout | University counselling centre, same Linehan copyright line | *Crisis Survival Skills*, *STOP*, *TIP*, *Improve the Moment*, *Radical Acceptance*, *Mindfulness of Current Thoughts* | https://www.wesleyan.edu/caps/CAPS%20at%20Home/Crisis%20Survival%20Skills%20Handout.pdf |
| **University of Houston–Clear Lake CMHC** interpersonal handout | University counselling centre | *DEAR MAN*, *GIVE*, *FAST* with expansions | https://www.uhcl.edu/cmhc/resources/documents/dbt-skills-files/dbt-skills-interpersonal-effectiveness.pdf |
| **DBT-Linehan Board of Certification** blog, 2023-02-08 | Certifying body | *DEAR MAN* (used casually, expanded inline), *radical acceptance*, *validation* | https://dbt-lbc.org/2023/02/08/using-mydbtskills-in-new-places/ |
| **Now Matters Now** | Public suicide-prevention skills site built on DBT | *DEAR MAN*, *GIVE skills*, *FAST skills* as page titles | https://nowmattersnow.org/skill/dear-man/ |
| **Psychwire — "Marsha Linehan explains the DBT skills"** | Linehan, on camera | The four module names only: Mindfulness ("the core skill"), Interpersonal Effectiveness, Emotion Regulation, Distress Tolerance. **No acronyms** | https://psychwire.com/free-resources/expert-insights/resource-1o224sc/the-four-dbt-skills-modules |
| **Psychology Today** DBT explainer | Public explainer | Four modules; *self-soothing*, *radical acceptance*, *opposite action*, *reducing vulnerability*. **No TIPP, DEAR MAN or wise mind** | https://www.psychologytoday.com/us/therapy-types/dialectical-behavior-therapy |
| **English Wikipedia** | Encyclopaedia | Four modules; mindfulness **what** skills *observe, describe, participate* and **how** skills *nonjudgementally, one-mindfully, effectively*; *wise mind*. **No distress/ER/IE acronyms** | https://en.wikipedia.org/wiki/Dialectical_behavior_therapy |
| **NHS** — London Waiting Room; Pennine Care; RDaSH; Dorset HealthCare | NHS trust pages | British spelling *Dialectical behaviour therapy*; four modules only (London Waiting Room says *Emotional Regulation*). One trust page in the result set defines *emotional mind / reasonable mind / wise mind* — ⚠️ which trust was not pinned. **No acronyms on any NHS page fetched** | https://londonwaitingroom.nhs.uk/dbt · https://www.penninecare.nhs.uk/services/types/dialectical-behaviour-therapy · https://rdash.nhs.uk/your-health/dialectical-behaviour-therapy-dbt · https://www.dorsethealthcare.nhs.uk/our-services-and-sites/mental-health-and-learning-disabilities/intensive-psychological-therapies/dialectical-behaviour-therapy-dbt |
| **UW Behavioral Research & Therapy Clinics** (Linehan's clinic) | University | Four modules, acceptance- vs change-oriented pairing. No skill names | https://depts.washington.edu/uwbrtc/about-us/dialectical-behavior-therapy/ |
| **Behavioral Tech** Knowledge Center | Linehan's training institute | Landing hub; no skill names on the page fetched (`/what-is-dbt/` 404s) | https://behavioraltech.org/resources/faqs/dialectical-behavior-therapy-dbt/ |
| **Guilford** book pages (manual 2nd ed.; handouts revised ed. Aug 2025) | Publisher | Module names only; the table of contents is not exposed on the page | https://www.guilford.com/books/DBT-Skills-Training-Manual/Marsha-Linehan/9781462516995/contents · https://www.guilford.com/books/DBT-Skills-Training-Handouts-and-Worksheets/Marsha-Linehan/9781462556342 |
| dialecticalbehaviortherapy.com | Unattributed self-help site | Shows how far unofficial vocabulary drifts: *RESISTT*, *Mental Noting*, *Cost Benefit Analysis* alongside *TIPP* and *Wise Mind* | https://dialecticalbehaviortherapy.com/ |

### A.2 The vocabulary, by module

Names as they appear in the Linehan handouts reproduced above; one-line paraphrases are mine.

**Four modules** (every source agrees on the nouns; teaching order in Linehan is mindfulness first, then interpersonal → emotion regulation → distress tolerance; the workbook and map decision 3 use distress tolerance first):

- **Mindfulness** — present-moment attention without judgement; the core skill.
- **Distress tolerance** — getting through a crisis without making it worse.
- **Emotion regulation** — understanding emotions, reducing vulnerability, changing the ones that do not fit the facts.
- **Interpersonal effectiveness** — asking, refusing and keeping both the relationship and self-respect.

**Mindfulness:** *wise mind* (the synthesis of *emotion mind* and *reasonable mind*); **what** skills *observe / describe / participate*; **how** skills *non-judgementally / one-mindfully / effectively*.

**Distress tolerance — crisis survival:** *STOP* (stop, take a step back, observe, proceed mindfully); *pros and cons* (of acting on the urge vs riding it out); *TIP* — Linehan's handout title is **TIP** (temperature, intense exercise, paced breathing); **TIPP** with *paired muscle relaxation* is the common public variant; *distraction* under **Wise Mind ACCEPTS** (activities, contributing, comparisons, emotions, pushing away, thoughts, sensations); *self-soothing* through the five senses; **IMPROVE** the moment (imagery, meaning, prayer, relaxation, one thing in the moment, vacation, encouragement).

**Distress tolerance — reality acceptance:** *radical acceptance*; *turning the mind* (choosing acceptance again at the fork); *willingness* vs *willfulness*; *half-smiling and willing hands*; *mindfulness of current thoughts*.

**Emotion regulation:** *check the facts*; *opposite action* (act against the emotion's action urge when the emotion does not fit the facts); *problem solving*; **PLEASE** (treat physical illness, balanced eating, avoid mood-altering substances, balanced sleep, exercise) — the physical-vulnerability block, often taught as **ABC PLEASE** with *accumulate positive emotions*, *build mastery*, *cope ahead*; *mindfulness of current emotions*.

**Interpersonal effectiveness:** **DEAR MAN** (describe, express, assert, reinforce, stay mindful, appear confident, negotiate) for getting what you ask for; **GIVE** (gentle, interested, validate, easy manner) for the relationship; **FAST** (fair, no over-apologising, stick to values, truthful) for self-respect.

### A.3 Which acronyms a person who searched "DBT skills" would expect

Ranked by how far outside DBT-specialist material the term travels, on the sources above:

| Tier | Terms | Evidence |
| --- | --- | --- |
| **Expected by name — travels to general public pages** | *wise mind*, *radical acceptance*, *opposite action*, *DEAR MAN* | Psychology Today names radical acceptance and opposite action; Wikipedia names wise mind; DBT-LBC's own blog drops "doing a DEAR MAN" without introduction; NHS and Bulgarian pages define wise mind; bg Wikipedia names all three non-acronyms |
| **Expected by someone who has read any skills list** | *TIPP/TIP*, *STOP*, *check the facts*, *PLEASE*, *GIVE*, *FAST*, *ACCEPTS*, *IMPROVE*, *cope ahead* | Present in every university counselling handout and health-system handout fetched; absent from every NHS trust page and from Psychology Today. A search for "DBT skills" lands on cheat-sheet pages listing all of them (search result set, 2026-09-05) |
| **Inside-DBT vocabulary** | *turning the mind*, *willingness/willfulness*, *half-smile / willing hands*, *build mastery*, *accumulate positives*, *one-mindfully* | Handouts only |

So: a person who searched "DBT skills" **expects the acronyms to exist** and would recognise DEAR MAN, TIPP and wise mind on sight; nobody reaches Selftend from an NHS page expecting one. That matches the shipped child-safety ruling exactly — an acronym is fine **beside its expansion** and useless **alone** (§C.3).

### A.4 The workbook does not use these acronyms

Confirmed on the study, not assumed: the McKay/Wood/Brantley workbook uses **REST** (`…dbt-workbook-study.md:49`), **FTB-Cope** (`:85`), **FLAME** (`:139`), **ABC** for problem solving and **RAVEN** for negotiation (`:231`, `:281`), and the study records that it does *not* use ACCEPTS, IMPROVE, TIPP, PLEASE, DEAR MAN, GIVE or FAST while its content overlaps them (`:281`). Map #1980 § *Facts established* says the same. ⚠️ The workbook's own worksheet titles (*My Distraction Plan* `:59`, *Emergency Coping Plan* `:87`, *Negative Judgments Record* `:130`, *Recognizing Your Emotions* `:159`, *Weekly Regulator* `:191`) are the authors' titles, not Linehan's — the same "do not lift" rule applies to them as to the mnemonics.

---

## B — Licensing posture

### B.1 What the repo requires today

- `docs/licensing.md` has **no book-specific rule**. Its *Reference repository rules* (`docs/licensing.md:29-34`) are about the sibling repos: ideas free, copied code needs review and attribution, copied text/content stricter. The general *Third-party content and asset rule* (`:56-63`) is the one that reaches a book: for any borrowed material record **source, license, attribution requirement, and whether it was copied, adapted, or only used for inspiration**. The *Important caveat* (`:86-94`) already lists crisis and safety copy as needing legal review before launch.
- `docs/reference-log.md` is scoped to the sibling repos only (`:16-73`); its rule is *inspiration only* — text/content copy not allowed without explicit review (`:5-14`) — and its *Review trigger* (`:75-83`) asks for exact source path, what was copied or adapted, license note, attribution requirement, review date. **Neither file mentions Harris, Linehan or McKay.**

### B.2 What the ACT spec did with Harris's names

- The spec's header cites the book as **Source** (`docs/modules/act-harris-happiness-trap.md:3`) and carries one caveat, **FID-1**, which is about *chapter numbers* being unverified against the 2nd edition (`:4`) — not about licensing.
- It **adopted Harris's names verbatim as product vocabulary**: *Choice Point* (`:38-40`, routes `:644-646`), *ACE* (`:17`, §3.1.1 at `:185-197`), *TAME* (`:18`, `:239-250`, including a data-model rename `fourStepExpansion → tame` with a legacy alias), *HARD barriers* (`:19`, `:285-296`), and a glossary that expands each (`:760-787`).
- A grep for `copyright|permission|trademark|reproduc|verbatim` over the spec returns nothing beyond the title and source lines. **There is no licensing caveat in the ACT spec**, no entry in `licensing.md` or `reference-log.md`, and the shipped ACT copy carries the acronym with its expansion beside it (`act:committedAction.obstaclesHint`, kept by the child-safety review at `docs/child-safety-review.md:112`).

So the precedent is: **names adopted as terms of art; the book cited once as Source in the spec header; worksheet text paraphrased; nothing recorded in the licensing docs.**

### B.3 Recommended posture for DBT (consistent with decision 6)

1. **Skill names are terms of art and are used freely** — *wise mind, radical acceptance, opposite action, check the facts, distress tolerance, self-soothing, distraction, cope ahead, DEAR MAN, TIPP* — exactly as ACT uses ACE/TAME/HARD. They are in universal clinical and public use (§A.1), several predate Linehan's manuals, and the app names an approach, not a certified programme.
2. **Linehan's acronyms appear only in the learn page, each beside its expansion**, per the child-safety ruling (§C.3). Never as a bare UI label, never as a tool name. Recommended set to mention: DEAR MAN, TIPP, STOP, wise mind — the ones a searcher recognises (§A.3). The rest can be omitted without loss.
3. **The workbook's mnemonics (REST, FTB-Cope, FLAME, ABC, RAVEN) and its worksheet titles are not lifted** — decision 6. The workbook is cited once as **Source** in the spec header in ACT's format; the spec paraphrases structure and names skills in plain English.
4. **No worksheet text from either source is reproduced.** The seven first-release tools are Selftend-authored forms whose *shape* follows the workbook (the study is already a paraphrase); prompts are written fresh. The spec should say this in one line under its header, which ACT did not do and should have.
5. ⚠️ **Assumption, not verified by counsel:** there is a registered mark in play. A US HHS clearinghouse lists the treatment as "Dialectical Behavior Therapy®" (https://preventionservices.acf.hhs.gov/programs/782/show, title as indexed 2026-09-05) and the certifying body styles itself "DBT®-Linehan Board of Certification" (https://certification.dbt-lbc.org). A mark in the training/certification class does not stop descriptive use of the therapy's name, but the app must **never** say "DBT-certified", "official DBT", or use ® — and `docs/licensing.md:86-94`'s pre-launch legal review should have this on its list. Recommend recording it there as an open question.
6. **Book the two sources in `docs/reference-log.md`** under a new *Books* heading using its existing five fields (source, what was adapted, license note = copyrighted / names as terms of art / no text copied, attribution requirement = spec-header citation, review date). This is a recommendation: the file today covers repos only, and both ACT and CBT (Gillihan) shipped without an entry — but the review trigger at `:75-83` is the right shape and it costs six lines.

---

## C — What the app already says

### C.1 `modules.json` — every `dbt.*` key

`src/i18n/locales/en/modules.json:2-27` and `src/i18n/locales/bg/modules.json:2-27` (identical key set):

| Key | en (line) | bg (line) |
| --- | --- | --- |
| `dbt.eyebrow` | *Overview · DBT* (3) | *Преглед · DBT* (3) |
| `dbt.title` | *Dialectical behaviour therapy* (4) | *Диалектична поведенческа терапия* (4) |
| `dbt.description` | *Skills for high emotion intensity - distress tolerance, emotion regulation, mindfulness, and interpersonal effectiveness. An overview of the approach, not a set of exercises.* (5) | *Умения за висок интензитет на емоции - толерантност към стрес, регулация на емоции, осъзнатост и междуличностна ефективност. Преглед на подхода, а не набор от упражнения.* (5) |
| `dbt.aboutTitle` | *What DBT is* (6) | *Какво е DBT* (6) |
| `dbt.aboutBody` | *DBT was developed for high-emotion-intensity experiences. It pairs acceptance with change in equal measure. Selftend's guided exercises are in the CBT and ACT modules.* (7) | *DBT е разработена за преживявания с висок интензитет на емоции. Тя съчетава приемане и промяна в равни части. Направляваните упражнения в Selftend са в модулите CBT и ACT.* (7) |
| `dbt.skillsTitle` | *The four skill groups* (8) | *Четирите групи умения* (8) |
| `dbt.skills.mindfulness.name/desc` | *Mindfulness* / *Observing, describing, participating with full attention.* (11-12) | *Осъзнатост* / *Наблюдение, описание, участие с пълно внимание.* (11-12) |
| `dbt.skills.distressTolerance.name/desc` | *Distress tolerance* / *Getting through a crisis without making it worse.* (15-16) | *Толерантност към стрес* / *Преминаване през криза, без да я влошиш.* (15-16) |
| `dbt.skills.emotionRegulation.name/desc` | *Emotion regulation* / *Reducing vulnerability, understanding emotions, changing painful ones.* (19-20) | *Регулация на емоции* / *Намаляване на уязвимостта, разбиране на емоциите, промяна на болезнените.* (19-20) |
| `dbt.skills.interpersonal.name/desc` | *Interpersonal effectiveness* / *Asking, saying no, and keeping the relationship and self-respect intact.* (23-24) | *Междуличностна ефективност* / *Молба, отказ и запазване на отношението и самоуважението.* (23-24) |

Rendered by `src/features/modules/dbt-module-screen.tsx:43-49` (eyebrow, title, description), `:58-61` (about card), `:69-78` (the four cards, via a **template-literal key** `dbt.skills.${key}.name` — invisible to `test/i18n-key-coverage.test.ts`, per its own header), and `CrisisSupportCallout` at `:82`. The file's comment `:23-33` records the #1020 history: the eyebrow *Module · DBT*, the *On the roadmap* card and `statusTitle/statusBody` were removed under App Review 2.1.

☠️ **Four shipped strings flip from true to false the day one DBT tool ships:** `dbt.description` ("*not a set of exercises*"), `dbt.aboutBody` ("*Selftend's guided exercises are in the CBT and ACT modules*"), `navigation:today.modules.dbtDescription` ("*An overview of the approach.*") and `navigation:sidebar.dbtA11y` ("*DBT overview*"). Decision 12 moves the overview copy to a learn page; these four are the strings that move.

### C.2 `navigation.json` and the Today/Home entries

`src/i18n/locales/en/navigation.json` (bg mirrors line-for-line):

- `sidebar.dbt` = *DBT* (`:27`; bg *DBT*)
- `sidebar.dbtA11y` = *DBT overview - Dialectical Behaviour Therapy* (`:31`; bg *Преглед на DBT - Диалектична поведенческа терапия*)
- `today.modules.dbtName` = *Dialectical behaviour therapy* (`:92`; bg *Диалектична поведенческа терапия*)
- `today.modules.dbtDescription` = *Four skill groups - mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness. An overview of the approach.* (`:93`; bg `:93`)

These are the only `dbt` hits in any locale file outside `modules.json`. There is no `dbt` namespace, no `help` entry, no `settings` reminder key yet — consistent with `ModuleKey` at `src/features/modules/types.ts:1` not including `dbt`.

Vocabulary already shipped and child-safety-passed, in both languages: **the four module names, "skill groups", "observing, describing, participating", "crisis", "vulnerability", "asking, saying no, self-respect", "acceptance with change".** Not yet shipped anywhere: *wise mind, radical acceptance, opposite action, check the facts, self-soothing, distraction*, any acronym.

### C.3 The child-safety review's rulings on this page

- The DBT overview row: `modules` namespace, reading **Fixed**, medical/crisis/framing/Play all **Pass** (`docs/child-safety-review.md:52`).
- **Row 10** (`:84`): `modules:dbt.skills.distressTolerance.desc` used to end "*…TIPP, ACCEPTS, IMPROVE.*" — "*Three acronyms expanded nowhere in the app, on a page that states it is an overview rather than exercises. They gave a reader nothing to act on.*" Replaced by the plain sentence now at `en/modules.json:16`.
- **The contrast that makes it a rule, not a taste** (`:112`): ACT's *HARD barriers* hint is the densest non-legal string in the app and was **kept**, because its label is "*What might get in the way? (HARD barriers)*" and the hint *is* the expansion — "*It is doing the job the DBT acronyms were not. Kept — and the contrast is why finding 10 went the other way.*"
- Row 4 of the review's checklist (`:43`) is the framing test a DBT surface inherits: *whether the words are the ones a person uses about their own practice, or the ones a clinician uses about a protocol they run* — the ruling that turned *hierarchy* into *ladder* and banned bare *SUDS* (`:86-90`; gate in §D.4).

**Ruling to carry:** an acronym may appear only where its expansion is on the same surface, and never as the thing a person is asked to act on.

### C.4 Bulgarian: what the app says vs what Bulgarian sources say

The app today: *Диалектична поведенческа терапия*; groups *Осъзнатост / Толерантност към стрес / Регулация на емоции / Междуличностна ефективност*; the abbreviation stays Latin *DBT* (`bg/modules.json:3,6,7`; `bg/navigation.json:27,31`).

Public Bulgarian sources (all checked 2026-09-05):

| Source | Therapy name | Distress tolerance | Mindfulness | Emotion regulation | Interpersonal | Named skills |
| --- | --- | --- | --- | --- | --- | --- |
| bg Wikipedia — https://bg.wikipedia.org/wiki/Диалектическа_поведенческа_терапия | **Диалектическа** поведенческа терапия, **ДПТ** | Толерантност към **дистрес** | Съзнателност | Регулиране на емоциите | Междуличностна ефективност | мъдър ум; радикално приемане; противоположни действия |
| psychology.framar.bg, "Мъдрият ум" — https://psychology.framar.bg/техника-за-самопомощ-мъдрият-ум | **Диалектична** … (ДПТ), also *диалектическа* | Толеранс към дистрес | Осъзнаност | Регулиране на емоциите | (междуличностни отношения) | Мъдрият ум / Разумният ум / Емоционалният ум |
| McKay workbook, **Bulgarian edition** — Изток-Запад 2023, tr. Детелина Иванова — https://www.ozone.bg/product/dialekticheska-povedencheska-terapiya-narachnik-za-razvivane-na-umeniya-za-emotsionalno-regulirane/ · https://www.avtora.com/dialekticheska-povedencheska-terapiia-narachnik-za-razvivane | **Диалектическа** поведенческа терапия (ДПТ) | **Устойчивост на стрес** | Осъзнатост | Емоционална регулация | Междуличностна ефективност | състрадание към себе си; когнитивни репетиции |
| *DBT For Dummies*, Bulgarian edition (Алекс Софт 2021) — https://www.book.store.bg/p320781/dialektichna-povedencheska-terapia-for-dummies.html · https://www.ciela.com/dialektichna-povedencheska-terapiya-for-dummies.html | **Диалектична** … (ДПТ) | Преносимост на дистреса | Внимателност | Регулиране на емоциите | Интерперсонална ефективност | мъдра личност (wise mind); радикално приемане |
| medpedia.framar.bg — https://medpedia.framar.bg/лечения/психотерапия-диалектическа-поведенческа-терапия | Диалектическа | — | — | — | — | — |

Findings:

1. **The adjective is split** *диалектична* (app, framar, For Dummies) vs *диалектическа* (Wikipedia, the workbook's own Bulgarian edition, medpedia). Both are live; the app's choice is defensible and should stay, but it is a choice.
2. **Distress tolerance has no settled Bulgarian term.** Four variants in four sources — *толерантност към дистрес* (Wikipedia), *толеранс към дистрес* (framar), *устойчивост на стрес* (the workbook itself, in translation), *преносимост на дистреса* (For Dummies). ☠️ The app's *Толерантност към стрес* is a fifth, matching none. A Bulgarian reviewer has to choose; the candidates that carry a source are *толерантност към дистрес* (encyclopaedic) and *устойчивост на стрес* (the source book's translator).
3. **Mindfulness:** *осъзнатост* (app, framar, workbook translation) is the majority form; Wikipedia's *съзнателност* and For Dummies' *внимателност* are minority. Keep *осъзнатост* — it also matches the app's existing meditation vocabulary.
4. **Emotion regulation:** *регулиране на емоциите* (Wikipedia, framar, For Dummies) vs *емоционална регулация* (workbook translation) vs the app's *регулация на емоции*. All intelligible; flag for the reviewer, do not change unprompted.
5. **Interpersonal effectiveness:** *междуличностна ефективност* is the consensus form and the app has it.
6. **Wise mind → *мъдър ум*** is established in Bulgarian (Wikipedia, framar, Rooting Robin search snippet https://www.rootingrobin.com/trite-systoqniq-na-choveshkiq-um/); *радикално приемане* and *противоположно действие/действия* also exist. These three DBT terms can be named in Bulgarian without inventing anything.
7. ⚠️ **Abbreviation inconsistency inside the app:** bg copy writes the Latin *DBT* (and *CBT*, *ACT* in `bg/modules.json:7`) while `bg/common.json:62` writes *КПТ програма* in Cyrillic. Every Bulgarian source above uses *ДПТ*. Not this ticket's to fix, but a DBT namespace should not deepen the split — decide once (recommend *ДПТ* in body copy, Latin only where an English acronym is being named as such).

Bulgarian copy authoring is out of scope for map #1980 (decision 13); everything in §E's Bulgarian column is a **candidate, unreviewed**.

---

## D — The copy gates a DBT surface inherits

### D.1 `docs/positioning.md` § *Words never to use* (`:376-385`) and its notes

| Never | Why (paraphrased) | Gate |
| --- | --- | --- |
| **the retired ‘guided’ compound** (positioning § Words never to use) | Clinically means *with a practitioner*; Selftend has none. The livest row: `guided` is live product vocabulary and the pattern allows one intervening word (`:387`) | `verify` |
| **a management verb over a health or condition object** — *manage / treat / cure / fix / improve / work on* **your** *mental health / wellbeing / anxiety / depression / panic / trauma / OCD / burnout / symptoms / condition* | Implies a clinical outcome | `verify` (closed list); the general rule "no management verb takes a health noun" is **human habit only** (`:393`). *Self-manage* stays legal; *look after / take care of / tend* are the permitted verbs |
| **end-to-end**, **zero-knowledge**, **even we can't read them** | False; design is provider-recoverable | `verify` |
| **AI therapist / AI counsellor / AI coach**, affirmatively | Guardrail; the negation stays legal | `verify` |
| **no streaks**, **no streak pressure**, **streak-free** | Restraint is never a pitch (owner, 2026-07-24) | `verify` |
| **AI-powered** | AI is a rationale, never a claim | `verify` |

Allowed adjacent phrasing (`:386`): "no pressure", "no shame", "no ads, no subscriptions" — ⚠️ but see `restraint-copy` in §D.3: *no shame* is banned **in shipped copy**; the positioning line is about marketing register, the guard is about practice surfaces.

Also binding from the same section: **British spelling is not a preference** (`:370-373`) — *behavioural*, *behaviour*, *favourite, colour, organise, practising, recognise, fulfil, fuelled*, **programme**, **judgement**; *judgment* only in its legal sense; identifiers (routes, keys, columns) are not copy.

### D.2 `test/positioning-copy.test.ts` — which strings, which files

Corpus (`:64-175`): `USER_FACING` = every translated value in both locales via `test/locale-strings.ts` plus the static public/store files listed at `:64-80` (e.g. `public/manifest.webmanifest`); `I18N_VALUES` = translated values only (`:87`); `ALL_SURFACES` = user-facing + `README.md`, `CONTEXT.md`, `docs/product-principles.md` (`:167-172`); `WITH_PROSE_DOCS` adds `AGENTS.md` and every `docs/**/*.md` **except** the `PUBLISHED_RECORDS` (`:129-137` — `docs/positioning.md`, the App Store review reply, recording script, closed-testing record, campaign scripts, `docs/design/1822-before/`, **`docs/design/1825-handoff/prompt.md`**, `docs/launch/`). Scope mapping at `:797-801`.

| Rule block | Pattern (en; bg where present) | Scope | Reaches the DBT **spec** in `docs/modules/`? |
| --- | --- | --- | --- |
| `GUIDED_SELF_HELP` (`:250-270`) | `/\bguided\s+(?:[\w-]+\s+){0,1}self[-\s]help/i`; bg `насочен…самопомощ`, `ръководен…самопомощ` | **prose** | **Yes** — the only rule that reads `docs/` |
| `MANAGEMENT_VERB_ON_HEALTH` (`:320-335`) | verb + `your` + closed noun list; bg `управлява/лекува/третира/оправя/подобря … психично здраве/тревожност/депресия/симптоми` | all | No (i18n, static, README, CONTEXT, principles) |
| `FRAME_SPELLING` (`:402-420`) | `cognitive behavioral`, `behavioral activation`, **`dialectical behavior`** | all | No — but every DBT i18n string is inside it |
| `PLAIN_NOUN_SPELLING` (`:463-470`) | `/\bbehaviors?\b/i` | all | No |
| `NEVER_SAYABLE_ENCRYPTION` (`:489-527`) | end-to-end, zero-knowledge, "even we can't read"; bg equivalents | user-facing | No |
| `AI_AFFIRMATIVE` (`:557-610`) | your/our AI therapist…, "is an AI …", AI-powered, AI therapy/counselling/coaching, "talk to an AI"; bg | all | No |
| `STREAK_PROMOTION` (`:626-660`) | no streak(s), without streaks, streak-free; bg `без серии/поредици` | all | No |
| `HOUSE_STYLE_SPELLING` (`:696-783`) | favorite, color, organize, practicing/practiced, recognize, fulfill, fueled/fueling, **`/\bprograms?\b/`**, **`/\bjudgm/`** | i18n | No — translated values only |

Every rule has a probe that must match (`:319-321`), and the AI/adjacent blocks pin legitimate neighbours (`:330-420`).

☠️ **Consequences for DBT copy:** *Judgement record*, *programme*, *practising*, *recognising*, *behaviour*, *dialectical behaviour therapy*. The spec document itself is free of the spelling gates (house habit only) but **not** of the retired ‘guided’ compound rule — and a DBT design brief that quotes banned phrases to ban them must be added to `PUBLISHED_RECORDS` at `:129-137`, exactly as `1825-handoff/prompt.md` was (map #1980 § *Facts established*, last bullet).

### D.3 `test/practice-copy.test.ts` and `test/restraint-copy.test.ts`

Both read **every namespace, both locales, values only, no allowlist**, via `test/locale-strings.ts`.

`practice-copy` (`:39-74`, principle §12 / ADR-0004 — never prescribe a return, never name a run to keep): en `streak`, `overdue`, `you missed`, `keep it going`, `keep it up`, `don't stop`, `don't break`, `back on track`, `\bsee you\b`, `come back (tomorrow|later|soon|every|each|daily)`, `built (real )?momentum`, `never missing`; bg `серия`, `просроч`, `не спирай`, `не прекъсвай`, `до скоро`, `ще се видим`, `(върни се|се върни) (утре|по-късно|скоро|всеки)`, `постигна (истински )?устрем`, `никога да не пропускаш`. Deliberately **not** banned (`:23-37`): bare *keep going* (dialog cancel), *come back* (grounding's "come back to your breath"), *miss/missing*, *momentum*, *no reminders*.

☠️ For DBT: the workbook's "practise daily", "carry it with you", "for two weeks" cadences are exactly the shape this guard exists for. *Cope ahead* copy must not say "come back tomorrow"; a coping-plan card must not say "keep it up".

`restraint-copy` (`:30ff`, #711): en `no shame`, `\bshaming\b`, `never punish`, `punishes`, `punishment`, `no penalty`, `not (a )?failure`, plus a *pressure*-negation family (the noun itself is legal — grounding uses it); bg equivalents. Config surfaces may disclose ("off by default"); practice surfaces may not advertise restraint (`:20-30`).

### D.4 `test/child-safety-copy.test.ts` (#1770)

Both locales, all namespaces unless scoped (`:37-50`); every rule has a probe and a *must-stay-legal* list (`:242-260`).

`MEDICAL_OUTCOME` (`:71-150`): `(writing|journaling|meditation|breathing|gratitude|CBT) heals`; `retrain/rewire/reprogram … the/your brain`; `way to better mental health`; `clinically proven`, `proven to (reduce|treat|cure|fix|help)`; bg `клинично доказан…`, `… лекува`, `преобуч/пренастрой/препрограмир… мозъка`, `пътя(т) към по-добро психично здраве`.

`TREATMENT_FRAMING` (`:178-205`): `\bhierarch(y|ies)\b` **scoped to `cbt:exposure.*`** (`:181-186` — a bare version was rejected as vocabulary-keyed), `\bSUDS\b` **everywhere**, both locales.

☠️ For DBT: the workbook's *Assertive Situation Hierarchy* (`…study.md:229`) may be built or linked, but its UI noun follows CBT's ruling — **ladder**, never hierarchy — even though the regex would not catch it outside `cbt:exposure`. The must-stay-legal probe "*Build a ladder of situations by difficulty…*" (`:252`) is the sanctioned shape. No 0–100 distress scale may be labelled SUDS. "DBT heals", "rewire", "proven to" are red.

### D.5 `test/no-unshipped-status-copy.test.ts` (#1020)

Scope is derived (`:33-45`): `navigation.sidebar`, `navigation.modulesPage`, `navigation.today.modules`, and the whole **`modules` namespace** — i.e. every DBT string that exists today. Patterns (`:71-72`): en `coming soon`, `\bsoon\b`, `on the roadmap`, `\bin design\b`, `next major release`; bg `скоро`, `пътна карта`, `процес на дизайн`, `следващото голямо издание`. ⚠️ A new `dbt` namespace would be **outside** this guard by construction; the spec should say the module's own home copy inherits the rule by habit, or the guard's surface list grows.

### D.6 The rest of the copy-guard family, by file

| File | What it holds | DBT relevance |
| --- | --- | --- |
| `test/i18n-key-coverage.test.ts` | every literal `t("…")` key in `app/`+`src/` resolves in `en`; template-literal keys are invisible (header) | the skill-card loop at `dbt-module-screen.tsx:73-74` is already invisible; a DBT tool inventory keyed by template literal needs its own content test |
| `src/i18n/locale-parity.test.ts` | `en` and `bg` key sets identical, `KNOWN_GAPS` is empty (`:10`) | every DBT key lands in both locales in one change; there is no staging path |
| `test/over-use-copy.test.ts` | the "too much" teaching lives on exactly two surfaces; signature phrase never under `policies:crisis` | a DBT learn page must not carry a third copy of "challenging has become checking" |
| `test/registration-invitation-copy.test.ts` | registration invitations on exactly two surfaces (§12) | no "create an account to keep your coping plan" anywhere in DBT |
| `test/show-all-door-copy.test.ts` | `showAll*` / `viewAll*` / `seeAll` / `allHistory.link` keys carry no arrow glyph | any DBT history door |
| `test/module-home-header-stat-shape.test.ts` | a header stat's `count` never goes into the translated value (#749 pattern) | DBT home header stats (records, phase) |
| `test/module-identity-neutral.test.ts` | identity surfaces carry no module hue | design brief: DBT identity is icon + label |
| `test/nav-singular.test.ts`, `test/therapy-modules-origin.test.ts`, `test/escape-coverage.test.ts` | route declared singular-or-not; navigation through `usePushWithOrigin` in `app/(app)/modules`; Escape paths covered | not copy, but every new DBT route trips them |
| `test/child-safety-cadence.test.ts` | pins the PR-template line that a **new module re-runs the child-safety review** | DBT's first shipping slice owes a review pass, by that gate |
| `test/store-listing-drift.test.ts`, `test/store-info-invariants.test.ts` | store copy invariants | only if DBT enters a listing |

### D.7 The human-only gates

- **`docs/product-principles.md` §6** (`:29-33`): do not diagnose, prescribe, claim treatment outcomes, provide emergency support, replace care — and ☠️ *"this reaches what a phrase means in the clinic, not only what it asserts about the product … it can carry an assumption about the reader as well as about Selftend."* This is why *distress tolerance* is fine (a skill name) and *emotion dysregulation*, *self-harm urges*, *borderline* are not (a reader assumption). It is also why the Psychology Today framing — "originally developed to curb the self-destructive impulses of chronically suicidal patients" — must not be the app's *What DBT is* sentence.
- **§12** (`:55-63`): every completion satisfies and ends; nothing varies by date or visit; no levels, badges or run-lengths; what a user builds is theirs and exportable. Decision 7 (dated records, no tick grids, no weekly regulator, no diary card) is §12 applied.
- **Map decision 15**: audience copy names a **use context** ("for when feelings run high"), never a trait, condition or diagnosis. The shipped `dbt.description` ("*Skills for high emotion intensity*") and `dbt.aboutBody` ("*developed for high-emotion-intensity experiences*") are use-context phrasings and pass; "for people who feel emotions intensely" (RDaSH's phrasing) would be a trait and fail.
- **Positioning's hard rule** (`:101-124`): the tools may lead but never appear alone — a DBT home that lists seven tools with no method sentence fails clause 1; privacy is never the opening claim. **No regex reaches either clause.**
- **Positioning's surface rule** (`:327-349`): module homes are post-threshold and owe no category sentence; safety copy is exempt as a class (`:341`).
- **#1772 → #1957**: `common:safety.description` (`en/common.json:62`: "*Selftend is a CBT programme for when there is time and safety to reflect…*"; bg `:62` "*Selftend е КПТ програма…*") has three render sites; the third is `CrisisSupportCallout` in `src/components/app/safety-callout.tsx:14,25`, rendered on DBT's home at `dbt-module-screen.tsx:82`. #1772 was **closed 2026-09-05 as a duplicate**; #1957 (OPEN, `ready-for-agent`) owns the rewrite and its triage comment rules that the string "*must not name any module at all*". Until it lands, DBT's home tells a DBT user Selftend is a CBT programme. ☠️ The component is `CrisisSupportCallout` in a file called `safety-callout.tsx`; a grep for `SafetyCallout` finds nothing. Decision 12's "crisis callout" on the DBT home is this component — the brief should hand the designer the `dev` string verbatim and mark it not theirs, as `1825-handoff` did.

---

## E — Recommended name table

Rules applied: plain English label; Linehan's public term named where §A.3 says a person recognises it, and then only with its expansion on the learn page; no workbook mnemonic or worksheet title; British spelling; use-context only; nothing a clinician says about a protocol. Bulgarian column = **candidate, unreviewed** (decision 13 excludes bg authoring; §C.4 shows the terms are unsettled).

### E.1 The seven first-release tools

| # | Tool (map decision 9) | Proposed UI name (en) | Public DBT term to mention (learn page only) | Must avoid | Bulgarian candidate (unreviewed) | Study ref |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Coping plan — distraction + self-soothing menus, own items, ordered fallback list, card view | **Coping plan** (card: *My coping plan*); sections *Distract* and *Soothe*, list *If that doesn't work, next…* | *distraction* and *self-soothing* as plain words; optionally "sometimes taught as **ACCEPTS**" with expansion; **never** *Wise Mind ACCEPTS* as a label | *Emergency coping plan* (workbook title, and *emergency* is the crisis register the safety callout reserves — `common.json:61-62`); *crisis plan* / *safety plan* (clinical safety-planning terms, would read as the app's crisis guidance); *REST*; *distress tolerance plan* as the label; "carry it with you at all times" cadence copy | **План за справяне**; секции *Отвличане на вниманието* / *Успокояване*; *Ако не помогне — следващо* | `:59`, `:14`, `:87` |
| 2 | Stop-and-choose interrupt, step flow | **Pause and choose** (steps: *Stop · Breathe · Look · Pick one thing*) | **STOP skill** — Linehan's public acronym for exactly this shape; name it once on the learn page with expansion. It is a *different* mnemonic from the workbook's | *REST* (workbook's own); *Take a REST*; *impulse control* (clinical); a timer that implies a required duration | **Спри и избери** | `:49` |
| 3 | Emotion record — six-step recognising-emotions worksheet | **Emotion record** (steps: *What happened · What it meant to you · What you felt · What you wanted to do · What you did · What came after*) | *Recognising emotions*, plain; Linehan's *observing and describing emotions*; **no acronym exists** | *Recognizing Your Emotions* (workbook title, American spelling); *diary card*; *emotion log* as a running tally (decision 7); *primary/secondary emotion* unglossed; *trigger* as a noun on a label (fine in body copy); *dysregulation* | **Запис на емоция** | `:159` |
| 4 | Opposite-action planner | **Opposite action** (planner: *Act the other way*; fields *The feeling · What it pulls you to do · Does it fit the facts? · The opposite move · All the way, or halfway?*) | **Opposite action** is Linehan's own term and already plain English; also *check the facts* as the step before it | *regulate your emotions* / *manage your emotions* (management-verb family — `emotions` is not on the closed list, so this is human-habit territory; use *change a feeling's pull*, *turn a feeling down*); *emotion-driven behavior* (American); *action urge* without a gloss | **Противоположно действие** (bg Wikipedia: *противоположни действия*) | `:188` |
| 5a | Assertiveness script builder | **Ask for what you want** (screen: *Script builder*; lines *What I think · What I feel · What I want · What I'll do for myself if not*) | **DEAR MAN** — the single most-recognised DBT acronym; learn page names it with its seven words and says this builder is a simpler four-line cousin | *assertiveness training* (protocol noun); *RAVEN*; *negotiation* as a tool name; *I-statements* unglossed; **hierarchy** (use *ladder* if the graded-practice list is built — §D.4) | **Поискай това, което искаш** / *Скрипт за отстояване* | `:225` |
| 5b | Saying-no reference | **Saying no** (two beats: *Acknowledge what they want · Say your preference*) | *saying no* is the public phrasing in every DBT source; **FAST** optional on the learn page for self-respect | *setting boundaries* as the label (fine in body); *refusal skills*; *no justification needed* phrased as a rule about the reader | **Да кажеш „не"** | `:228` |
| 6 | Wise-mind check-in | **Wise mind check-in** (prompt: *Emotion mind says… · Reason says… · Both together say…*) | **Wise mind** — recognised by name in English *and* Bulgarian (§C.4.6); expand *emotion mind / reasonable mind* once on the same screen | *intuition* / *gut* claims; *enteric brain* (workbook `:127`); *the right answer*; any scoring of the check-in | **Проверка с мъдрия ум** (*емоционален ум · разумен ум · мъдър ум*) | `:127`, `:128` |
| 7 | Judgement record | **Judgement record** — ☠️ spelled with the *e* (`positioning-copy.test.ts:779`); columns *When · Where · The judgement · What was actually there* | Linehan's **how** skill *non-judgementally*; *letting go of judgements*; no acronym | ***Judgment*** in any translated value; *Negative Judgments Record*, *Beginner's Mind Record* (workbook titles); *cognitive distortion* (CBT vocabulary, wrong module); a daily count | **Запис на оценки** (*оценка* vs *преценка* vs *осъждане* — reviewer's call) | `:130`, `:131` |

### E.2 The four phases (map decision 3, book order)

| Phase | Proposed name | Plain subline | Public term | Avoid | Bulgarian candidate (unreviewed) |
| --- | --- | --- | --- | --- | --- |
| 1 | **Distress tolerance** | *Getting through a hard moment without making it worse* (already shipped: `en/modules.json:16`) | *crisis survival* and *reality acceptance* as the two halves | *crisis skills* as the phase name (collides with the crisis page's register); *self-harm* in phase copy | **Толерантност към дистрес** (Wikipedia) or **Устойчивост на стрес** (workbook translation) — ☠️ not the app's current *Толерантност към стрес*; reviewer decides |
| 2 | **Mindfulness** | *Noticing what is here, without judgement* | *wise mind*; what/how skills | *meditation* as the phase noun (positioning's refusal row `:213`) | **Осъзнатост** (keep) |
| 3 | **Emotion regulation** | *Understanding a feeling and changing the ones that don't fit* | *check the facts*, *opposite action*, *PLEASE* on the learn page | *manage/control your emotions*; *dysregulation*; *vulnerability factors* unglossed | **Регулация на емоции** (app) / **Регулиране на емоциите** (majority of sources) — reviewer decides |
| 4 | **Interpersonal effectiveness** | *Asking, saying no, and keeping the relationship and your self-respect* (already shipped: `:24`) | *DEAR MAN, GIVE, FAST* on the learn page | *communication skills training*; *conflict resolution* as the phase name | **Междуличностна ефективност** (keep) |

### E.3 Module-level strings that change when tools ship

- `dbt.eyebrow` *Overview · DBT* → *Module · DBT* is legal again once tools exist (`dbt-module-screen.tsx:28-31` is the history).
- `dbt.description`, `dbt.aboutBody`, `navigation:today.modules.dbtDescription`, `navigation:sidebar.dbtA11y` — the four "overview, no exercises" claims (§C.1) move to the learn page or are rewritten. Audience line stays use-context: *Skills for when feelings run high* (decision 15).
- Programme strings mirror `act:program.*` / `cbt:program.*` key shapes (`act-harris-happiness-trap.md:629`), with **programme** in every value.

---

## F — The gate list

Every check a DBT copy string (or the DBT spec / brief) must pass, by file. Automated gates first.

| File | What fails | Corpus |
| --- | --- | --- |
| `test/positioning-copy.test.ts` | the retired ‘guided’ compound rule (one intervening word allowed) — **also in `docs/`**; management verb + *your* + closed health-noun list; `dialectical behavior`, `cognitive behavioral`, `behavioral activation`; `behavior(s)`; end-to-end / zero-knowledge / "even we can't read"; affirmative AI therapist/coach/counsellor, AI-powered, "talk to an AI"; "no streaks" family; `favorite, color, organize, practicing, recognize, fulfill, fueled`, **`program(s)`**, **`judgm…`**; bg twins for each | scopes at `:797-801`; docs only for the `prose` rule; `PUBLISHED_RECORDS` `:129-137` exempt |
| `test/practice-copy.test.ts` | streak, overdue, you missed, keep it going/up, don't stop/break, back on track, see you, come back tomorrow/later/soon/every/each/daily, built momentum, never missing; bg list | all namespaces, both locales, values |
| `test/restraint-copy.test.ts` | no shame, shaming, never punish, punishes, punishment, no penalty, not a failure, pressure-negations; bg | all namespaces, both locales |
| `test/child-safety-copy.test.ts` | "X heals", retrain/rewire the brain, way to better mental health, clinically proven / proven to; **SUDS** anywhere; *hierarchy* under `cbt:exposure.*` (habit elsewhere); bg twins | all namespaces unless scoped |
| `test/no-unshipped-status-copy.test.ts` | soon, coming soon, on the roadmap, in design, next major release; bg скоро… | `navigation.sidebar/modulesPage/today.modules` + `modules` namespace only — a `dbt` namespace is out of range by construction |
| `test/over-use-copy.test.ts` | the "challenging has become checking" teaching on a third surface or under `policies:crisis` | all namespaces |
| `test/registration-invitation-copy.test.ts` | a registration invitation on any surface but the two sanctioned | i18n minus `policies` |
| `test/show-all-door-copy.test.ts` | an arrow glyph in a `showAll*`/`viewAll*`/`seeAll`/`allHistory.link` value | all namespaces |
| `test/i18n-key-coverage.test.ts` | a literal `t("…")` key that does not resolve in `en` (template-literal keys invisible) | `app/`, `src/` |
| `src/i18n/locale-parity.test.ts` | any key in one locale and not the other | every namespace |
| `test/module-home-header-stat-shape.test.ts` | `count` interpolated into a header stat's translated value | `app/`, `src/` |
| `test/module-identity-neutral.test.ts` | a module hue on an identity surface | listed files |
| `test/nav-singular.test.ts` · `test/therapy-modules-origin.test.ts` · `test/escape-coverage.test.ts` | an undeclared route; a bare `router.push` in `app/(app)/modules`; an uncovered Escape path | routes |
| `test/child-safety-cadence.test.ts` | the PR-template clause that a new module re-runs the child-safety review going missing | `.github/pull_request_template.md`, runbook |
| `src/features/policies/policy-content.test.ts` | any `.sections` edit to policy copy without a digest move | only if DBT copy touches policies — route around |

Human gates, in the order a reviewer applies them:

1. `docs/product-principles.md` §6 — the clinical-sense reach (`:31-33`): would a clinician hear a protocol or a diagnosis in this word? (*distress tolerance* no; *dysregulation*, *self-harm urge*, *borderline* yes.)
2. Map decision 15 — use context, never trait/condition/diagnosis.
3. `docs/child-safety-review.md:43` row 4 — the person's words about their own practice, not the clinician's about a protocol; `:84` row 10 — no acronym without its expansion on the surface; `:112` — an acronym beside its expansion is fine.
4. `docs/positioning.md:101-124` — method present on every tools surface; privacy never first; tools never enumerated in prose.
5. `docs/positioning.md:393` — the general management-verb rule beyond the closed list (*manage your emotions* is the DBT-shaped near miss).
6. §12 / ADR-0004 — every log a dated record with plain history; completion copy states the record and stops (decision 7).
7. Map decision 6 — no REST / FTB-Cope / FLAME / ABC / RAVEN, no workbook worksheet titles.
8. #1957 — the safety callout string on DBT's home must not name a module; until it lands the mismatch is known and owned elsewhere.
9. `docs/licensing.md:56-63` — record the two book sources (recommendation §B.3.6) and the ® open question (§B.3.5) before launch review at `:86-94`.
10. Bulgarian review — every bg candidate in §E is unreviewed; the distress-tolerance noun is a decision, not a translation (§C.4.2).
