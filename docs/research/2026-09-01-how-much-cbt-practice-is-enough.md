# How much CBT practice is enough: Gillihan's pacing, homework dose–response, rumination, and heavy use in apps

> Research for [wayfinder research ticket #1661](https://github.com/Selftend/selftend/issues/1661), child of [map #1655](https://github.com/Selftend/selftend/issues/1655) (the practice boundary), resolved 2026-09-01. Every external source below was checked on 2026-09-01.

## Bottom line for the map

- **The programme's "enough" is a rhythm, not a count.** Gillihan's spec expects on-demand thought records, morning and evening check-ins, a weekly review, and maintenance from weeks 8–12 (`docs/modules/cbt-gillihan-made-simple.md:767-789`); neither in-repo doc gives a records-per-week figure or warns against overdoing, and the author's framing is "use as much or as little as you like".
- **The homework literature has no ceiling and no harm signal, because nobody has looked.** Three meta-analyses (k = 17–46) find more and better homework predicts better outcome (r ≈ .26; g ≈ 0.8), quality and quantity indistinguishable (g 0.78 vs 0.79); none models nonlinearity, and "compliance" means the share of _assigned_ tasks done — more than assigned is outside the construct.
- **Where dose has been modelled, the curve is logarithmic.** Benefit tracks activities completed per visit and the first ~4 weeks, not log-ins or minutes (Donkin 2013; Enrique 2019); optimal therapy dose is 4–26 sessions, 4–6 for guided self-help (Robinson 2020; NICE NG222 says 6–8).
- **Reflection becomes rumination by mode, not by count.** Abstract "why am I like this", self-immersed, emotion-only processing worsens mood and symptoms; concrete, self-distanced, cognition-plus-emotion processing helps (Watkins 2008; Kross 2005; Ullrich 2002). No study has tested repeated thought-record use as a rumination trigger.
- **The one documented harm from over-applying cognitive techniques is in OCD**, where thought challenging "can easily become reassurance-seeking strategies and thus serve as compulsive rituals" (IOCDF) — the same safety-behaviour family the spec already names (`cbt-gillihan-made-simple.md:353`).
- **No consumer mental-health app caps, warns, or refers out on heavy use.** Headspace, Calm, Finch, Daylio, Wysa and Woebot publish floors ("10-20 minutes ... at least 3 times a week"; "meditate daily") and refer out only for crisis. Break reminders exist only where the business model is time-on-app (Instagram, TikTok, YouTube).
- **No regulator or store has an over-use standard for health apps.** NICE's ESF (21 standards, Aug 2022), ORCHA's 350+ criteria, Apple 1.4.1/5.1.3 and Google Play's health-apps policy are all silent; the European Parliament's 2023 addictive-design resolution targets mechanics (infinite scroll, autoplay, streaks, notifications), not volume. Per-app time caps are an OS feature the user sets (Screen Time App Limits, Digital Wellbeing app timers).
- **Implication:** the defensible notion of "enough" is the programme's own rhythm and graduation, and the risk worth designing against is _mode_ (a record that stays in "why", re-opens the same hot thought, or is used to get certainty), not frequency. That obligation is met by the shape of the tools, without reading anyone's record.

## 1. Gillihan's pacing (in-repo)

The target spec sets the tone at onboarding — "set expectation that this is a practice, not a quick fix" (`docs/modules/cbt-gillihan-made-simple.md:760`) — and in goal-setting: "Find the 'right gear' - moderately challenging goals you can sustain (not too easy, not overwhelming)" (:63) and "Think marathon, not sprint" (:66).

Cadence is a daily shape, not a quota (:767-771):

- "**Morning check-in:** mood log, top intention for the day, review any scheduled activities"
- "**During-day (on-demand):** thought record, anger log, worry entry, procrastination task"
- "**Evening check-in:** self-care log, mood log, activity log completion, gratitude"

plus a "Weekly Review (prompted on a user-configured day)" (:773). Thought records are _event-triggered_: "A sudden shift toward negative emotion, persistent feelings, or physical tension signals an automatic thought worth examining" (:153). The arc is twelve weeks into maintenance (:786-789): Week 1 "first thought record completed"; Weeks 4-8 "Regular daily check-ins; patterns visible in data"; Weeks 8-12 "Recovery plan drafted; maintenance mode begins"; then "Ongoing maintenance: don't stop helpful practices when feeling better" (:523).

The only count in either doc is a pattern hint "after 3+ thought records" (:224). There is no records-per-week figure and no warning against overdoing in either file; the nearest things are the safety-behaviour list — "reassurance-seeking, escape, checking ... must be reduced during exposure" (:353) — and the deliberately lighter "2-3 prompts, not the full thought record" for procrastination (:315). The as-built spec matches: reminders "default-off" (`docs/modules/cbt.md:38`), every prompt optional at save (:61), drafts expire after 24 hours (:57), and the overview shows "lifetime records, this month's records" (:17) — a record of practice, never a target.

The book itself was not re-read. The author's page describes it as "Find what you need and use as much or as little as you like" (sethgillihan.com); his companion workbook is titled _Retrain Your Brain: CBT in 7 Weeks_ — one chapter a week by its title, verified no further.

## 2. Homework dose–response

| Study                                  | Design                                      | Finding                                                                                                                                   |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Kazantzis, Whittington & Dattilio 2010 | Meta-analysis, 46 studies, N = 1,072        | Pre–post d = 1.08 with homework vs 0.63 without; pooled controlled d = 0.48 favouring homework                                            |
| Mausbach et al. 2010                   | Meta-analysis, 23 studies, N = 2,183        | Compliance–outcome r = .26 (95% CI .19–.33), robust across depression and anxiety; size varies with how compliance is rated               |
| Kazantzis et al. 2016                  | Meta-analysis, 17 studies, N = 2,312        | Post-treatment quality g = 0.78 (k = 3) vs quantity g = 0.79 (k = 15); follow-up quality g = 1.07 (k = 3) vs quantity g = 0.51 (k = 7)    |
| Conklin & Strunk 2015                  | 53 depressed adults, first five CT sessions | Within-patient variation in homework engagement predicted next-session improvement; effort and _cognitive_ homework the strongest signals |

Kazantzis's own reading (Beck Institute, 2021): "homework quantity and quality have little difference in their relations with outcome". None of the abstracts mentions nonlinearity, a ceiling, or harm, and a search for curvilinear homework findings returned nothing — the absence is the finding.

The dose evidence that does model shape concerns sessions and digital usage. Robinson, Delgadillo & Kellett 2020 (26 studies) found a replicated "curvilinear (log-linear or cubic) relationship between treatment length and outcomes"; "optimal doses ... range between 4 and 26 sessions (4-6 for low intensity guided self-help)"; weekly contact accelerates improvement. NICE NG222 (2022): CBT-based guided self-help "usually ... 6 to 8 structured regular sessions"; individual CBT 8 or 16 sessions by severity; review at 4–6 weeks if no response (recs 1.5.2, 1.6.1, 1.9.1). In online CBT for depression, Donkin et al. 2013 (RCT, 214 with outcomes) found only "activities completed per log-in" predicted clinically significant change (OR 2.82) — not log-ins, minutes or modules — with a logarithmic curve where "medium level users appeared to have little additional benefit compared to low users". Enrique et al. 2019 (n = 216) found the reliable-change group's usage "was higher during the first 4 weeks, and then a significant decrease was observed". On harm: a 2024 meta-analysis found only 55 of 171 mental-health-app trials reported adverse events; the deterioration rate (6.7%) did not differ from control, and over-use does not appear as an event category.

## 3. When reflection becomes rumination

Rumination "exacerbates depression, enhances negative thinking, impairs problem solving" (Nolen-Hoeksema et al. 2008) and, in Watkins & Roberts's 2020 model, is "a learnt habit that involves the tendency to process negative information in an abstract way" — any repeated tool can become that habit. Whether repetitive thought helps or harms turns on "the valence of thought content", the "context", and "the level of construal (abstract vs. concrete processing)" (Watkins 2008). Experimentally, asking "why" from a self-distanced stance yields "cool" reflection while the self-immersed "why" re-heats negative affect, mediated by abstract vs concrete construal (Kross, Ayduk & Mischel 2005, two experiments). In a one-month journaling RCT (122 students), the emotion-only group "reported more severe illness symptoms" while the cognition-plus-emotion group found benefit (Ullrich & Lutgendorf 2002). Journaling overall shows a small-to-moderate benefit across 20 RCTs with "low risk of adverse effects" (Sohal 2022), and twice-daily mood monitoring for three weeks reduced momentary negative mood in a 47-person study (MeMO 2021) — no harm at that dose.

No study tests whether repeated thought-record use becomes rumination. The record's structure — situation, evidence, balanced thought — is the concrete, cognition-plus-emotion mode the evidence favours, so the risk vector is a record that stays in "why", re-opens the same hot thought, or is used to obtain certainty. That last form is documented clinically: for OCD, "CT techniques can easily become reassurance-seeking strategies and thus serve as compulsive rituals that interfere with treatment progress" (IOCDF treatment guide).

## 4. How apps and regulators handle heavy use

| App       | Published guidance on amount                                                                         | On heavy use                                          | Refers out for                                       |
| --------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Headspace | "10-20 minutes of meditation at least 3 times a week"; "you don't have to meditate every single day" | Nothing; only "not intended to diagnose, treat, cure" | —                                                    |
| Calm      | "we recommend meditating daily"; "However long you can meditate is the right length of time!"        | Nothing                                               | —                                                    |
| Finch     | Store description and help centre silent on missing days and amount                                  | Nothing (no-penalty claims are third-party reviews)   | —                                                    |
| Daylio    | "Set reminders and never forget", goals, achievements                                                | Nothing                                               | —                                                    |
| Wysa      | —                                                                                                    | Nothing                                               | Crisis; "severe and enduring mental health problems" |
| Woebot    | Consumer app retired 30 June 2025                                                                    | FAQ silent                                            | —                                                    |

The only consumer products with break mechanics are attention-economy ones: Instagram's opt-in "Take a Break" (Dec 2021), TikTok's default 60-minute daily limit for under-18s with a passcode and a prompt after 100 minutes (Mar 2023), and YouTube's take-a-break reminder, on by default for 13–17 and off for adults. Their trigger is time-on-app, the thing those businesses sell; no CBT or mindfulness app has an analogue.

Regulators and stores: NICE's Evidence Standards Framework (updated 9 Aug 2022) has 21 standards; the nearest is standard 9, "safeguarding assurances for DHTs where users are considered to be in vulnerable groups, or where peer-to-peer interaction is enabled", and CBT programmes sit in Tier C, not the Tier B "diaries" class. ORCHA's Baseline Review (350+ criteria across data privacy, professional assurance, usability) has no over-use criterion. Apple's guidelines say only that medical apps "should remind users to check with a doctor in addition to using the app" (1.4.1) and restrict health-data use (5.1.3); "mental health", "overuse" and "crisis" do not occur. Google Play's health-apps policy is a categorisation and declaration regime (from 31 May 2024) mentioning "well-being (mental and physical)" and nothing on use. The European Parliament's resolution of 12 Dec 2023 (545–12) names "infinite scroll", "autoplay", "streaks" and push notifications and asks for "a digital 'right not to be disturbed' ... turning all attention-seeking features off by design" — design, not volume. Per-app caps already exist at OS level, set by the user: Screen Time App Limits ("Set a time limit ... for individual apps") and Digital Wellbeing app timers ("the app closes and its icon dims").

Unverified: the often-quoted _Mind Over Mood_ figure of 20–40 thought records before balanced thinking becomes automatic could not be checked against the book (Google Books rate-limited, 2026-09-01); treat as folklore until read.

## Sources

- Kazantzis, Whittington & Dattilio (2010), _Clin Psychol Sci Pract_ — [doi:10.1111/j.1468-2850.2010.01204.x](https://doi.org/10.1111/j.1468-2850.2010.01204.x)
- Mausbach et al. (2010), _Cogn Ther Res_ — [doi:10.1007/s10608-010-9297-z](https://doi.org/10.1007/s10608-010-9297-z)
- Kazantzis et al. (2016), _Behav Ther_ — [doi:10.1016/j.beth.2016.05.002](https://doi.org/10.1016/j.beth.2016.05.002)
- Conklin & Strunk (2015), _Behav Res Ther_ — [doi:10.1016/j.brat.2015.06.011](https://doi.org/10.1016/j.brat.2015.06.011)
- Kazantzis (2021), Beck Institute blog — [beckinstitute.org](https://beckinstitute.org/blog/what-is-the-status-of-homework-in-cognitive-behavior-therapy-50-years-on/)
- Robinson, Delgadillo & Kellett (2020), _Psychother Res_ — [doi:10.1080/10503307.2019.1566676](https://doi.org/10.1080/10503307.2019.1566676)
- NICE NG222 (2022), Depression in adults, recommendations — [nice.org.uk/guidance/ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations)
- Donkin et al. (2013), _J Med Internet Res_ — [doi:10.2196/jmir.2771](https://doi.org/10.2196/jmir.2771)
- Enrique et al. (2019), _J Med Internet Res_ — [doi:10.2196/12775](https://doi.org/10.2196/12775)
- Adverse events in mental-health-app trials (2024), _npj Digit Med_ — [doi:10.1038/s41746-024-01388-y](https://doi.org/10.1038/s41746-024-01388-y)
- Nolen-Hoeksema, Wisco & Lyubomirsky (2008), _Perspect Psychol Sci_ — [doi:10.1111/j.1745-6924.2008.00088.x](https://doi.org/10.1111/j.1745-6924.2008.00088.x)
- Watkins (2008), _Psychol Bull_ — [doi:10.1037/0033-2909.134.2.163](https://doi.org/10.1037/0033-2909.134.2.163)
- Watkins & Roberts (2020), _Behav Res Ther_ — [doi:10.1016/j.brat.2020.103573](https://doi.org/10.1016/j.brat.2020.103573)
- Kross, Ayduk & Mischel (2005), _Psychol Sci_ — [doi:10.1111/j.1467-9280.2005.01600.x](https://doi.org/10.1111/j.1467-9280.2005.01600.x)
- Ullrich & Lutgendorf (2002), _Ann Behav Med_ — [doi:10.1207/S15324796ABM2403_10](https://doi.org/10.1207/S15324796ABM2403_10)
- Sohal et al. (2022), _Fam Med Community Health_ — [doi:10.1136/fmch-2021-001154](https://doi.org/10.1136/fmch-2021-001154)
- MeMO study (2021), _Front Psychiatry_ — [doi:10.3389/fpsyt.2021.687270](https://doi.org/10.3389/fpsyt.2021.687270)
- IOCDF, Cognitive therapy for OCD — [iocdf.org](https://iocdf.org/ocd-treatment-guide/cognitive-therapy/)
- NICE Evidence Standards Framework for DHTs (9 Aug 2022) — [nice.org.uk/corporate/ecd7](https://www.nice.org.uk/corporate/ecd7)
- ORCHA Baseline Review — [orchahealth.com](https://www.orchahealth.com/resources/assessment-frameworks/orcha-baseline-review)
- Apple App Review Guidelines, 1.4 and 5.1.3 — [developer.apple.com](https://developer.apple.com/app-store/review/guidelines/)
- Google Play, Health apps policy — [support.google.com](https://support.google.com/googleplay/android-developer/answer/13996367)
- European Parliament resolution of 12 Dec 2023 on addictive design, 2023/2043(INI) — [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52023IP0459)
- Apple Screen Time App Limits — [support.apple.com/108806](https://support.apple.com/en-us/108806); Android Digital Wellbeing app timers — [support.google.com](https://support.google.com/android/answer/9346420)
- Headspace help — [how long until benefits](https://help.headspace.com/hc/en-us/articles/360000211507); Calm help — [how often should I meditate](https://support.calm.com/hc/en-us/articles/115002586288); Finch — [App Store listing](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748), [help centre](https://help.finchcare.com/); Daylio — [daylio.net](https://daylio.net); Wysa — [FAQ](https://www.wysa.com/faq); Woebot — [FAQ](https://woebothealth.com/faq/)
- Meta Newsroom, Take a Break (7 Dec 2021) — [about.fb.com](https://about.fb.com/news/2021/12/new-teen-safety-tools-on-instagram/); TikTok Newsroom (1 Mar 2023) — [newsroom.tiktok.com](https://newsroom.tiktok.com/en-us/new-features-for-teens-and-families-on-tiktok-us); YouTube take-a-break reminder — [support.google.com/youtube/9012523](https://support.google.com/youtube/answer/9012523)
- Gillihan, book page — [sethgillihan.com](https://sethgillihan.com/think-act-be-cognitive-behavioral-therapy-made-simple/)
