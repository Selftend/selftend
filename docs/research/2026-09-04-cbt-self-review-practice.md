# What CBT asks a person to review about their own record

> Research for [Insights map ticket #1833](https://github.com/Selftend/selftend/issues/1833)
> (child of [#1826](https://github.com/Selftend/selftend/issues/1826)), resolved 2026-09-04.
> The map settled that a statistic on Insights is **evidence for the CBT work**. This checks
> that claim against the programme's own sources before the content ticket picks figures.

**Short answer.** Review in CBT is technique-local at every routine point, and its window is
"since we last spoke" — in practice the past week. The two recognised **cross-technique** review
objects both sit at the _end_ of a programme and are both **written by the person, not computed
about them**: the therapy blueprint and the "which skills helped" summary. No source read here
treats a count of completed exercises as a review object, and none uses a lifetime window for
anything. That is a silence, not a prohibition — but "evidence" is the wrong word to carry it,
because in CBT evidence always has a proposition attached, and a lifetime cross-tool count has none.

## 0. Where the claim came from inside this repo

The target-state doc is the first thing to check, because the map's framing traces to it.

`docs/modules/cbt-gillihan-made-simple.md` separates, per strategy, **"Key concepts from the
book"** from **"Tool features"** — what Gillihan wrote, versus what this product invented around
it. Strategy 10 (Integration and Recovery Plan) lists under _Tool features_:

> Personal stats summary (thought records completed, exposures done, days logged, goals achieved)

That is a cross-tool, lifetime, count-shaped summary — and it is on the **product-invention** side
of that doc's own line. Nothing in the "Key concepts from the book" column for Strategy 10
mentions counts; that column lists recovery keys, a personal slogan, virtuous circles, planning
for setbacks, and ongoing maintenance. So the repo has never actually attributed the stats summary
to Gillihan. **The map inherited a product idea, not a sourced one.**

The same doc uses the word _evidence_ about a figure exactly once, in Strategy 3:

> **Key insight display after completion:** Show the emotion intensity drop (before vs. after) as
> evidence that the exercise works.

Per-record, technique-local, before/after, attached to a claim being tested. That is the shape the
literature does support, and §4 below is about why it does not generalise to a screen-level total.

Two other repo facts are load-bearing for the map:

- **The app already ships a lifetime count inside CBT.** `docs/modules/cbt.md` records the CBT
  overview header stat run as "lifetime records, this month's records, and … the signed mean
  belief shift" (`src/features/cbt/cbt-home/derive-cbt-home-view.ts`). Whatever is decided here,
  it is a decision about a second occurrence, not a first.
- **The shipped weekly review already computes a hit-rate.**
  `app/(app)/modules/cbt/weekly-review.tsx` renders `completed / planned` as a percentage under
  the label "rate" — the ratio shape [#711](https://github.com/Selftend/selftend/issues/711)
  flagged unsafe for Insights. It survives there inside a teaching frame, the same carve-out the
  map used to keep cross-tool correlation inside CBT. Recorded as an observed tension; not
  resolved here.
- **The over-use copy already names the programme's own cadence.** `cbt:learn.pacing.rhythm`:
  "The programme's own rhythm is the pace: check-ins, a thought record when a feeling shifts, a
  review once a week." And `cbt:learn.pacing.signs`: "re-opening the same thought to feel certain,
  or challenging that has become checking." §2 and §3 below both land on that copy.

## 1. What is reviewed, and at what grain

**Routine review is layered, and every layer is technique-local or symptom-local.** Nothing in the
clinical sources aggregates across techniques.

Beck's own fidelity manual describes the start of session as "a brief resume of the patient's
experiences since last session … relevant events of the past week, discussion and feedback
regarding homework, and the patient's current emotional status (as indicated by the BDI score,
Anxiety Checklist score, and patient's verbal report of progress)"
([CTRS Manual, 2020](https://beckinstitute.org/wp-content/uploads/2021/06/CTRS-Manual-2020.pdf)).
Three objects, three grains: a symptom score, the specific homework item, and a verbal report.

The VA/DoD therapist manual — built on the Beck model — names the first of those a "Brief Mood
Check" and is explicit that reviewing homework means engaging with its content, not confirming it
happened: "It is not enough to simply acknowledge that a patient has completed a homework
assignment. Instead, it is important to ask patients **what they learned** from doing the
assignment"
([CBT-D Therapist Manual, p.47](https://mirecc.va.gov/MIRECC/docs/CBT-D_Manual_Depression.pdf)).
The NHS PWP training manual uses the same cadence for low-intensity work: "You will review the
progress of these activities at the beginning of each subsequent contact session"
([Reach Out, 3rd ed., p.24](https://www.rethink.org/media/2693/reach_out_3rd_edition.pdf)).

The self-help books match this exactly, per instrument:

- **Mind Over Mood** reviews the Weekly Activity Schedule with a dedicated worksheet, _Learning
  from the Weekly Activity Schedule_, asking "Did my mood change during the week? How? What
  patterns do I notice? … What activities helped me feel better? Why?" — the week's own data, read
  for patterns, not a tally ([1st ed. full text](https://archive.org/stream/mind-over-mood/Mind%20Over%20Mood_djvu.txt)).
- **Burns'** Daily Mood Log is keyed to a single upsetting event and rates each emotion and thought
  **% Before / % Goal / % After** ([official form](https://feelinggood.com/wp-content/uploads/2021/11/02-DML_final.pdf)).
  Strictly per-exercise.
- **Gillihan's** _Retrain Your Brain: CBT in 7 Weeks_ reviews at the end of each chapter — "At the
  end of each chapter you've been taking stock and summarizing your most important take-aways"
  ([Week 7](https://sethgillihan.com/week-7-cbt-7-weeks-integrating-work/)) — in narrative form.

**Cross-technique review exists, and it is a recognised practice — but it is neither numeric nor
computed.** Two named forms:

1. **The therapy blueprint** (Wells, 1997; standard end-of-therapy practice in UK CBT services).
   It covers the past (the problem and what maintained it), the present (what was learned and
   which skills developed), and the future (high-risk situations, early warning signs, a plan)
   ([Psychology Tools, Therapy Blueprint](https://www.psychologytools.com/resource/therapy-blueprint-universal)).
   Every prompt is a question the person answers in their own words.
2. **The "which skills helped" summary.** _Mind Over Mood_ 2nd ed. Ch.16 carries a section titled
   "Reviewing and Rating MOM2 Skills"
   ([Clinician's Guide TOC](https://www.padesky.com/wp-content/uploads/2023/10/TOC-Clin-Guide-Padesky-web-version.pdf))
   — a per-skill proficiency rating across the techniques taught. Gillihan's equivalent is a
   worksheet literally called **"Summarizing What Works for You"**, used open-endedly after the
   seven weeks ([The Next Seven Weeks](https://sethgillihan.com/cbt-7-weeks-next-seven-weeks-beyond/)).
   The VA/DoD manual does the same at termination: "the therapist asks the patient **which skills
   were most helpful** in reducing his depression" (p.144).

So the answer to "is reviewing one's own record across techniques a recognised practice?" is
**yes, once, at the end, and the review object is a sentence the person writes — not a number the
product computes**. Selftend already has this object: the recovery plan's recovery keys and
maintenance commitments (Strategy 10, shipped at `/modules/cbt/recovery`).

## 2. The time window

Every routine review window found in every source is **since last contact**, which in practice
means the past week:

| Source                                     | Window, in its own words                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| CTRS Manual (Beck)                         | "since last session … relevant events of the past week"                                                    |
| VA/DoD CBT-D Manual                        | "the therapist briefly assesses patients' mood in the time since the previous session" (p.37)              |
| Judith Beck, session transcripts (3rd ed.) | "just tell me, in your own words, how you've been feeling this week"; "what was good about the past week?" |
| NHS Reach Out (PWP)                        | "at the beginning of each subsequent contact session" (p.24)                                               |
| Mind Over Mood inventories                 | "Compare your scores once or twice each week"                                                              |
| Mind Over Mood Worksheet 15.1              | rates a mood's frequency, strength and duration **"this week"**                                            |
| Burns Depression Checklist                 | "during the past week, including today"                                                                    |
| Burns / TEAM-CBT Brief Mood Survey         | "Before Session / After Session … how you're feeling right now"                                            |
| Gillihan, _CBT in 7 Weeks_                 | end of each chapter, i.e. weekly                                                                           |

**The end-of-treatment review is the one place a longer window appears**, and it is the length of
the treatment episode, not a lifetime: the VA/DoD manual has the pair "review the changes in scores
on the BDI since the beginning of treatment" and review "all of the skills that were learned and
practiced during treatment" (p.144), plus booster sessions "many weeks or even months after the
final session" that review "sustained gains … since the termination of treatment" (pp.145–146).
Even there the objects are a symptom trend and a skills list — not counts.

**On lifetime / all-time totals: the sources are silent.** Searched across the CTRS manual, the
VA/DoD CBT-D manual, the Reach Out manual, the full text of _Mind Over Mood_ (1st ed.), Burns'
official forms, and Gillihan's own published programme material, **no source treats a cumulative
all-time figure as a review object**. That is an absence of endorsement, not a stated prohibition:
nothing anywhere says "do not show a lifetime total". Nobody thought to.

This is worth stating plainly for the map: **a weekly window is grounded in the literature; a
programme-length window is grounded at the end of a programme; a lifetime window is grounded in
nothing.** The shipped `cbt:learn.pacing.rhythm` copy — "a review once a week" — is a faithful
statement of the practice, and the app's own `/modules/cbt/weekly-review` is the correctly-shaped
surface for it.

## 3. What the sources warn against

**First, the honest finding: the CBT protocol sources and the self-help books do not warn about
this at all.** Grepping the CTRS manual, the VA/DoD CBT-D manual and the Reach Out manual for
"self-monitor", "over-monitor", "excessive", "compulsive" and "reassurance" in this sense returns
nothing relevant. _Mind Over Mood_'s full 1st-edition text contains no hit for "rumination",
"chore" or "burden". Gillihan's site material — from the one book in the set that markets itself on
being un-onerous — is silent too. The single soft equivalent found anywhere is _Mind Over Mood_
normalising a bad week's inventory score: "You may find that your scores fluctuate from week to
week or do not improve each and every time … This is not unusual nor is it a bad sign."

**The warnings are real, but they come from a different literature.** In rough order of how much
they should move a design decision:

- **Unsupported cognitive self-help made high-ruminators worse.** Haeffel (2010) randomised
  cognitively at-risk students to three self-directed workbooks. Those high in rumination who
  experienced stress "exhibited significantly greater levels of depressive symptoms after
  completing the traditional cognitive skills workbook than after completing the other two", at
  post-intervention and at four months
  ([PMID 19875102](https://pubmed.ncbi.nlm.nih.gov/19875102/)). This is the closest study in
  existence to Selftend's exact shape — CBT skills, no practitioner — and its finding is that the
  format can harm a specific, identifiable group.
- **Self-focus is not neutral.** Mor & Winquist's meta-analysis of 226 effect sizes found private
  self-focus more strongly associated with depression and generalised anxiety, the association
  stronger in clinical samples, and ruminative self-focus stronger still
  ([PMID 12081086](https://pubmed.ncbi.nlm.nih.gov/12081086/)). Correlational, heterogeneous,
  not about apps — but it is the mechanism the point above rests on.
- **Checking is a function, not a frequency.** Salkovskis' safety-behaviour model treats checking,
  body-scanning and reassurance-seeking as behaviours that relieve anxiety short-term while
  preventing disconfirmation; an experimental study found patients who dropped the safety
  behaviour showed greater reduction in catastrophic beliefs and anxiety than those who kept it
  ([Salkovskis et al., BRAT 1999](https://www.personal.kent.edu/~dfresco/CBT_Readings/BRAT_Salkovskis_1999.pdf)).
  **This is the sharpest confirmation of ADR-0004's ruling that "too much" is a mode and not an
  amount** — the literature's own discriminator is what the behaviour is _for_, not how often it
  happens. The shipped copy, "challenging that has become checking", is already saying exactly
  this.
- **Measuring a behaviour changes it.** Self-monitoring reactivity is old, well-replicated
  behavioural-assessment work: recording a behaviour shifts its frequency, usually in the
  therapeutically desired direction (Korotitsch & Nelson-Gray, 1999,
  [doi:10.1037/1040-3590.11.4.415](https://doi.org/10.1037/1040-3590.11.4.415); Nelson & Hayes,
  1981, [doi:10.1177/014544558151001](https://doi.org/10.1177/014544558151001)). For a product
  this cuts both ways: **a visible, growing count is itself a nudge to grow it.**
- **Measurement raises volume and lowers enjoyment.** Etkin's six experiments found that measuring
  an activity increases how much of it people do while reducing how much they enjoy it, by drawing
  attention to output and making the activity feel like work — with downstream drops in continued
  engagement and wellbeing ([doi:10.1093/jcr/ucv095](https://doi.org/10.1093/jcr/ucv095)). Tested
  on steps and pages read, not on thought records; the extension is an analogy, not a finding.
- **People stop logging exactly when they are worst.** In interviews with 22 mood-tracking app
  users, a recurring pattern was avoiding the app during bad periods — "whenever I had a bad
  experience, I didn't want to put it in the app" — and scepticism that a score captures anything
  ([Schueller et al., JMIR Ment Health 2021](https://mental.jmir.org/2021/8/e29368)). **Any count
  Selftend shows is therefore a biased sample that under-represents the worst weeks**, which
  matters for how a subtitle describes the axis.
- **Tracking apps and eating-disorder symptoms.** 73% of MyFitnessPal users in a clinical
  eating-disorder sample perceived it as contributing to their disorder
  ([Levinson et al., 2017](https://doi.org/10.1016/j.eatbeh.2017.08.003)); in a general
  undergraduate sample, calorie and fitness tracking were associated with disordered-eating
  symptomatology ([Simpson & Mazzeo, 2017](https://pubmed.ncbi.nlm.nih.gov/28214452/)). Both are
  cross-sectional and self-report; a qualitative CHI study of women with ED histories found
  genuine ambivalence rather than uniform harm
  ([Eikey & Reddy, 2017](https://dl.acm.org/doi/10.1145/3025453.3025591)). Suggestive of the
  mechanism — numbers becoming the object — in a different domain.
- **Weak, and widely over-cited: "orthosomnia".** Three patients who "spent excessive time in bed
  trying to increase the sleep duration reported by the tracker"
  ([Baron et al., JCSM 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5263088/)). A case series of
  n=3 with no baseline; the authors say so themselves. A vivid illustration, not evidence.
- **Thin to absent:** peer-reviewed evidence that step/fitness-tracker checking is compulsive in
  the general population. Widely asserted in popular coverage without a traceable study behind it.

**Nothing found contradicts ADR-0004.** The safety-behaviour literature endorses its mode-not-amount
ruling directly. Two findings _add_ something ADR-0004's scope does not cover, because they are
about the product's own display rather than the user's usage: reactivity and Etkin together say a
**displayed count can itself convert the mode**, by making the number the thing being managed.
That is a claim about what Insights shows, not about how much someone uses the app.

## 4. Is a cross-tool aggregate figure supported as "evidence"?

**No — and the reason is specific rather than squeamish. In CBT, "evidence" always has a
proposition attached.** Every use of the word in the sources is evidence _for or against something
the person is testing_: evidence for and against a hot thought; intensity before versus after on
one record; belief in a thought re-rated; a symptom score compared with last week's; a behavioural
experiment's prediction against what actually happened. The repo's own single use of the word
matches — the before/after drop shown "as evidence that the exercise works" tests a claim the
person has just made.

A lifetime cross-tool count has no proposition attached. Nothing is being tested by it. Calling it
"evidence for the CBT work" borrows a word the sources reserve for something structurally
different, and the borrowing is what makes the figure feel justified.

**The nearest genuine support, and why it does not carry.** Kazantzis et al.'s meta-analysis found
homework compliance _quantity_ related to outcome at post-treatment (g = 0.79, k = 15, n = 1537)
and at follow-up (g = 0.51)
([doi:10.1016/j.beth.2016.05.002](https://www.sciencedirect.com/science/article/abs/pii/S0005789416300296)).
This is the one place in the literature where volume of completed exercises is tied to getting
better. Three things stop it licensing a screen figure:

1. It is **compliance with assigned homework** — a ratio against what a therapist set. Selftend
   assigns nothing, so there is no denominator and the construct does not exist here.
2. It is measured **within one bounded treatment episode**, not over a lifetime.
3. It was **never shown to the client**. It is a research and supervision measure. No source
   proposes reflecting it back to the person as a display.

**What a cross-tool object _is_ licensed to be:** the end-of-programme integration object of §1 —
a blueprint, or a "what worked for me" list. It is cross-technique by design, it is the recognised
practice, and it is **authored by the person**. That property is not incidental: a user-written
summary is the only cross-tool shape that satisfies
[#711](https://github.com/Selftend/selftend/issues/711)'s "show the record, don't read it", because
the person supplies the reading and the product supplies the page.

**Where the sources are silent, said plainly:** no source read here says a cross-tool count is
harmful, and no study has examined one. The evidence base is all single-behaviour tracking over
days to months. So the finding is not "the literature forbids this figure" — it is **"the
literature does not supply the word 'evidence' for it"**. A count can still be a true, calm
statement of what is in the record. It just is not evidence, and it should not be defended as such.

## Design implications for the Insights spec

1. **Drop "evidence" as the justification, or attach a proposition.** If a figure answers a
   question the user asked, it is evidence; if it does not, it is a fact about the record — which
   is a legitimate thing for a screen to show, and is exactly what #711 permits. The two need
   different copy and different defences.
2. **The grounded windows are the past week and the length of the programme.** Nothing supports a
   lifetime figure; nothing forbids one either. If a lifetime count ships, it ships as an index of
   what exists, not as a measure of progress — and the map should say so rather than inherit
   "evidence".
3. **The map's doors-not-copies rule is the literature's own shape.** Every source's review object
   is the _item_ — the record, the schedule, the week — read for its content. A number that opens
   the records it counts is behaving as an index; a number that stands alone is behaving as a
   claim.
4. **Do not let the number grow into the goal.** Reactivity says counting a behaviour changes its
   frequency; Etkin says measurement raises volume and lowers enjoyment. A prominent lifetime
   figure that only ever rises is a nudge to raise it — the retention shape `product-principles.md`
   §12 rules out. This is an argument for windowed figures over cumulative ones on presentation
   grounds alone.
5. **Any count under-represents the worst weeks.** People stop logging when they are worst
   (Schueller 2021). A subtitle describing the axis must not imply the record is complete, and no
   figure should be shaped so that a thin stretch reads as a bad stretch.
6. **The recognised cross-tool object already exists in the app, and it is user-written.** The
   recovery plan's recovery keys and maintenance commitments are Selftend's blueprint. Insights
   carrying a **door** to it is supported by the sources; Insights **computing** a cross-tool
   summary is not.
7. **The pacing card is already right and needs no change.** "A review once a week" is the
   literature's cadence verbatim, and "challenging that has become checking" is the
   safety-behaviour discriminator in plain words.

## Open tension, recorded not resolved

`app/(app)/modules/cbt/weekly-review.tsx` renders a `completed / planned` completion-rate
percentage — the hit-rate ratio #711 called unsafe. It sits inside the CBT programme, where a
teaching frame exists, which is the same carve-out the map used to keep cross-tool correlation
inside CBT. Whether that carve-out holds for a bare percentage with no teaching around it is a
question for the CBT module, not for the Insights spec, and it is flagged here only so the spec
does not cite the weekly review as precedent for a ratio on Insights.

## Sources

**Clinical protocol sources**

- Beck Institute — Cognitive Therapy Rating Scale Manual (2020) — [PDF](https://beckinstitute.org/wp-content/uploads/2021/06/CTRS-Manual-2020.pdf)
- Wenzel, Brown & Karlin (2011), VA/DoD, _Cognitive Behavioral Therapy for Depression in Veterans and Military Servicemembers: Therapist Manual_ — [PDF](https://mirecc.va.gov/MIRECC/docs/CBT-D_Manual_Depression.pdf)
- Richards & Whyte (2011), _Reach Out_ (NHS PWP training manual, 3rd ed.) — [PDF](https://www.rethink.org/media/2693/reach_out_3rd_edition.pdf)
- Judith Beck, _Cognitive Behavior Therapy: Basics and Beyond_ (3rd ed.) — annotated session transcripts, [Session 2](https://beckinstitute.org/wp-content/uploads/2021/06/BB3-Session-2-Annotated-Transcript.pdf), [Session 10](https://beckinstitute.org/wp-content/uploads/2021/06/BB3-Session-10-Annotated-Transcript.pdf)
- Society of Clinical Psychology (APA Div. 12), Cognitive Therapy for Depression — [page](https://div12.org/treatment/cognitive-therapy-for-depression/)
- Psychology Tools, Therapy Blueprint (after Wells, 1997) — [page](https://www.psychologytools.com/resource/therapy-blueprint-universal)

**Self-help programme sources**

- Greenberger & Padesky, _Mind Over Mood_ — [1st ed. full text](https://archive.org/stream/mind-over-mood/Mind%20Over%20Mood_djvu.txt); [Worksheet 15.1 PDF](https://www.padesky.com/wp-content/uploads/2023/07/MOM2-MeasureTrackMoodsWorksheet-15_1-p253.pdf); [Clinician's Guide TOC](https://www.padesky.com/wp-content/uploads/2023/10/TOC-Clin-Guide-Padesky-web-version.pdf)
- Burns, Daily Mood Log — [official form PDF](https://feelinggood.com/wp-content/uploads/2021/11/02-DML_final.pdf); Burns Depression Checklist — [PDF](https://www.ssmhealth.com/getmedia/22ac22d5-0f2d-40c8-98bc-71a019d5d970/burns_depression_checklist.pdf)
- Gillihan, _Retrain Your Brain: CBT in 7 Weeks_ — [Week 7](https://sethgillihan.com/week-7-cbt-7-weeks-integrating-work/), [The Next Seven Weeks and Beyond](https://sethgillihan.com/cbt-7-weeks-next-seven-weeks-beyond/)

**Evidence on monitoring, counting and harm**

- Haeffel (2010), _Behav Res Ther_ — [PMID 19875102](https://pubmed.ncbi.nlm.nih.gov/19875102/)
- Mor & Winquist (2002), _Psychol Bull_ meta-analysis — [PMID 12081086](https://pubmed.ncbi.nlm.nih.gov/12081086/)
- Korotitsch & Nelson-Gray (1999), _Psychol Assess_ — [doi:10.1037/1040-3590.11.4.415](https://doi.org/10.1037/1040-3590.11.4.415)
- Nelson & Hayes (1981), _Behav Modif_ — [doi:10.1177/014544558151001](https://doi.org/10.1177/014544558151001)
- Salkovskis et al. (1999), _Behav Res Ther_, safety behaviours — [PDF](https://www.personal.kent.edu/~dfresco/CBT_Readings/BRAT_Salkovskis_1999.pdf)
- Etkin (2016), _J Consumer Research_ — [doi:10.1093/jcr/ucv095](https://doi.org/10.1093/jcr/ucv095)
- Schueller, Neary, Lai & Epstein (2021), _JMIR Ment Health_ — [article](https://mental.jmir.org/2021/8/e29368)
- Levinson, Fewell & Brosof (2017), _Eating Behaviors_ — [doi:10.1016/j.eatbeh.2017.08.003](https://doi.org/10.1016/j.eatbeh.2017.08.003)
- Simpson & Mazzeo (2017), _Eating Behaviors_ — [PMID 28214452](https://pubmed.ncbi.nlm.nih.gov/28214452/)
- Eikey & Reddy (2017), _CHI_ — [doi:10.1145/3025453.3025591](https://dl.acm.org/doi/10.1145/3025453.3025591)
- Baron et al. (2017), _J Clin Sleep Med_, orthosomnia — [PMC5263088](https://pmc.ncbi.nlm.nih.gov/articles/PMC5263088/)
- Kazantzis et al. (2016), _Behavior Therapy_, homework compliance meta-analysis — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0005789416300296)

**Not reachable from this environment** (recorded so a later pass does not re-spend the time):
`cci.health.wa.gov.au` refuses connections here, so the CCI self-help modules — a
government-published CBT programme with an explicit self-management/maintenance module — went
unread. Judith Beck's _Basics and Beyond_ 3rd-ed. chapters on Self-Therapy Sessions and
termination are paywalled; the VA/DoD manual's booster-session material stands in for them and is
built on the same model, but the specific "Self-Therapy Session" cadence is unverified.
