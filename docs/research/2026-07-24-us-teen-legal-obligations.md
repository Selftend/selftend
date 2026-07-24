# US legal obligations at a 13+ age floor: COPPA boundary and what attaches at 13–17

> Research for [wayfinder ticket #218](https://github.com/Selftend/selftend/issues/218),
> resolved 2026-07-24. All sources checked 2026-07-24. Litigation-status items are point-in-time
> snapshots and several are in active flux (marked below).

**Framing facts assumed throughout** (from the product context): Selftend is a free, non-profit
mental-wellness guided self-help app (CBT thought records) with no ads, no sale/sharing of
personal data, no tracking of a "sale/share" kind, no social features, no AI chat, and data
minimization as a core value. Two structural facts do most of the legal work:

1. **Non-profit status.** CCPA/CPRA, the California AADC, Maryland's Kids Code, and VCDPA all
   apply only to for-profit entities (or entities meeting revenue/volume thresholds Selftend
   cannot meet). If the operating entity is a bona fide non-profit, those laws do not attach at
   all. ⚠️ This entire analysis assumes the entity is genuinely organized as a non-profit; if it
   is (or becomes) a for-profit or an unincorporated project run for anyone's financial benefit,
   re-run the analysis.
2. **No sale/share/targeted ads/social feed.** Most teen-specific state provisions regulate
   sale, targeted advertising, profiling, or social-media mechanics. Selftend does none of
   these, so most teen provisions are satisfied by continuing not to do them.

What genuinely attaches at 13+ is: (a) a compliant **neutral age gate** for the under-13
boundary, (b) **app-store-law developer duties** in TX/UT/LA/AL (+ CA's AB 1043 signal in 2027),
(c) **Connecticut and Colorado minors' duties** (duty of care, assessments, and a consent gate
on engagement-extending design features for known minors), and (d) **consumer-health-data
consent/notice duties in WA and NV that apply regardless of age**.

---

## 1. COPPA: the under-13 boundary and the 2025 amended Rule

**COPPA applies only to children under 13.** The statute defines "child" as "an individual
under the age of 13" ([15 U.S.C. § 6501(1)](https://www.law.cornell.edu/uscode/text/15/6501),
checked 2026-07-24). Nothing in COPPA or the amended Rule regulates 13–17-year-olds.

