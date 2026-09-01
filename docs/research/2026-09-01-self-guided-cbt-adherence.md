# Self-guided CBT adherence: what reminders, chunking and first sessions actually move

> Research for [practice-boundary ticket #1660](https://github.com/Selftend/selftend/issues/1660)
> (map #1655), resolved 2026-09-01. Feeds _The return path_ (#1663). Primary sources only —
> every figure below was read from the journal abstract or full text on 2026-09-01.

## Bottom line for the map

- **Unguided iCBT works, modestly, and most people do not finish it.** g = 0.27, NNT 8 (Karyotaki 2017, 13 RCTs); dropout 74% unsupported vs 28% therapist-supported (Richards & Richardson 2012, 40 studies); real-world completion 0.5–28.6% (Fleming 2018); apps keep a median 3.3% of users at day 30 (Baumel 2019, 93 apps).
- **Human support is the only adherence lever with meta-analytic weight**; its clinical edge is small (−0.8 PHQ-9 post-treatment, nil at 6 and 12 months) and confined to moderate–severe depression (Karyotaki 2021). NICE's first-line option is _guided_ self-help; unguided digital CBT is not on its table.
- **Structural predictors are essentially unmeasured.** Both IPD meta-analyses of dropout (Karyotaki 2015; Tong 2026, 71 trials) report only participant-level predictors — male, younger, less educated, unemployed, more severe — none of which the product controls.
- **Reminders raise completion inside a programme; nothing shows they change return after it.** Automated emails lifted completion from 36% to 58% (Titov 2013 RCT); a push makes an app-open in the next hour 3.5× as likely but leaves time-to-disengagement unchanged (Bell 2023); pooled prompt effect RR 1.27, wide CI (Alkhaldi 2016); across 92 RCTs the count of persuasive-design features predicts neither engagement nor efficacy (Valentine 2025).
- **No trial separates opt-in from default-on.** Alkhaldi looked and found none. Selftend's opt-in rule (#28) is ethics, not an evidenced retention cost or gain.
- **Chunking: frequency helps, brevity alone does not.** More frequent intended use predicted adherence across 83 interventions (β = .27, Kelders 2012, observational); one brief CBT module was ineffective while two worked, at flat ~25% completion whatever the length (Christensen 2006, n = 2,794). No daily-vs-weekly trial exists.
- **"But you are free" does not transfer.** r = .13 overall, r = .07 when the decision is not made in the requester's presence (Carpenter 2013); g = 0.11, n.s., in the seven low-risk studies of a 2023 re-analysis. It measures one-off compliance, never return.
- **First-session content is untested as a retention variable.** Indirect evidence says open with an active skill (behavioural activation iSMD −0.31 vs psychoeducation −0.06, Furukawa 2021) because the exit is early (34% vs 11% quit before lesson 3, Titov 2013). Build session one for effect and let the 72-hour activation row measure return.

## 1. Adherence and dropout, unguided vs guided

**Finding.** Unguided iCBT is effective but weak, and dropout is its defining problem. Support cuts dropout more than any design variable; the predictors the IPD literature can see are demographic, not structural.

- Richards & Richardson 2012 (meta-analysis, 40 studies, 7,313 in the dropout analysis; computerised treatments for depression): d = 0.56 post-treatment; overall dropout 57%; by support 74% (none), 38.4% (administrative), 28% (therapist); OR none-vs-therapist 7.35. RCT dropout 63.8% vs 37.9% in open trials.
- Musiat 2022 (22 studies): guidance raises amount completed, g = 0.29 [0.18–0.40]; full completion 12 points higher.
- Karyotaki 2021 (IPD network meta-analysis, 39 RCTs with data, 9,751): guided beats unguided by MD −0.8 PHQ-9 at post-treatment [−1.4 to −0.2], no difference at 6/12 months; the advantage appears only above PHQ-9 9 — for mild/subthreshold scores (5–9) the formats are equivalent.
- Karyotaki 2017 (IPD, 13 RCTs, 3,876, self-guided only): g = 0.27 vs control, NNT 8; adherence predicts outcome (β = −0.19, p = .001).
- Karyotaki 2015 (IPD, 10 RCTs, 2,705, self-guided) and Tong 2026 (IPD, 71 trials / 85 arms, 8,082; adherence = share of modules completed) find the same participant-level predictors — male (RR 1.08), lower education (RR 1.26), comorbid anxiety (RR 1.18), younger age, unemployment, higher endpoint severity — and Tong finds none interacting with guided vs self-guided format. Neither reports module count, programme length or reminders as predictors.
- Beatty & Binnion 2016 (systematic review, 36 studies): most candidate predictors mixed or null; personalised content and having time were the consistent positives.
- Trials flatter reality. Fleming 2018 (7 real-world deployments): completion 0.5–28.6%; MoodGYM 0.5% in the community vs 22.5% in its trial. Baumel 2019 (93 apps, panel data): 15-day retention median 3.9%, 30-day 3.3%, daily open rate 4.0%.
- NICE NG222 (2022, rec. 1.5.2 and Table 1): "consider the least intrusive and least resource intensive treatment first (guided self-help)" — printed or digital CBT/BA/problem-solving materials _with_ "support from a trained practitioner who … encourages completion and reviews progress", 6–8 sessions. Unguided digital CBT is not listed.

**Structural vs support-related.** No IPD analysis isolates session length, programme length or opening content. The structural evidence is Kelders 2012 and Christensen 2006 (items 3 and 5): plausible, correlational, unquantified at the trial level. Support is the only established lever.

## 2. Reminders

**Finding.** Automated prompts raise within-programme completion. Their effect on long-run return is unmeasured or null. Opt-in vs default-on has never been randomised.

- Titov 2013 (RCT, n = 257; adults with elevated PHQ-9/GAD-7; 8-week self-guided transdiagnostic course): automated emails (≥ 2/week — lesson-done notes, unread-after-7-days reminders, new-content notices) → completion 58.0% vs 35.8%; quit before lesson 3: 11.0% vs 34.0%. Whole-sample symptoms did not differ (PHQ-9 d = 0.19, p = .33; GAD-7 d = 0.22, p = .15); only the comorbid subsample did (d = 0.56 / 0.65). All participants consented to the emails — a default-on arm, not opt-in.
- Alkhaldi 2016 (systematic review, 14 studies, 8,774; 9 pooled): prompts → engagement RR 1.27 [1.01–1.60], I² = 71%; continuous measures SMD 0.19, n.s. Email in 11 of 14. Stated outright: no study compared user-chosen with default prompting.
- Bidargaddi 2018 (micro-randomised trial, 1,255 users of a workplace wellbeing app who had push enabled, 89 days): a tailored push → 3.9% relative lift in 24-hour engagement (RR 1.039 [1.01–1.08]); 11.8% at weekend midday, 2.5% on weekdays; no decay over 13 weeks. This self-selected cohort is the closest thing to an opt-in population in the set, and shows the smallest lift.
- Bell 2023 (micro-randomised trial, n = 350, Drink Less alcohol app, 30 days): a notification → 3.5× [2.91–4.25] odds of opening in the next hour; time-to-disengagement did not differ between standard, none and randomised notifications.
- Linardon 2020 (70 RCTs of smartphone mental-health interventions): attrition 24.1% short-term, 35.5% long-term; trials using reminders had lower attrition (a between-study moderator, not randomised).
- Valentine 2025 (92 RCTs, 16,728): number of persuasive-design principles (median 5; reminders among them) unrelated to efficacy (b = 0.01, p = .80) or completion (r = 0.21, p = .43); the dialogue-support domain that holds reminders, b = 0.06, p = .18. Wu 2021 (15 RCTs, 29 apps): more persuasive features → larger effect (β = 0.045, p = .016) but _lower_ completion (β = −0.029, p = .028).
- Furukawa 2021: human plus automated encouragement reduced dropout, incremental OR 0.32 [0.13–0.93]; automated alone imprecise.

**Opt-in vs default-on: not established.** Stawarz 2015 (see the 2026-07-14 note) adds that reminders support repetition but hinder automaticity — the map's own goal is the skill becoming automatic, not the app.

## 3. Chunking and session length

**Finding.** Frequency of contact is associated with adherence; brevity by itself is not, and a session can be too short to work. No trial randomises daily steps against weekly modules (searched 2026-09-01).

- Kelders 2012 (83 web interventions, mean adherence 50.3%): in a regression explaining 55% of adherence variance, more frequent _intended_ usage β = .27 (p = .014), dialogue support β = .36, counsellor interaction β = .22. Cross-intervention, observational.
- Christensen 2006 (online RCT, n = 2,794 public registrants, six MoodGYM versions): Module 1 alone (brief introductory CBT) did not reduce depression; versions with two CBT modules did (effect vs Module 1 = 0.40 for Modules 1+2+5). Only 20.4% completed their assigned version and post-test completion was flat, 23–28%, across 1- to 5-module versions — length did not cost dropout, shortness did not buy effect.
- Single sessions work, a little. Schleider 2022 (RCT, n = 2,452, ages 13–16, online SSIs): behavioural-activation and growth-mindset SSIs each d = 0.18 on 3-month depression. Kaveladze 2026 (RCT, n = 7,505 US adults, twelve 10-minute SSIs, 97.8% finished the session): nearly all improved immediate outcomes (d ≤ 0.37); at 4 weeks only two held (d = 0.14, 0.15), and completing one slightly _reduced_ confidence about changing (d = 0.05).
- Titov 2013 locates the exit: most quitting happens before lesson 3.

**Transfer.** The evidence supports short, frequent, _effective_ units — a ten-minute step that teaches a usable skill — over either a one-off or a weekly hour. "Short daily steps complete more often than weekly modules" is a reasonable hypothesis, not a finding.

## 4. The autonomy finding ("but you are free")

- Carpenter 2013 (meta-analysis, 42 studies, N ≈ 22,000; _Communication Studies_): adding "but you are free to refuse" to a request, r = .13, weighted OR 2.03 — the "doubles compliance" Eyal cites. Immediate, requester-present decisions (32 studies, N = 13,434): r = .18, OR 2.20. Decision made later, by email or returned survey (10 studies, N = 8,799): r = .07, OR 1.77, 80% credibility interval −0.01 to .15. Requests were street donations, bus fare and surveys; the outcome is one yes/no; most studies come from two labs; sample size correlated −.30 with effect size (a publication-bias signal).
- Fillon, Souchet, Pascual & Girandola 2023 (pre-registered re-analysis, 52 experiments, 19,528; _Meta-Psychology_): naïve g = 0.44 [0.36–0.51], but R-index 9.8% and expected discovery rate 6%; in the seven low-risk studies g = 0.11 [−0.18, 0.40]; effect stronger face-to-face.
- **Transfer to in-app copy: not supported.** An app screen is the technique's weakest cell — mediated, delayed — and what it measures is compliance with a single request, not sustained return. The map's reading ("evidence that opt-in is _effective_, not only ethical") should be dropped; keep "you can turn this off" as a requirement and expect no retention dividend from the phrasing.

## 5. First-session content

**Finding.** No trial randomises opening content and measures retention — not established. Indirectly: active techniques carry the effect, psychoeducation does not, and the dropout cliff is before session 3.

- Furukawa 2021 (component network meta-analysis, 76 RCTs, 17,521): behavioural activation iSMD −0.31 (iMD −1.83 PHQ-9 [−2.90 to −0.80]); psychoeducation −0.06 [−1.27 to 0.57], minimal; cognitive restructuring 0.05; relaxation +0.20, possibly harmful.
- Christensen 2006: the introductory CBT module alone was ineffective; two modules were.
- Kaveladze 2026: the two SSIs that lasted were an interactive cognitive-reappraisal exercise (the user reframes their own thought) and an attention-skills exercise; the psychoeducational "5 habits" SSI and, notably, the validated behavioural-activation comparator were null at 4 weeks.
- Titov 2013: 34% quit before lesson 3 without emails, 11% with. Alkhaldi 2016: the one study that varied timing found prompts sent early engaged more.
- Nothing compares assessment-first with technique-first. Karyotaki 2017's adherence–outcome link (β = −0.19) is consistent with "a first session that helps gets a second" but does not prove it.

**Implication.** Put a working technique in session one because that is where the effect is and where the exit is; do not claim it retains.

## Sources

- Richards & Richardson (2012), _Clin Psychol Rev_ — [doi:10.1016/j.cpr.2012.02.004](https://doi.org/10.1016/j.cpr.2012.02.004)
- Musiat et al. (2022), _Psychol Med_ — [doi:10.1017/S0033291721004621](https://doi.org/10.1017/S0033291721004621)
- Karyotaki et al. (2021), _JAMA Psychiatry_ — [doi:10.1001/jamapsychiatry.2020.4364](https://doi.org/10.1001/jamapsychiatry.2020.4364)
- Karyotaki et al. (2017), _JAMA Psychiatry_ — [doi:10.1001/jamapsychiatry.2017.0044](https://doi.org/10.1001/jamapsychiatry.2017.0044)
- Karyotaki et al. (2015), _Psychol Med_ — [doi:10.1017/S0033291715000665](https://doi.org/10.1017/S0033291715000665)
- Tong et al. (2026), _Nature Mental Health_ — [doi:10.1038/s44220-026-00707-4](https://doi.org/10.1038/s44220-026-00707-4)
- Beatty & Binnion (2016), _Int J Behav Med_ — [doi:10.1007/s12529-016-9556-9](https://doi.org/10.1007/s12529-016-9556-9)
- Fleming et al. (2018), _J Med Internet Res_ — [doi:10.2196/jmir.9275](https://doi.org/10.2196/jmir.9275)
- Baumel et al. (2019), _J Med Internet Res_ — [doi:10.2196/14567](https://doi.org/10.2196/14567)
- NICE NG222 (2022), _Depression in adults_, rec. 1.5.2 — [nice.org.uk/guidance/ng222](https://www.nice.org.uk/guidance/ng222)
- Titov et al. (2013), _PLoS ONE_ — [doi:10.1371/journal.pone.0062873](https://doi.org/10.1371/journal.pone.0062873)
- Alkhaldi et al. (2016), _J Med Internet Res_ — [doi:10.2196/jmir.4790](https://doi.org/10.2196/jmir.4790)
- Bidargaddi et al. (2018), _JMIR mHealth uHealth_ — [doi:10.2196/10123](https://doi.org/10.2196/10123)
- Bell et al. (2023), _JMIR mHealth uHealth_ — [doi:10.2196/38342](https://doi.org/10.2196/38342)
- Linardon & Fuller-Tyszkiewicz (2020), _J Consult Clin Psychol_ — [doi:10.1037/ccp0000459](https://doi.org/10.1037/ccp0000459)
- Valentine et al. (2025), _npj Digital Med_ — [doi:10.1038/s41746-025-01567-5](https://doi.org/10.1038/s41746-025-01567-5)
- Wu et al. (2021), _npj Digital Med_ — [doi:10.1038/s41746-021-00386-8](https://doi.org/10.1038/s41746-021-00386-8)
- Furukawa et al. (2021), _Lancet Psychiatry_ — [doi:10.1016/S2215-0366(21)00077-8](<https://doi.org/10.1016/S2215-0366(21)00077-8>)
- Kelders et al. (2012), _J Med Internet Res_ — [doi:10.2196/jmir.2104](https://doi.org/10.2196/jmir.2104)
- Christensen et al. (2006), _Psychol Med_ — [doi:10.1017/S0033291706008695](https://doi.org/10.1017/S0033291706008695)
- Schleider et al. (2022), _Nat Hum Behav_ — [doi:10.1038/s41562-021-01235-0](https://doi.org/10.1038/s41562-021-01235-0)
- Kaveladze et al. (2026), _Nat Hum Behav_ — [doi:10.1038/s41562-026-02415-6](https://doi.org/10.1038/s41562-026-02415-6); preprint [PMC12408015](https://pmc.ncbi.nlm.nih.gov/articles/PMC12408015/)
- Carpenter (2013), _Communication Studies_ — [doi:10.1080/10510974.2012.727941](https://doi.org/10.1080/10510974.2012.727941)
- Fillon et al. (2023), _Meta-Psychology_ — [doi:10.15626/MP.2020.2640](https://doi.org/10.15626/MP.2020.2640)
- Stawarz, Cox & Blandford (2015), CHI — cited in [2026-07-14-habit-stacking-behavioral-activation.md](2026-07-14-habit-stacking-behavioral-activation.md)
