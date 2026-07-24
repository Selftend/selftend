# How comparable wellness apps handle age: store ratings, ToS floors, and gating

> Research for the [age-floor decision (#220)](https://github.com/Selftend/selftend/issues/220),
> resolved 2026-07-24. Context: Selftend is a free, non-profit mental-wellness guided self-help app
> (CBT thought records), currently 18+, deciding how to move to a teen-inclusive age floor. This
> note benchmarks seven comparable apps against primary sources (official store listings, each
> company's own ToS/privacy pages, official help centers, and GitHub repos for the open-source
> apps) to inform both the floor itself and the age-assurance mechanics.

**Method caveat:** all Google Play listings were fetched live on 2026-07-24 from an EU vantage
point, so Play shows **PEGI** ratings; the same listings served in the US would show ESRB labels
("Everyone" etc.), which could not be verified from here — treat US Play labels as unverified.
Apple ratings are reference-only, from the US apps.apple.com listings. "Checked 2026-07-24"
applies to every claim below.

## 1. Calm (Calm.com, Inc.)

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=com.calm.android) (live page, checked 2026-07-24).
- **App Store rating:** 9+, "Contains Health or Wellness Topics" — [listing](https://apps.apple.com/us/app/calm/id571800810) (checked 2026-07-24).
- **ToS floor: 16+.** "You must be 16 years or older to use the Services. If you are under the age of majority where you live, you may only use the Services if your parent or guardian agrees to our Terms. Please read these Terms with them." — [calm.com/terms](https://www.calm.com/terms), §3 "Service Use: Eligibility" (checked 2026-07-24). Family-plan primary holders must be 18+, and "a parent or legal guardian must be the primary account holder for any person under 18 years of age that is invited to join a family plan" (same page, §4).
- **Help-center variants:** Family Plan members 18+ ([support article](https://support.calm.com/hc/en-us/articles/4405882978331-Calm-Premium-Family-Plan-FAQ)); Premium dependents 16+ ([support article](https://support.calm.com/hc/en-us/articles/6460623761179-How-to-Invite-a-Dependent)); Calm Health friends/family 13+ in the US but 18+ in Canada/EU/UK ([support article](https://support.calm.com/hc/en-us/articles/32994304659355-Friends-and-Family-for-Calm-Health-FAQ)) — note the EU floor jumps to adult (checked 2026-07-24).
- **Signup gating: unverified.** No primary source found documenting DOB collection at consumer signup; the ToS clause reads as passive attestation ("you must be 16 or older"). Explicitly unverified — do not assume Calm has an age screen.
- **Minor wording:** responsibility shifted to parents/guardians ("you are subject to these Terms and responsible for your child's activity"). The main [privacy-policy page](https://www.calm.com/privacy-policy) as rendered on 2026-07-24 contained no "children"/"minors" section at all (open question: it may live on a sub-page that did not render).

## 2. Headspace (Headspace Inc.)

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=com.getsomeheadspace.android) (checked 2026-07-24).
- **App Store rating:** 13+, "Contains Health or Wellness Topics" — [listing](https://apps.apple.com/us/app/headspace-meditation-sleep/id493145008) (checked 2026-07-24).
- **ToS floor: 18 by default, 13 via sponsored carve-outs.** "Our Products and Services are intended for individuals at least 18 years of age." 13–17 (US) / 16–17 (EU) may access via Benefit Sponsor offerings; 13–17 in the US additionally require "verifiable parent or guardian consent"; "Headspace does not support Members under the age of 13" as registered users; the Ebb AI companion is 18+ only. — [headspace.com/terms-and-conditions](https://www.headspace.com/terms-and-conditions) (checked 2026-07-24).
- **Signup gating: DOB + country, verified from primary source.** "Currently, our app and services are not available for children under 13, as such, we need to confirm age and deny access to members below that age group. Additionally, [HIPAA] requires parental consent to provide care to teenagers (ages 13-17) in the United States. We must collect this information to determine which members must obtain parental consent…" — [help article "Why do I have to confirm my Date of birth and country?"](https://help.headspace.com/hc/en-us/articles/20108735464091-Why-do-I-have-to-confirm-my-Date-of-birth-and-country) (checked 2026-07-24). Headspace is the only app in this set with primary-source-confirmed DOB gating, and the stated driver is regulated care services (coaching/therapy), not the meditation content.
- **Minor wording:** "Headspace services are available for members above the age of 13… Members cannot sign their child up as a registered user" — [eligibility help article](https://help.headspace.com/hc/en-us/articles/21392642215835-Who-is-eligible-to-access-Headspace-products-or-services) (checked 2026-07-24). Kids' content (Sesame Street etc.) is framed as parent-supervised use of the parent's subscription, not child accounts ([kids help article](https://help.headspace.com/hc/en-us/articles/360048572093-Can-I-use-the-subscriptions-with-kids-)).

## 3. Finch (Finch Care Public Benefit Corporation)

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=com.finch.finch) (checked 2026-07-24).
- **App Store rating:** 9+, "Contains Health or Wellness Topics" — [listing](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748) (checked 2026-07-24).
- **ToS floor: 13, pure attestation.** "Our Services are not directed to children who are under the age of 13. Please do not use our Services if you are under age of 13." Notably candid follow-up: "While we would like to make some of the Services available to children under 13, various countries have laws and regulations that require significant investment and cost on our part to demonstrate compliance, even if the Services would already be beneficial to people of this age." — [Finch Care PBC Terms of Service](https://befinch.notion.site/Finch-Care-PBC-Terms-of-Service-710ffd2b56ce4bc8ac8063461a3bb96e) (Notion-hosted, linked from both store listings; checked 2026-07-24).
- **Signup gating: effectively none, verified from ToS.** Finch's ToS documents a **Guest Account** mode: "you may choose to use Finch without creating a verified account. In this mode, your data is not linked to a personal identifier and your progress is stored locally on your device." Registered accounts link only a hashed phone number. No DOB requirement appears in the ToS; whether onboarding asks a birth-year question is **unverified** from primary sources.
- **Minor wording:** COPPA-style "not directed to children under 13" only. The 13–17 range is not addressed at all — no parental-consent requirement, no teen mode, despite the app's visibly teen-heavy audience. Reflections/custom goals are stated to be device-local ("stored on your device only in order to protect the privacy and security of this information").

## 4. Daylio (Relaxio s.r.o.)

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=net.daylio) (checked 2026-07-24).
- **App Store rating:** 4+ — [listing](https://apps.apple.com/us/app/daylio-journal-daily-diary/id1194023242) (checked 2026-07-24). Lowest in this set.
- **ToS floor: none.** Daylio's [Terms of Use](https://daylio.net/faq/terms-of-use/) contain **no clauses about age, minors, children, or parental consent** at all — the EULA binds "by installing the Software" (checked 2026-07-24).
- **Signup gating: none — there is no signup.** "The Application does not provide an option to create an account therefore, we do not store nor have access to your entries and data. Your data are stored only locally on your device." — [privacy policy](https://daylio.net/faq/privacy-policy/) (checked 2026-07-24).
- **Minor wording:** none found in the primary ToU or privacy policy. **Open question:** a search-result snippet attributed a "not intended for individuals under 16" statement to Daylio, but that text does not appear in either primary policy fetched on 2026-07-24 — treat the under-16 claim as unverified.

## 5. Woebot (retired) and Wysa — AI chatbots (framing differs from Selftend)

Both are **AI-chatbot** products; Selftend has no AI features, so their heavier disclaimers and
regulatory posture are only partially comparable. They are still the closest CBT-branded products
with teen policies.

### Woebot (Woebot Health) — consumer app retired

- **Status: retired.** "The Woebot app was retired June 30, 2025. New accounts can no longer be created, and previous accounts can no longer be accessed." — [woebothealth.com/faq](https://woebothealth.com/faq/) (checked 2026-07-24). Company pivoted to enterprise/payer products (secondary corroboration: [STAT, 2025-07-02](https://www.statnews.com/2025/07/02/woebot-therapy-chatbot-shuts-down-founder-says-ai-moving-faster-than-regulators/) — lead only). Founder cited FDA-authorization cost and LLM regulatory uncertainty.
- **Store listings still resolve** as of 2026-07-24 (zombie listings): [Play](https://play.google.com/store/apps/details?id=com.woebot) shows PEGI 3 with no install button; [App Store](https://apps.apple.com/us/app/woebot/id1305375832) still renders at 13+.
- **ToS floor: 13 (still online).** "You may use the Services only if you are at least 13 years of age (or such other minimum age at which you can provide consent to data processing under the laws of your territory)…"; for 13-to-majority users: "you hereby represent and warrant that your parent or legal guardian has read these Terms and accepts them on your behalf"; under-13: "please do not attempt to register for the Services." — [woebothealth.com/terms-of-service](https://woebothealth.com/terms-of-service/) (checked 2026-07-24). Note the GDPR-aware "or such other minimum age at which you can provide consent to data processing in your territory" phrasing — a clean way to handle the EU 13–16 spread without naming each country.
- **Signup gating: unverifiable** (app retired; mechanics can no longer be observed).

### Wysa (Touchkin)

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=bot.touchkin) (checked 2026-07-24).
- **App Store rating:** 9+, "Contains Health or Wellness Topics" — [listing](https://apps.apple.com/us/app/id1166585565) (checked 2026-07-24).
- **ToS floor: 13 (11+ via institutions).** "Wysa App is intended for use as emotional wellbeing support by individuals aged 13+ (or 11+ if agreed by the Institution)…"; "You cannot use the Wysa App and Service if you are below 13 years or below the age approved by your Institution."; "If you are between 13 and 17 years old, your experience is tailored to be age-appropriate — some features, including paid services, available to adult users will not be accessible to you."; minors must read the EULA with parents/guardians, and parental consent is sent by email or via the institution. — [legal.wysa.io/terms](https://legal.wysa.io/terms) (checked 2026-07-24). Wysa also publishes **child-friendly versions** of its [terms](https://legal.wysa.io/children/terms) and [privacy policy](https://legal.wysa.io/children/privacy-policy), and a separate CYP (13–17) service terms.
- **Signup gating: anonymous nickname, no account.** "You do not need to register to use the app. Just give us a nickname so our chatbot knows what to call you." — [privacy policy](https://legal.wysa.io/privacy-policy) (checked 2026-07-24). **Unverified:** how the 13–17 "age-appropriate experience" is triggered (an age screen? self-declared range?) is not documented in the public policies.
- **Minor/crisis wording:** "The service is not for crises or emergencies. If you have an emergency, contact your local emergency services immediately." (terms, checked 2026-07-24). Parental consent for 13–18 handled out-of-band (email to Wysa or via institution) rather than in-product.

## 6. ifme (if-me.org, open-source web app)

- **Store ratings: n/a** — web-only, no Play/App Store listings.
- **ToS floor: none — there is no ToS.** Verified from the repo ([github.com/ifmeorg/ifme](https://github.com/ifmeorg/ifme), checked 2026-07-24): `app/views/pages/` contains `about`, `faq`, `home`, `partners`, `press`, `privacy`, `resources` — no terms page; `config/locales/en.yml` contains zero "terms of service" strings and zero age/minors/children strings (grepped for `years of age`, `under the age`, `minors`, `COPPA`, `13+/16+/18+`).
- **Signup gating: none.** The Devise registration form (`app/views/devise/registrations/new.html.erb`) collects name, optional location, email, and password — no DOB, no age attestation, no terms checkbox (checked 2026-07-24).
- **Minor wording:** none. The privacy page covers data access/rights/cookies only. Takeaway: a community open-source project simply not addressing age is an existing practice, but not a model for a store-distributed app — Play/App Store data-safety questionnaires force the issue.

## 7. Quirk descendants — FreeCBT (Evan Rosson)

Quirk ([Flaque/quirk](https://github.com/Flaque/quirk), GPL) is unmaintained; FreeCBT is the
maintained fork whose stated purpose is "keep Quirk alive" ([freecbt.erosson.org/about](https://freecbt.erosson.org/about/), checked 2026-07-24). This is the closest analog to Selftend: a free, open-source CBT thought-record app.

- **Play rating:** PEGI 3 — [listing](https://play.google.com/store/apps/details?id=org.erosson.freecbt) (checked 2026-07-24).
- **App Store rating:** 13+ ("Infrequent Medical Treatment Information", "Health or Wellness Topics") — [listing](https://apps.apple.com/us/app/freecbt/id1516063390) (checked 2026-07-24). Interesting: the same content class as Daylio's 4+ lands at 13+ here, presumably from answering Apple's medical-information questions differently.
- **ToS floor: none.** [`TOS.md`](https://github.com/erosson/freecbt/blob/master/TOS.md) is a generator-produced template (App Privacy Policy Generator, effective 2020-05-14) with **no age clause at all** (checked 2026-07-24).
- **Signup gating: none — no account.** Privacy policy: data "will be retained on your device and is not collected by me in any way" ([freecbt.erosson.org/privacy](https://freecbt.erosson.org/privacy/), checked 2026-07-24).
- **Minor wording:** COPPA boilerplate only: "These Services do not address anyone under the age of 13. I do not knowingly collect personally identifiable information from children under 13." (same privacy page).

## Observable patterns (CBT/self-help focus)

1. **ToS floors cluster at 13; nobody comparable sits at 18 for self-help content.** 13+ with parental-consent attestation is the modal floor (Finch, Woebot, Wysa; Headspace's teen path). Calm picks 16 — which happens to clear every EU member state's GDPR digital-consent age without country logic; Woebot's "13, or such other minimum age at which you can provide consent to data processing under the laws of your territory" is the other clean EU formulation. The only true 18-defaults are tied to **payments or regulated care** (Calm family-plan holders, Headspace's default because it sells therapy/coaching, Headspace's Ebb AI, Wysa's paid features being adult-only) — not to the self-help content itself.
2. **Gating is almost always passive attestation.** Of seven apps, exactly one (Headspace) verifiably collects DOB at signup, and its stated reason is HIPAA parental consent for regulated care services — not the meditation content. Everyone else either attests in ToS text ("you must be 16+", "please do not use if under 13") or dodges entirely by having **no account** (Daylio, FreeCBT, Wysa nickname mode, Finch guest mode). No app in this set uses a neutral age-screen-with-DOB as a pure content gate. For minors 13–17, consent is handled by wording ("read these terms with your parent") or out-of-band email (Wysa), not in-product verification.
3. **Store ratings do not punish mental-health content.** Play showed PEGI 3 for every single app checked, including the AI chatbots — the IARC questionnaire treats wellness/self-help as unrated-risk content. Apple varies with the developer's own questionnaire answers under the 2025 "Health or Wellness Topics" disclosure: 4+ (Daylio, no health declaration), 9+ (Calm, Finch, Wysa), 13+ (Headspace, Woebot, FreeCBT). A CBT thought-record app should expect Play "3+"/Everyone and can land Apple 9+ or 13+ depending on how it answers the medical-information questions — FreeCBT (13+) vs Finch (9+) shows the same category going both ways.
4. **Minor-safety language has two tiers.** Non-AI self-help apps use one COPPA paragraph ("not directed to children under 13; we do not knowingly collect…") and say nothing about 13–17 (Finch conspicuously so). AI-chatbot apps go much further: Wysa ships child-friendly rewrites of its terms and privacy policy, a separate 13–17 service, feature-stripping for minors, and prominent "not for crises or emergencies — contact local emergency services" wording; Woebot required parents to accept terms on the minor's behalf. Since Selftend has no AI chat, the lighter tier is the relevant benchmark — but Wysa's child-friendly policy rewrite and crisis-wording placement are the best-in-class patterns worth borrowing regardless.
5. **Local-first storage is used as an age-compliance strategy.** Daylio, FreeCBT, and Finch's guest mode all pair "no account / data stays on device" with the absence of any real age gate — minimizing collection is doing the compliance work. Selftend requires accounts in MVP, so it cannot lean on this and needs an explicit floor + attestation instead.

### Open questions / unverified items

- US Play "Everyone"-style labels for all apps (EU vantage point showed PEGI only).
- Calm and Finch signup mechanics (whether any DOB/age screen exists in onboarding) — no primary source found.
- How Wysa triggers its 13–17 tailored experience (age screen vs institution config).
- The "Daylio not intended under 16" claim seen in a search snippet — absent from Daylio's primary policies as fetched.
- Calm's privacy-policy children's section — not present on the page as rendered 2026-07-24.

## Sources

- Calm — [Play listing](https://play.google.com/store/apps/details?id=com.calm.android) · [App Store](https://apps.apple.com/us/app/calm/id571800810) · [Terms](https://www.calm.com/terms) · [Family Plan FAQ](https://support.calm.com/hc/en-us/articles/4405882978331-Calm-Premium-Family-Plan-FAQ) · [Dependent invite](https://support.calm.com/hc/en-us/articles/6460623761179-How-to-Invite-a-Dependent) · [Calm Health F&F](https://support.calm.com/hc/en-us/articles/32994304659355-Friends-and-Family-for-Calm-Health-FAQ)
- Headspace — [Play listing](https://play.google.com/store/apps/details?id=com.getsomeheadspace.android) · [App Store](https://apps.apple.com/us/app/headspace-meditation-sleep/id493145008) · [Terms](https://www.headspace.com/terms-and-conditions) · [Eligibility article](https://help.headspace.com/hc/en-us/articles/21392642215835-Who-is-eligible-to-access-Headspace-products-or-services) · [DOB article](https://help.headspace.com/hc/en-us/articles/20108735464091-Why-do-I-have-to-confirm-my-Date-of-birth-and-country)
- Finch — [Play listing](https://play.google.com/store/apps/details?id=com.finch.finch) · [App Store](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748) · [ToS (Notion)](https://befinch.notion.site/Finch-Care-PBC-Terms-of-Service-710ffd2b56ce4bc8ac8063461a3bb96e)
- Daylio — [Play listing](https://play.google.com/store/apps/details?id=net.daylio) · [App Store](https://apps.apple.com/us/app/daylio-journal-daily-diary/id1194023242) · [Terms of Use](https://daylio.net/faq/terms-of-use/) · [Privacy](https://daylio.net/faq/privacy-policy/)
- Woebot — [FAQ (retirement)](https://woebothealth.com/faq/) · [ToS](https://woebothealth.com/terms-of-service/) · [Play listing](https://play.google.com/store/apps/details?id=com.woebot) · [App Store](https://apps.apple.com/us/app/woebot/id1305375832) · lead: [STAT 2025-07-02](https://www.statnews.com/2025/07/02/woebot-therapy-chatbot-shuts-down-founder-says-ai-moving-faster-than-regulators/)
- Wysa — [Play listing](https://play.google.com/store/apps/details?id=bot.touchkin) · [App Store](https://apps.apple.com/us/app/id1166585565) · [Terms](https://legal.wysa.io/terms) · [Privacy](https://legal.wysa.io/privacy-policy) · [Child-friendly terms](https://legal.wysa.io/children/terms)
- ifme — [repo](https://github.com/ifmeorg/ifme) (pages views, `en.yml`, Devise registration view)
- FreeCBT — [Play listing](https://play.google.com/store/apps/details?id=org.erosson.freecbt) · [App Store](https://apps.apple.com/us/app/freecbt/id1516063390) · [TOS.md](https://github.com/erosson/freecbt/blob/master/TOS.md) · [Privacy](https://freecbt.erosson.org/privacy/) · [About](https://freecbt.erosson.org/about/) · Quirk: [Flaque/quirk](https://github.com/Flaque/quirk)

All URLs checked 2026-07-24.