**Non-profit carve-out (relevant but don't rely on it alone).** COPPA covers "operators" of
sites/services "operated for commercial purposes"; entities outside FTC Act jurisdiction —
bona fide non-profits not operated for the profit of members — are generally not subject to
COPPA (FTC, [COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions),
FAQ A.5; ftc.gov blocked automated fetch 2026-07-24 but the guidance is long-standing and
corroborated by the Rule's "commercial purposes" scope in
[16 C.F.R. § 312.2](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312)).
Even so, app stores, state laws, and good practice all expect the age gate below.

**2025 amended COPPA Rule.** Final amendments published
[90 Fed. Reg. 16918 (Apr. 22, 2025)](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule);
**effective June 23, 2025; compliance deadline April 22, 2026** for everything except three
safe-harbor-program provisions (§ 312.11(d)(1), (d)(4), (g)) which took effect without the
grace period. As of today the amended Rule is fully in compliance force. Key changes
([FTC press release](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data);
[Federal Register text](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule), checked 2026-07-24):

- "Personal information" now includes **biometric identifiers** and government IDs.
- **Separate verifiable parental consent** required before disclosing children's data to third
  parties for non-integral purposes (i.e., an opt-in specifically for third-party disclosure,
  e.g. targeted advertising).
- Operators must maintain a **written information security program** and a **written data
  retention policy** (retain children's data only as long as reasonably necessary; no
  indefinite retention).
- New defined term **"mixed audience website or online service"**: a service that is
  child-directed under the multi-factor test but does _not_ target children as its primary
  audience. Mixed-audience operators may age-screen and treat 13+ users as non-children, but
  the age collection must be **neutral** — done "in a neutral manner that does not default to a
  set age or encourage visitors to falsify age information" — and may use "another means
  reasonably calculated, in light of available technology" to determine whether a visitor is a
  child.

**"Directed to children" vs "actual knowledge" for Selftend.** COPPA reaches an operator two
ways: (1) the service is _directed to children_ under the multi-factor test in § 312.2 (subject
matter, visual/audio content, use of animated characters or child-oriented activities and
incentives, music, age of models, ads on the service, and competent evidence of audience
composition/intended audience); or (2) a _general-audience_ service gains **actual knowledge**
it is collecting personal information from a child under 13. A CBT thought-record app with
adult-styled content and a 13+ floor is a general-audience service, not child-directed and not
"mixed audience" (mixed audience is a _subset of child-directed_). So Selftend's exposure is
the actual-knowledge prong only — e.g., a user states a birthdate under 13, a parent reports a
child account, or support correspondence reveals age.

**What a 13+ floor requires operationally (the neutral age gate).** FTC guidance
([COPPA FAQs](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions),
Section D — age screening; corroborated by the neutral-manner language now codified in the
amended Rule):

- Ask **age or date of birth** at signup in a neutral way: free entry (not a pre-checked or
  defaulted year), no text like "you must be 13 to sign up" _before_ the age question, nothing
  that encourages falsification.
- If the entered age is under 13, **block account creation and do not collect personal
  information** (don't retain the email/DOB beyond what's needed to enforce the block).
- Use a **session cookie / local flag to prevent immediate retry** with a different age (FTC
  FAQ recommends preventing back-button age changes).
- If actual knowledge of an under-13 user arises later, **delete the account and its data** (or
  obtain verifiable parental consent — for Selftend, deletion is the sane path).
- No obligation to _verify_ age or investigate users' real ages; COPPA does not impose age
  verification on general-audience services (that's what the state app-store laws do — § 2).

---

## 2. State app-store age-verification laws (the "App Store Accountability Acts")

Four states have enacted ASAAs as of 2026-07-24 — **Utah, Texas, Louisiana, Alabama** — plus
California's narrower age-signal law (AB 1043). A federal bill
([S. 1586](https://www.congress.gov/bill/119th-congress/senate-bill/1586/text) /
[H.R. 3149](https://www.congress.gov/bill/119th-congress/house-bill/3149/text)) is pending, not
law. The architecture in all of them: **the app store does the heavy lifting** (age
verification at account creation, obtaining verifiable parental consent for minors,
transmitting signals); **developers consume signals and feed the store metadata**. These laws
do not ban minors — a 13+ floor is fine — but a minor's download/purchase requires
store-mediated parental consent, and developers must react to the signals.

### 2.1 Texas — SB 2420, App Store Accountability Act

- **Effective January 1, 2026** ([SB 2420 enrolled text](https://capitol.texas.gov/tlodocs/89R/billtext/pdf/SB02420F.pdf);
  [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/texas-governor-signs-texas-app-store-accountability-act-into-law), checked 2026-07-24).
- **Litigation (in flux):** _CCIA v. Paxton_ and _Students Engaged in Advancing Texas v.
  Paxton_. Judge Robert Pitman (W.D. Tex.) **preliminarily enjoined the law Dec. 23, 2025** as
  likely violating the First Amendment
  ([Privacy World](https://www.privacyworld.blog/2025/12/federal-judge-enjoins-enforcement-of-texas-app-store-age-verification-law/)).
  The **Fifth Circuit stayed the injunction May 28, 2026**
  ([Texas Tribune](https://www.texastribune.org/2026/05/28/texas-apple-google-app-store-age-verification/)),
  and on **July 6, 2026 the Supreme Court denied emergency applications** to vacate the stay —
  ruling only on interim relief, not the merits. **The law is enforceable today**; the First
  Amendment appeal continues in the Fifth Circuit
  ([InfoLawGroup](https://www.infolawgroup.com/insights/2026/7/7/supreme-court-clears-the-way-texass-app-store-accountability-act-is-now-enforceable), checked 2026-07-24).
- **Store-borne duties:** verify each Texas account holder's age category at account creation;
  affiliate minor accounts with a parent account; obtain verifiable parental consent before a
  minor downloads an app, purchases an app, or makes in-app purchases; transmit age-category
  and consent signals to developers; notify developers of consent revocation.
- **Developer-borne duties** ([Wiley](https://www.wiley.law/alert-State-App-Store-Accountability-Acts-Introduce-New-Obligations-for-App-Developers);
  [ReedSmith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102kddh/texas-law-requires-age-verification-for-app-stores-and-developers/), checked 2026-07-24):
  1. **Assign an age rating** to the app _and each in-app purchase_ using the law's four
     categories — **under 13 / 13–15 / 16–17 / 18+** — and provide it to each app store.
  2. **Request and use the store's signals** to verify a user's age category and confirm
     parental consent before allowing a known minor to use the app/make purchases.
  3. **Notify app stores of "significant changes"** to the app's terms of service, privacy
     policy, or monetization (triggers consent refresh).
  4. **Data protection for age/consent signals**: use only for compliance, transmit with
     industry-standard encryption, delete after use, don't share with third parties.
  - Developers get a **safe harbor** for reasonable reliance on store-provided information.
- **Enforcement:** Texas AG; violation is a deceptive trade practice under the DTPA (which
  carries private-action exposure)
  ([InfoLawGroup](https://www.infolawgroup.com/insights/2026/7/7/supreme-court-clears-the-way-texass-app-store-accountability-act-is-now-enforceable)).

### 2.2 Utah — SB 142 (2025), amended by HB 498 (2026)

- **Staged dates:** law effective May 7, 2025; **store/developer compliance obligations since
  May 6, 2026**; private right of action (parents/minors, up to $1,000/violation) begins
  **December 31, 2026**
  ([SB 142 text](https://le.utah.gov/~2025/bills/static/SB0142.html);
  [Stoel Rives](https://www.stoel.com/insights/publications/utahs-app-store-accountability-act-goes-into-effect), checked 2026-07-24).
- **2026 amendment (HB 498, signed March 18, 2026)**: narrowed re-consent triggers to data
  collection changes, age-rating shifts, and new monetization (dropped "material changes to
  functionality"); added a **developer opt-in tool to ask stores to block minor accounts
  entirely** (useful if Selftend ever wanted an 18+ store posture, not needed for 13+); limited
  age-category data to three enumerated uses
  ([Frankfurt Kurnit](https://technologylaw.fkks.com/post/102mpap/utah-first-state-to-amend-its-app-store-accountability-act), checked 2026-07-24).
- **Developer duties:** verify via store data that parental consent exists for minor accounts
  before allowing app use; use age-category data only to enforce age restrictions, comply with
  law, or implement safety features; no third-party sharing of age data; notify stores of
  significant changes ([Inside Privacy](https://www.insideprivacy.com/united-states/state-legislatures/utah-enacts-app-store-accountability-act/)).
- **Litigation:** no injunction against Utah's ASAA found as of 2026-07-24 (NetChoice's Utah
  suit targets the separate social-media act, § 3.6).

### 2.3 Louisiana — HB 570 (2025)

- Signed June 30, 2025; **effective July 1, 2026 — in force now**
  ([Orrick](https://www.orrick.com/en/Insights/2025/07/Texas-and-Louisiana-Join-Growing-Trend-of-State-Age-Verification-Laws-for-App-Stores);
  [Bass Berry](https://www.bassberry.com/news/apps-and-minors-new-compliance-frontiers-and-risks-in-louisiana-utah-and-texas/), checked 2026-07-24).
- Same store/developer split (stores verify age categories and parental consent and share
  signals on request; developers use the signals, keep ratings accurate, and trigger consent
  renewal on significant changes to terms/privacy/monetization). **Louisiana notably rejects a
  developer safe harbor** for reliance on store signals
  ([Wiley](https://www.wiley.law/alert-State-App-Store-Accountability-Acts-Introduce-New-Obligations-for-App-Developers)).
- No litigation blocking it found as of 2026-07-24.

### 2.4 Alabama — HB 161 (2026)

- Signed February–March 2026 (reports differ on the exact date:
  [Troutman](https://www.regulatoryoversight.com/2026/03/alabama-enacts-app-store-accountability-act-requiring-age-verification-and-parental-consent/) says Feb. 17;
  [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/alabama-enacts-app-store-accountability-act-requiring-age-verification) says March 9 — ⚠️ unresolved);
  **effective January 1, 2027**. Same four age categories (under 13 / 13–15 / 16–17 / 18+),
  store-side verification and parental consent, developer-side signal consumption; covers many
  preinstalled apps ([HB 161 engrossed text](https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/HB161-eng.pdf), checked 2026-07-24).

### 2.5 California — AB 1043, Digital Age Assurance Act (different model)

- Signed October 2025; **effective January 1, 2027**
  ([AB 1043 text](https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB1043), checked 2026-07-24).
- **OS/store-borne:** collect birth date/age at device setup; provide developers a real-time
  API signal of the user's **age bracket** (under 13 / 13–15 / 16–17 / 18+).
- **Developer-borne:** developers **must request the age-bracket signal when the app is
  downloaded and launched**. No parental-consent verification duty on developers; no age
  verification duty. Deliberately drafted to survive First Amendment challenge
  ([Kelley Drye FAQ](https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/faq-digital-age-assurance-act-california-youth-safety-on-the-internet)).

**Practical note:** Apple and Google are shipping age-range/declared-age APIs to satisfy these
laws; the developer-side work is largely "call the platform age-signal API, store the category,
gate minor accounts on the consent flag, keep store age ratings accurate, and notify stores on
significant changes."

---

## 3. State minor design/privacy codes and social-media laws

### 3.1 California AADC (AB 2273) — mostly enjoined; and inapplicable to a non-profit

- The CAADCA applies to a **"business" as defined by the CCPA** — for-profit + thresholds
  ([Cal. Civ. Code § 1798.99.30](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.99.30);
  § 1798.140(d) confirmed for-profit-only, checked 2026-07-24). **A non-profit is out of scope
  entirely.**
- **Litigation (in flux):** _NetChoice v. Bonta_. History: preliminary injunction (N.D. Cal. 2023) → 9th Cir. Aug. 2024 affirmed as to the DPIA provisions, vacated the rest → district
  court re-enjoined the whole Act (Mar. 2025) → **9th Cir. second opinion, March 12, 2026**
  ([No. 25-2366](https://law.justia.com/cases/federal/appellate-courts/ca9/25-2366/25-2366-2026-03-12.html)):
  data-use restrictions and the dark-patterns ban held likely unconstitutionally vague and
  remain enjoined; the coverage definition and age-estimation provision survived facial attack
  for now; remand on age estimation and severability. **Five of the six challenged substantive
  provisions remain enjoined as of mid-2026**
  ([Cooley](https://www.cooley.com/news/insight/2026/2026-03-30-netchoice-v-bonta-ninth-circuit-narrows-injunction-against-californias-ageappropriate-design-code-act);
  [DLA Piper](https://privacymatters.dlapiper.com/2026/03/the-ninth-circuits-latest-caadca-ruling-navigating-an-evolving-compliance-landscape/), checked 2026-07-24).

### 3.2 Maryland Kids Code (AADC, HB 603 2024) — in force, in litigation, inapplicable

- **In force since October 1, 2024**; first DPIA deadline April 1, 2026. Covers under-18 (a
  "child" is under 18), imposes a best-interests duty of care, DPIAs, default-high privacy
  settings, and dark-pattern prohibitions for products "reasonably likely to be accessed by
  children"
  ([Wilson Sonsini](https://www.wsgr.com/en/insights/maryland-age-appropriate-design-code-effective-october-1-2024.html), checked 2026-07-24).
- **But** a "covered entity" is a **for-profit** entity meeting one of: >$25M annual revenue;
  buys/receives/sells/shares data of 50k+ Maryland residents; or 50%+ revenue from selling
  personal data ([Inside Privacy](https://www.insideprivacy.com/childrens-privacy/maryland-enacts-age-appropriate-design-code/)).
  **Selftend (non-profit, tiny, no data sales) is out of scope.**
- **Litigation (in flux):** _NetChoice v. Brown_ (D. Md.). Motion to dismiss denied Nov. 24,
  2025 (no injunction — the law stands while the case proceeds); NetChoice added a dormant
  Commerce Clause claim and filed a second amended complaint April 2026
  ([Troutman](https://www.troutmanprivacy.com/2025/11/district-court-denies-motion-to-dismiss-challenge-to-marylands-kids-code/);
  [Privacy Daily](https://privacy-daily.com/article/2026/04/20/netchoice-files-amended-complaint-against-maryland-ageappropriate-design-code-2604200053), checked 2026-07-24).

### 3.3 Nebraska Age-Appropriate Online Design Code Act (LB 504) — effective, inapplicable

- Signed May 30, 2025; **effective January 1, 2026**; AG enforcement (up to $50k/violation)
  began July 1, 2026 ([LB 504 slip law](https://nebraskalegislature.gov/FloorDocs/109/PDF/Slip/LB504.pdf);
  [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/nebraska-enacts-new-laws-protecting-children-online), checked 2026-07-24).
- Applies to online services doing business in Nebraska meeting CCPA-style thresholds (>$25M
  revenue; 50k+ consumers'/devices' data; 50%+ revenue from data sales — Selftend meets none),
  with an exemption where <2% of users are minors. Duties: highest-protection defaults for
  minors, tools to limit contact/visibility/time, opt-outs from engagement features and
  personalized recommendations. **Out of scope for Selftend on the thresholds.**
- No suit against LB 504 itself found as of 2026-07-24 (NetChoice's Nebraska suit, _NetChoice
  v. Hilgers_, targets the separate LB 383 social-media parental-consent law).

### 3.4 Vermont AADC (S.69) — effective January 1, 2027; likely inapplicable

- Signed June 12, 2025; **effective January 1, 2027**; AG enforcement and rulemaking pending
  ([Vermont AG rulemaking page](https://ago.vermont.gov/vermont-age-appropriate-design-code-rulemaking);
  [Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/vermont-enacts-age-appropriate-design-code), checked 2026-07-24).
- Covers businesses that operate in Vermont, **generate a majority of revenue from online
  services**, and offer a service "reasonably likely to be accessed" by under-18 minors (2%+
  minor audience triggers). Duties: minimum duty of care (prevent compulsive use, emotional
  distress), default-high privacy, push notifications off for minors, data minimization; no
  explicit age-verification mandate. ⚠️ The revenue-based coverage test makes a free non-profit
  app likely out of scope, but the definition's application to zero-revenue non-profits is
  untested — recheck when AG rules issue (before Jan 2027).

### 3.5 Texas SCOPE Act (HB 18) — inapplicable by definition; partly enjoined

- Effective Sept. 1, 2024. Applies only to a **"digital service provider"** whose service
  (1) **connects users so they can socially interact**, (2) lets users create **public or
  semi-public profiles**, and (3) lets users **create/post content viewable by others**
  ([Tex. Bus. & Com. Code ch. 509 via HB 18](https://capitol.texas.gov/tlodocs/88R/analysis/pdf/HB00018E.pdf);
  [Texas AG summary](https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/securing-children-online-through-parental-empowerment), checked 2026-07-24).
  **Selftend has no social features → not a DSP → nothing attaches**, including HB 18's
  known-minor duties (parental tools, data-processing limits, targeted-ad ban for known minors
  under 18).
- **Litigation (in flux):** _CCIA & NetChoice v. Paxton_ — content monitoring-and-filtering
  duties enjoined Aug. 30, 2024; a Feb. 7, 2025 order extended the injunction to the
  targeted-advertising and age-verification provisions; a further preliminary injunction issued
  in _SEAT v. Paxton_ (Nov. 2025). The data-privacy/parental-tool provisions largely remain in
  effect for actual DSPs ([Kidlaw summary](https://kidlaw.org/2026/02/23/texas-scope-act/);
  [SEAT v. Paxton PI order](https://www.courthousenews.com/wp-content/uploads/2025/11/seat-v-paxton-scope-act-challenge-preliminary-injunction.pdf), checked 2026-07-24).

### 3.6 Social-media minor laws (definitional check — none reach Selftend)

- **Utah Minor Protection in Social Media Act (SB 194/HB 464, 2024):** applies to "social media
  companies"; **preliminarily enjoined Sept. 10, 2024** (_NetChoice v. Reyes_, now _NetChoice
  v. Brown_; 10th Cir. argument heard Nov. 20, 2025, decision pending as of 2026-07-24)
  ([PI order](https://netchoice.org/wp-content/uploads/2024/09/NetChoice-v-Reyes-2024.09.10-ECF-86-ORDER-Granting-PI.pdf);
  [TechPolicy tracker](https://www.techpolicy.press/tracker/netchoice-v-reyes/)). Not a social
  medium → inapplicable regardless.
- **Virginia SB 854 (2025):** social-media platforms must age-assure and cap under-16 users at
  one hour/day/platform absent parental consent; was to take effect Jan. 1, 2026 but
  **preliminarily enjoined Feb. 27, 2026**
  ([Wikipedia summary with case cites](https://en.wikipedia.org/wiki/Virginia_Senate_Bill_854);
  [Woods Rogers](https://www.woodsrogers.com/insights/publications/virginia-amends-data-privacy-law-to-impose-new-restrictions-on-social-media-platforms), checked 2026-07-24). Social-media-only → inapplicable.
- **Nebraska LB 383 (Parental Rights in Social Media Act):** effective July 1, 2026; being
  challenged (_NetChoice v. Hilgers_) ([Nebraska Public Media](https://nebraskapublicmedia.org/en/news/news-articles/lawsuit-filed-over-nebraska-law-requiring-age-verification-parental-consent-for-social-media/)). Social-media-only → inapplicable.
- **California SB 976 (addictive feeds) and similar:** regulate personalized/addictive feeds
  and nighttime notifications on feed-based services; Selftend has no feed → inapplicable
  (definitional; not further verified here).

---

## 4. Federal bills: COPPA 2.0 and KOSA — still not law (but closer than in 2024)

- **COPPA 2.0 (Children and Teens' Online Privacy Protection Act, S. 836, 119th Cong.)**:
  reintroduced Mar. 4, 2025 (Markey/Cassidy); reported unanimously from Senate Commerce
  June 25, 2025; **passed the Senate by unanimous consent March 5, 2026**; now pending in the
  House (companion [H.R. 6291](https://www.congress.gov/bill/119th-congress/house-bill/6291))
  ([S. 836](https://www.congress.gov/bill/119th-congress/senate-bill/836);
  [S. Rept. 119-99](https://www.congress.gov/committee-report/119th-congress/senate-report/99/1);
  [Markey release](https://www.markey.senate.gov/news/press-releases/senator-markey-celebrates-unanimous-senate-passage-of-his-bipartisan-children-and-teens-online-privacy-protection-legislation), checked 2026-07-24).
  If enacted it would matter to Selftend: bans targeted ads to under-17s (Selftend has none),
  requires teen (13–16) consent for data collection, an "eraser button," data minimization, and
  replaces pure actual knowledge with a broader knowledge standard.
- **KOSA (Kids Online Safety Act, S. 1748, 119th Cong.)**: reintroduced May 14, 2025
  (Blackburn/Blumenthal); sitting in Senate Commerce
  ([KHLaw](https://www.khlaw.com/insights/kosa-back-and-still-controversial), checked 2026-07-24).
- **KIDS Act (H.R. 7757)**: the House's omnibus — 14 bills folded together including KOSA-like
  safety duties (minus the duty of care) and COPPA 2.0 elements — **passed the House June 29,
  2026**; Senate sponsors (Blumenthal, Blackburn) have declared it dead without the duty of
  care ([Crowell](https://www.crowell.com/en/insights/client-alerts/house-advances-bipartisan-kids-online-safety-bill-but-senate-showdown-looms), checked 2026-07-24).
- **Confirmed: nothing federal beyond COPPA is law as of 2026-07-24.** The two chambers have
  each passed different vehicles; no reconciliation. Watch item, not an obligation.

---

## 5. Comprehensive state privacy laws: what the teen provisions actually require

### 5.1 California CCPA/CPRA — neutralized twice over

- **Entity-level:** the CCPA applies only to a for-profit "business"
  ([Cal. Civ. Code § 1798.140(d)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140):
  "organized or operated for the profit or financial benefit of its shareholders or other
  owners" + one of: >$25M revenue; 100k consumers'/households' data bought/sold/shared; 50%+
  revenue from selling/sharing; checked 2026-07-24). A non-profit Selftend is not a "business."
- **Provision-level:** [Cal. Civ. Code § 1798.120(c)](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.120)
  (checked 2026-07-24): "A business shall not **sell or share** the personal information of
  consumers if the business has **actual knowledge** that the consumer is less than 16 years of
  age, unless the consumer [13–15] … or the consumer's parent or guardian [under 13] … has
  affirmatively authorized the sale or sharing." Plus: "A business that **willfully
  disregards** the consumer's age shall be deemed to have had actual knowledge."
  **The rule regulates only sale/sharing.** If you never sell or share, there is nothing to
  opt into and no obligation attaches — the willful-disregard language only matters for
  businesses that do sell/share (it stops them claiming ignorance of age). The CCPA regs'
  minor-consent provisions (11 CCR §§ 7070–7072) likewise only govern how opt-in to sale/share
  is obtained — moot without sale/share.
- **California Delete Act (SB 362):** data brokers only — inapplicable.

### 5.2 Virginia VCDPA — nothing attaches

- VCDPA **exempts non-profits** outright and otherwise requires 100k VA consumers (or 25k +
  50% revenue from data sales) ([Va. Code § 59.1-576](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-576/), checked 2026-07-24).
- The 2024 amendment (**HB 707/SB 361, effective Jan. 1, 2025** — note: the ticket's premise
  of a 2025 amendment effective 2026 was off) protects **known children under 13 only**: no
  targeted ads/sale/significant profiling, purpose and retention limits, parental consent for
  precise geolocation; COPPA compliance satisfies it
  ([DWT](https://www.dwt.com/blogs/privacy--security-law-blog/2024/05/virginia-data-privacy-law-amended-for-under-18), checked 2026-07-24).
  No 13–17 protections were added. The 2025 minor bill was SB 854 (social media, enjoined —
  § 3.6). **With a 13+ floor and non-profit status: nothing attaches.**

### 5.3 Colorado CPA + SB 24-041 — **attaches** (minors' duties have no thresholds; CPA covers non-profits)

- The CPA has **no non-profit exemption**, and the SB 24-041 minors' provisions apply **without
  the CPA's 100k-consumer threshold** to _any_ controller offering an online service to a
  consumer it "actually knows or willfully disregards" is a **minor (under 18)** — **effective
  October 1, 2025** ([SB 24-041 text](https://leg.colorado.gov/bill_files/46008/download);
  [Lowenstein](https://www.lowenstein.com/news-insights/publications/client-alerts/colorado-tightens-rules-on-minors-online-data-are-you-ready-for-october-1-data-privacy), checked 2026-07-24).
- Duties for known minors (13–17 included):
  - **Duty of care:** use reasonable care to avoid any _heightened risk of harm_ to minors.
  - **Data protection assessment** for any service posing a heightened risk of harm.
  - **Consent** (minor's own at 13+, parent's under 13) required before: targeted advertising;
    sale; significant profiling; and — the one that touches product design — **using any
    "system design feature to significantly increase, sustain, or extend" a minor's use** of
    the service (streak mechanics, autoplay, engagement nudges, push-notification pressure).
  - **No precise geolocation** collection absent necessity + signal (Selftend collects none).
- The Colorado AG proposed CPA rule amendments on minors in Aug. 2025
  ([DWT](https://www.dwt.com/blogs/privacy--security-law-blog/2025/08/colorado-privacy-act-rule-updates-minors)); ⚠️ final-rule status not confirmed here — check before relying on rule detail.
- **For Selftend:** no ads/sale/profiling → those consent gates are moot. The live items are
  the duty of care, the assessment, and keeping any streak/reminder/gamification mechanics
  **optional and off by default for known minors** (or gated on the teen's own consent). The
  existing product guardrails (optional, non-punitive streaks/reminders) are essentially the
  compliance posture — Colorado turns them from values into duties.

### 5.4 Connecticut CTDPA + SB 3 (2023) + SB 1295 (2025) — **attaches** (the most demanding one)

- **Base CTDPA** (thresholds: 100k CT consumers, or 25k + 25% revenue from sale) exempts
  non-profits — but the exemption does **not** cover consumer-health-data provisions, and the
  **minors' provisions are codified separately** at
  [C.G.S. §§ 42-529 to 42-529e](https://www.cga.ct.gov/2023/ACT/PA/PDF/2023PA-00056-R00SB-00003-PA.PDF)
  (PA 23-56 §§ 7–13) and apply to **any controller offering an online service to consumers it
  has actual knowledge, or willfully disregards, are minors (under 18)** — analyses agree they
  reach beyond the base act's thresholds
  ([Syrenis](https://syrenis.com/resources/connecticuts-sb3-and-childrens-privacy/);
  [DWT](https://www.dwt.com/blogs/privacy--security-law-blog/2023/06/connecticut-data-privacy-act-amendments-minors), checked 2026-07-24).
  ⚠️ Whether the base act's non-profit exemption shields a non-profit from §§ 42-529 et seq. is
  not clearly settled in the sources reviewed; the conservative reading is that it does not.
  Treat CT minors' duties as attaching.
- **In force since October 1, 2024** (cure period ended Dec. 31, 2025; AG-discretionary cure
  since Jan. 1, 2026). Duties for known minors
  ([C.G.S. § 42-529a via FindLaw](https://codes.findlaw.com/ct/title-42-business-selling-trading-and-collection-practices/ct-gen-st-sect-42-529a/), checked 2026-07-24):
  - **Heightened duty of care:** "use reasonable care to avoid any heightened risk of harm to
    minors" caused by the service.
  - **Data protection assessments** for services offered to minors (purpose, data categories,
    foreseeable heightened risks, mitigation).
  - **Consent** (minor's own at 13+; parent's under 13; COPPA VPC satisfies the parental
    prong) required for: targeted ads; sale; certain significant-effect profiling; processing
    beyond what's reasonably necessary for the service; retention beyond necessity; new
    purposes; and **any system design feature used to "significantly increase, sustain or
    extend" a minor's use**.
  - **Precise geolocation:** only if necessary, with an active signal.
  - **Direct-message safeguards** to limit unsolicited adult-to-minor messages (moot — no
    messaging in Selftend).
  - Consent flows must not be dark-patterned.
- **SB 1295 (signed June 24, 2025; effective July 1, 2026 — in force now):** categorical ban
  (consent cannot cure) on processing minors' data for **targeted advertising or sale**;
  "heightened risk of harm" now expressly includes physical and **mental** health harms; the
  engagement-design prohibition is strengthened
  ([Hunton](https://www.hunton.com/privacy-and-cybersecurity-law-blog/connecticut-amends-the-connecticut-data-privacy-act);
  [FPF](https://fpf.org/blog/the-connecticut-data-privacy-act-gets-an-overhaul-again/), checked 2026-07-24).
  SB 1295 kept the non-profit exemption in the base act (early drafts removed it; the final
  bill did not), **except for consumer health data**
  ([Byte Back](https://www.bytebacklaw.com/2025/06/connecticut-enacts-significant-amendments-to-states-data-privacy-law/)).
- **Consumer health data (SB 3 §§ 1–6, effective Oct. 1, 2023):** applies to **all persons
  including non-profits**: no selling CT consumer health data without consent; employee/
  contractor confidentiality duties; ban on geofencing mental-health facilities
  ([FPF](https://fpf.org/blog/connecticut-shows-you-can-have-it-all/), checked 2026-07-24).
  Selftend: doesn't sell, doesn't geofence → satisfied by continuing current practice; the
  confidentiality duty is a light contractual/policy item.
- **For Selftend:** same practical posture as Colorado — no ads/sale (now categorically banned
  for minors anyway), engagement features gated/off for known minors, plus a written
  **minor-focused data protection assessment** and documented "reasonable care" analysis
  (Selftend's CBT content + crisis-guidance separation is directly relevant evidence of care).

### 5.5 Others in this family (brief)

- **Maryland MODPA** (comprehensive law, effective Oct. 1, 2025) bans sale and targeted
  advertising re consumers known to be under 18 — but has CCPA-style applicability thresholds
  (35k consumers) Selftend won't meet; ⚠️ its non-profit treatment was not verified here.
  Immaterial either way: Selftend doesn't sell or target ads.

---

## 6. Health-data angle: thought records as "consumer health data" (age-independent)

**Is CBT thought-record content "sensitive data"?** Yes, treat it as such. A thought record in
a self-help mental-wellness app is personal information that identifies or reasonably reveals a
consumer's **mental health status** — even without any diagnosis, state definitions reach
status, conditions, and _inferences_:

- **CCPA:** "sensitive personal information" includes "personal information collected and
  analyzed concerning a consumer's health"
  ([§ 1798.140](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140), checked 2026-07-24) — moot for a non-profit, noted for completeness.
- **VCDPA / CPA / CTDPA:** "mental or physical health condition or diagnosis" is sensitive
  data requiring opt-in consent — attaches only where those acts apply (per § 5, only CT/CO
  minors' provisions and CT health-data provisions realistically reach Selftend).
- **Washington My Health My Data Act (ch. 19.373 RCW)** — **applies to Selftend regardless of
  whether its privacy docs target WA.** Per
  [RCW 19.373.010](https://app.leg.wa.gov/RCW/default.aspx?cite=19.373.010) (checked 2026-07-24):
  - "Consumer health data" = personal information linked/linkable to a consumer identifying
    "past, present, or future physical or **mental health status**," expressly including
    "individual health conditions, treatment, diseases, or diagnosis" and "social,
    psychological, behavioral, and medical interventions," plus data **derived or inferred**
    from non-health information. CBT thought records and mood/routine data qualify.
  - "Regulated entity" = **any legal entity** that conducts business in WA **or targets
    products/services at WA consumers** and determines purposes/means — **no revenue
    thresholds, no non-profit exemption** (only government/tribal carve-outs). A US-wide app
    serving WA users is in scope; "small businesses" (fewer than 100k consumers' CHD/year)
    got a delayed start (June 30, 2024 vs. March 31, 2024) but are fully covered now.
  - "Consumer" = WA resident **or any natural person whose consumer health data is collected
    in Washington** — broader than residency.
  - **Duties:** (1) **opt-in consent** before collecting or sharing consumer health data
    _except_ collection/sharing "necessary to provide a product or service that the consumer
    to whom such consumer health data relates has requested" — Selftend's collection of
    thought records to deliver the CBT tool the user signed up for fits the necessity
    exception, but anything beyond that (analytics on health content, new uses) needs separate
    consent; (2) a **separate "Consumer Health Data Privacy Policy"** with a distinct
    homepage/app link; (3) consumer rights to access/delete (deletion extends to backups);
    (4) **valid authorization (not mere consent) for any sale** of CHD — Selftend sells none;
    (5) no geofencing around health facilities; (6) processor contracts.
  - **Enforcement:** WA AG **plus a private right of action** via the WA Consumer Protection
    Act — the sharpest enforcement tail in this whole memo.
- **Nevada SB 370** (effective March 31, 2024): near-clone of MHMD — applies to any person
  conducting business in NV or targeting NV consumers (non-profits included), same
  consent-unless-necessary model with **separate consents for collection and for sharing**, a
  consumer health data policy, access/deletion rights, authorization for sale — but **no
  private right of action** (NV AG/deceptive-trade enforcement)
  ([WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20230614-nevada-legislature-passes-consumer-health-data-privacy-bill);
  [FPF WA/NV comparison](https://fpf.org/wp-content/uploads/2023/06/NV_WA-Comparison-Chart-FINAL.pdf), checked 2026-07-24).
- **Connecticut consumer health data** (§ 5.4): applies to non-profits; satisfied by not
  selling and not geofencing.

**Why this section matters most:** these duties attach at **every age**, today, and are the
only ones in this memo with a private right of action (WA). They are also cheap for Selftend to
meet, because the necessity exception covers the core product and Selftend shares nothing.

---

## 7. Concrete obligations for Selftend at 13+

Per jurisdiction/law. "Store-borne" = Apple/Google carry it; "developer-borne" = Selftend must
act. Assumes the entity is a bona fide non-profit (see framing note — re-verify this premise).

### Federal — COPPA (16 C.F.R. Part 312, amended 2025)

**Developer-borne (light):**

1. **Neutral age gate** at signup: free-entry DOB/age, no "must be 13" hint before the
   question, no defaults, block + don't retain data on an under-13 answer, throttle immediate
   retries. This is the single operational requirement a 13+ floor creates.
2. **Delete on actual knowledge**: a support path/runbook for deleting accounts discovered to
   be under 13 (parent reports, self-disclosure).
3. Non-profit status likely places Selftend outside COPPA's "commercial purposes" scope
   anyway — treat the age gate as belt-and-braces plus app-store/state-law hygiene.
4. Nothing attaches at 13–17 under COPPA. Period.

### Texas SB 2420 (in force; merits appeal pending — flux)

**Store-borne:** age verification of Texas accounts, parental account linking, verifiable
parental consent for minors' downloads/purchases, signal transmission, revocation notices.
**Developer-borne:**

1. Assign an **age rating in the statutory categories (U13/13-15/16-17/18+)** for the app and
   each in-app purchase and provide it to Apple/Google (Selftend has no IAPs — rate the app).
2. **Consume the store's age-category + parental-consent signals** (platform APIs) and gate
   known-minor Texas accounts on the consent flag.
3. **Notify the stores on "significant changes"** to terms, privacy policy, or monetization —
   add this to the release checklist.
4. Use age signals only for compliance; encrypt in transit; delete after use.
5. Safe harbor for reasonable reliance on store signals.

### Utah SB 142/HB 498 (compliance since May 6, 2026; private right of action Dec. 31, 2026)

**Developer-borne:** same pattern — verify via store data that consent exists for minor
accounts; use age data only for the three enumerated purposes; no third-party sharing; notify
stores on data-collection/age-rating/monetization changes. Safe harbor for store reliance.

### Louisiana HB 570 (in force since July 1, 2026)

**Developer-borne:** same pattern (accurate age ratings, consume signals, consent-renewal
notices on significant changes) — **no developer safe harbor**, so document reliance on store
signals carefully.

### Alabama HB 161 (effective Jan. 1, 2027)

**Developer-borne:** same pattern, from 2027. Calendar item, not a today item.

### California AB 1043 (effective Jan. 1, 2027)

**Developer-borne:** **request the OS/store age-bracket signal at download and launch**; use
the bracket to apply minor protections. No consent verification duty. Calendar item for the
2027 releases.

### California CCPA/CPRA §1798.120(c)

**Nothing attaches**, twice over: (a) a non-profit is not a CCPA "business"; (b) the under-16
opt-in rule governs only **sale/share**, which Selftend never does — with no sale/share there
is nothing to authorize and the actual-knowledge/willful-disregard trigger has no object.
Keep the privacy policy's "we do not sell or share" statement accurate; that statement is the
compliance mechanism. Delete Act: data brokers only — nothing attaches.

### California AADC (AB 2273)

**Nothing attaches**: applies to CCPA "businesses" (for-profit + thresholds); also 5 of 6
challenged provisions remain enjoined (9th Cir., Mar. 12, 2026) — litigation flux.

### Maryland Kids Code

**Nothing attaches**: "covered entity" is for-profit with $25M/50k-consumer/50%-data-revenue
thresholds. In force for those who meet it (DPIAs due Apr. 1, 2026); litigation ongoing, not
enjoined.

### Nebraska LB 504 / Vermont AADC

**Nothing attaches** on thresholds (NE: CCPA-style; VT: majority-of-revenue-from-online-services
test — ⚠️ VT untested for zero-revenue non-profits; recheck when VT AG rules issue before
Jan. 1, 2027).

### Texas HB 18 SCOPE Act, and social-media minor laws (UT SB 194, VA SB 854, NE LB 383, CA SB 976)

**Nothing attaches, because** each requires social functionality Selftend lacks (HB 18's DSP
definition needs social interaction + public profiles + user content shared to other users;
the others regulate "social media companies"/"addictive feeds"). Several are enjoined anyway
(UT SB 194 since Sept. 2024; VA SB 854 since Feb. 2026; HB 18 partially). **Guardrail:** adding
any user-to-user feature (sharing, comments, profiles) would flip this whole category — treat
that as a legal-review trigger.

### Virginia VCDPA (incl. 2024 HB 707/SB 361)

**Nothing attaches**: non-profits are exempt from the VCDPA entirely; the minors amendment
covers known under-13 children only; SB 854 is social-media-only and enjoined.

### Colorado CPA + SB 24-041 — **attaches** (since Oct. 1, 2025)

**Developer-borne**, for any CO user Selftend actually knows (or willfully disregards) is
under 18 — with a 13+ gate collecting DOB, Selftend _will_ have actual knowledge of 13–17s:

1. **Duty of reasonable care** to avoid heightened risk of harm to minors.
2. **Data protection assessment** if the service poses heightened risk — do one minors-focused
   DPIA (can be shared work-product with the CT assessment below).
3. **Consent gate on engagement-extending design features** (streaks, nudges, notification
   pressure) for known minors: keep them off by default for minors and gated on the teen's own
   opt-in (13+) — Selftend's existing "optional and non-punitive" guardrail, made mandatory.
4. Targeted-ads/sale/profiling consent gates: moot (Selftend does none).
5. No precise geolocation: moot (none collected).

### Connecticut CTDPA §§ 42-529–42-529e + SB 1295 — **attaches** (since Oct. 1, 2024; SB 1295 since July 1, 2026)

**Developer-borne**, for known/willfully-disregarded minors under 18 (⚠️ non-profit reach of
these standalone sections not clearly settled; treat as attaching):

1. **Reasonable care to avoid heightened risk of harm** — which SB 1295 now defines to include
   _mental_ health harms; document the care analysis (crisis-guidance visibility, no shame
   mechanics, no diagnosis claims — Selftend's existing product guardrails are the evidence).
2. **Data protection assessment** for the service as offered to minors.
3. **Data minimization for minors**: process only what's reasonably necessary for the service;
   retention limits; new purposes need consent (minor's own at 13+).
4. **No engagement-extending design features** for minors absent consent (same posture as
   Colorado: off by default, teen opt-in).
5. **Categorical ban** (no consent cure, since July 1, 2026) on minors' targeted ads/sale —
   moot for Selftend, but means a future monetization pivot can never touch minors' data.
6. CT consumer health data (applies to non-profits): don't sell CHD (already true), no
   geofencing (n/a), internal confidentiality commitments for anyone with access to health
   data.

### Washington My Health My Data Act — **attaches now, at every age**

**Developer-borne**, for WA residents and data collected in WA (no thresholds, no non-profit
exemption, **private right of action**):

1. Publish a **separate Consumer Health Data Privacy Policy** with its own prominent link
   (homepage/app) — distinct from the general privacy policy.
2. Rely on the **necessity exception** for core collection (thought records are collected to
   provide the requested service); obtain **separate opt-in consent** before any collection or
   use of health data beyond that necessity (e.g., product analytics touching health content —
   which Selftend avoids anyway).
3. Honor **access and deletion** rights for consumer health data (deletion propagating to
   backups on their cycle).
4. **Never sell/share** CHD (sale would need a signed authorization; sharing needs separate
   consent) — current posture already complies.
5. Processor-role contracts with Supabase et al. covering CHD handling.

### Nevada SB 370 — **attaches now, at every age**

Same playbook as WA (consumer health data policy, consent-unless-necessary with _separate_
collection and sharing consents, access/deletion, authorization for sale); AG enforcement
only — no private right of action.

### Summary of what actually changes product behavior at 13+

1. **Neutral age gate** (COPPA + app-store hygiene) — new signup step.
2. **Minor flag + store age/consent signal consumption** (TX/UT/LA now; AL + CA AB 1043 from
   Jan. 1, 2027) — platform API integration and a gate on minor accounts pending parental
   consent status.
3. **Store-facing metadata duties**: statutory age-category rating; "significant change"
   notices to Apple/Google on terms/privacy/monetization changes — release-checklist items.
4. **Minors' DPIA + documented duty-of-care analysis** (CT since 2024, CO since Oct. 2025) —
   one written assessment covering both.
5. **Engagement mechanics off/opt-in for known minors** (CT + CO design-feature consent rules;
   streaks/reminders/nudges) — the existing non-punitive-guardrail posture, enforced by flag.
6. **WA/NV consumer health data compliance regardless of age**: separate health-data privacy
   policy link, consent architecture for anything beyond service necessity, deletion rights —
   the highest-priority gap if Selftend's privacy docs currently target only CA/VA/CO/CT.
