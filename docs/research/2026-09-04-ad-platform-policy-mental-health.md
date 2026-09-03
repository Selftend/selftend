# Which ad platforms will run ads for a free, non-profit mental-health app

Date: 2026-09-04 · Map: [#1842](https://github.com/Selftend/selftend/issues/1842)
· Ticket: [#1845](https://github.com/Selftend/selftend/issues/1845) · Blocks:
[#1850](https://github.com/Selftend/selftend/issues/1850)

The advertiser is a **free, non-profit, open-source mental-health self-help app**
whose store seller is an **individual with no legal entity**
([ADR-0005](../adr/0005-store-seller-stays-an-individual.md)), with a small
monthly budget.

**Everything below was checked on 2026-09-04**, and each claim carries the
official page it came from. The date is repeated per section anyway, because
`AGENTS.md` requires it wherever platform policy or pricing is named.

⚠️ **Method caveat.** Pages were fetched and rendered through a summarising
reader, not transcribed byte-for-byte. Passages in quotation marks are that
reader's rendering of the page text and should be treated as accurate in
substance, not as a verbatim transcript. Before anything load-bearing —
submitting a certification, filing a grant application, committing budget —
re-read the linked page in a browser.

⚠️ Where a figure is not published, this file says **"not published"** and states
no number. No spend figure here was inferred, rounded, or remembered.

☠️ **This file deliberately never spells out row 1 of `docs/positioning.md`
§ _Words never to use_, and a later session must not "fix" that.**
`test/positioning-copy.test.ts` builds its prose corpus by **walking `docs/`
recursively**, so every file in `docs/research/` is scanned by the row-1 rule.
Only `docs/positioning.md` and the published-record files are exempt — this one
is not. Quoting the phrase to make a point about it turns `verify` red.

---

## Headline

**The answer is not "none of them". Square 3's paid-media half survives.**

Four platforms will take this advertiser on published terms, and the two most
useful ones are the two the project would have picked on privacy grounds anyway.
**Not one platform requires a claim the guardrails forbid.** The frictions are
real but they are all in the same place: **you may not target people by their
mental health, and you may not write copy that tells the reader what they are
feeling.** Both of those are things this project already refuses to do.

| Platform                                                 | Accepts this advertiser?                                               | Individual, no entity?                                                                       | Published minimum spend                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Microsoft Advertising** (+ DuckDuckGo, part of Ecosia) | ✅ Yes — mental health is not a restricted category                    | ✅ **Explicitly named**: _"sole traders, freelancers, or hobbyists… Unregistered companies"_ | ✅ **$5.00/month, $0.05/day** — the only published figure in this file |
| **Apple Ads** (was Search Ads)                           | ✅ Yes — no category catches a self-help app                           | ✅ Yes — _"If you're a sole proprietor, you'll select No"_                                   | **Not published** (Basic is _capped_ at $10,000/month)                 |
| **Google Ads**                                           | ✅ Yes — out of scope of every healthcare certification                | ✅ Yes — a Bulgarian national ID card suffices                                               | **Not published**                                                      |
| **Meta**                                                 | ✅ Yes — health is **not** a Special Ad Category                       | ✅ Yes — payer may be the individual's own name                                              | **Not published** (the "$1/day" figure is stale)                       |
| **Reddit**                                               | 🟡 Probably — but see below                                            | ⚠️ Not published either way                                                                  | **Not published** (the "$5/day" figure is stale)                       |
| **Google Ad Grants**                                     | ❌ **No** — needs registered charity status + Goodstack                | ❌ No individual pathway                                                                     | (Prize is $10,000/month in-kind, Search-only)                          |
| **X / TikTok / Spotify / Pinterest (BG)**                | ❌ Ruled out — see § _Everything else_                                 | —                                                                                            | —                                                                      |
| **EthicalAds Community Ads**                             | 🟡 Free, entity-free, OSI-licence gated — but a **developer** audience | ✅ Yes                                                                                       | Free                                                                   |

**Five things that change the shape of the plan:**

1. **★ Microsoft Advertising is the recommendation, and it is not close.** It is
   the only channel where category, eligibility and minimum spend all resolve
   favourably _from primary sources_ rather than from an absence of prohibition —
   and it carries DuckDuckGo, which suits the posture. A **$5/month** published
   floor means the "small budget" constraint is not a constraint at all here.
2. **☠️ Apple Ads is blocked by our own copy, not by Apple.** Apple builds the ad
   **out of the App Store product page**, and the `subtitle` in
   `store/apple-info.json` is still the exact phrase row 1 of
   `docs/positioning.md` § _Words never to use_ bans.
   **[#1760](https://github.com/Selftend/selftend/issues/1760) is a prerequisite
   for the first Apple campaign.**
3. **☠️ Reddit forbids targeting the communities that matter, "under any
   circumstance."** Medical & Mental Health, Addiction Support and Trauma Support
   are all off-limits — positive _and_ negative targeting. Paid Reddit is not a
   faster version of the organic presence the project already has; it is a
   different and weaker thing.
4. **The Ad Grant is not merely out of reach — it is unattractive.** It requires
   a registered charity (which
   [ADR-0005](../adr/0005-store-seller-stays-an-individual.md) declined to form),
   it is **Search-only so it can never run App campaigns**, and it **mandates
   conversion tracking** — the one thing the shipped privacy policy forbids.
5. **☠️ Nothing can be measured today, and the honest fix is not a pixel.** No
   UTM, referrer or channel field exists anywhere in the app, and adding an ad
   SDK would require a privacy-policy amendment that **re-gates every existing
   user's consent**. See § _The guardrail direction_.

⚠️ **One risk large enough to name up front:** Meta ended political, electoral
and **social issue** advertising in the EU under the TTPA, and publishes no list
of what counts as a social issue. If mental-health creative is so classified it
is **undeliverable in the EU** — not restricted, undeliverable. Untested.

## Apple Ads (formerly Apple Search Ads)

**Verdict: accepts this advertiser. The blocker is ours, not Apple's.**

Note the rebrand: the product is now **Apple Ads**, and `searchads.apple.com`
301-redirects to `ads.apple.com`. **Basic and Advanced both still exist** on
2026-09-04 — Basic was not retired
([compare page](https://ads.apple.com/app-store/help/apple-ads-basic/0001-compare-apple-ads-solutions)).

**An individual with no legal entity is explicitly provided for.** The account
setup page's Business Details section says, in terms:
_"When asked whether you're a business entity, you'll select Yes if your company
is a business, organization, partnership, or educational/government institution.
**If you're a sole proprietor, you'll select No.**"_
([get-started/0004](https://ads.apple.com/app-store/help/get-started/0004-set-up-an-account),
checked 2026-09-04). **No D-U-N-S requirement is published for Apple Ads** — the
string does not appear on any Apple Ads page checked. D-U-N-S is an _Apple
Developer Program organisation-enrolment_ requirement (see
[ADR-0005](../adr/0005-store-seller-stays-an-individual.md)), not an ads one.
The real gate is an App Store Connect link with an Admin / Legal / App Manager /
Marketing role, which the individual account already satisfies
([get-started/0052](https://ads.apple.com/app-store/help/get-started/0052-solve-setup-and-access-issues),
checked 2026-09-04).

**Bulgaria is on both lists** — the storefronts ads run in, and the countries
advertisers may reside in
([countries-and-regions](https://ads.apple.com/app-store/countries-and-regions),
checked 2026-09-04). Billing entity for Bulgaria is Apple Distribution
International Ltd., Cork; there are no Bulgaria-specific extra terms
([countries-regions-terms](https://ads.apple.com/countries-regions-terms),
effective 2026-05-01).

**Health policy.** The advertising policies
([ads.apple.com/policies](https://ads.apple.com/policies), page states
"Last updated February 26, 2025", checked 2026-09-04) name fifteen prohibited
categories — none of which catches a self-help app — and the words _wellness_,
_mental health_, _therapy_ and _self-help_ appear **nowhere** in the document.
The one restriction in range is §4.3 **Pharmaceutical and Medical**, whose §5.2
placement table reads:

| Content                      | Search results | Search tab          | Today tab   | Product page |
| ---------------------------- | -------------- | ------------------- | ----------- | ------------ |
| Pharmaceutical and Medical   | Allowed\*      | Partially Allowed\* | Not Allowed | Not Allowed  |
| Sensitive Content or Imagery | Allowed\*      | Not Allowed         | Not Allowed | Not Allowed  |

\* _"May be restricted in accordance with local law and regulations."_

⚠️ **Uncertain, and unanswerable from published text: whether Apple's reviewers
classify a non-clinical mental-health self-help app as a "medical service"
under §4.3.** Nothing published defines the term. The exposure is bounded,
though — **search results, the main placement, is "Allowed" for that row
anyway**, so even the worst classification costs the Search tab, Today tab and
product-page placements, not the campaign.

**Minimum spend: not published.** Checked
[manage-budgets](https://ads.apple.com/app-store/help/bids-and-budget/0016-manage-budgets),
[create-campaigns](https://ads.apple.com/app-store/help/campaigns/0005-create-campaigns),
the compare page, the overview page, the glossary and the ToS on 2026-09-04:
the word "minimum" does not occur in a spend-floor sense on any of them. Record
this as **not published**, never as "no minimum" — absence of a published floor
is not a published absence.

What _is_ published (compare page, checked 2026-09-04): **Advanced** is
cost-per-tap with _"No budget maximum"_ and _"Maximum monthly budget:
Unlimited"_; **Basic** is cost-per-install and capped at _"Up to $10,000 (U.S.)
per app, per month"_. Also published, and relevant to a small budget:
_"your monthly spend won't be more than your daily budget times the average
number of days in a calendar month — which is calculated as 30.4 days"_, and
**lifetime budgets were paused for all campaigns in June 2026** — daily budget
is now the only mode. Apple advertises **a 100 USD sign-up credit** on both
[ads.apple.com/app-store](https://ads.apple.com/app-store) and
[/basic](https://ads.apple.com/app-store/basic) (checked 2026-09-04);
⚠️ the linked
[eligibility page](https://ads.apple.com/credit-eligibility-criteria-and-limitations)
(effective 2026-08-14) currently documents only the **Apple Maps** credits, so
the App Store credit's specific criteria could not be verified. Payment must be
a real card or wallet — _"pre-paid cards, gift cards, ATM cards"_ are invalid
([billing/0030](https://ads.apple.com/app-store/help/get-started/0030-set-your-payment-method),
checked 2026-09-04).

### ☠️ The creative is not written — it is the App Store product page

_"**Ads are created using the metadata and assets you already uploaded in App
Store Connect**, and all ads have an ad disclosure icon."_
([ad-placement-options](https://ads.apple.com/app-store/help/ad-placements/0081-ad-placement-options),
checked 2026-09-04). The glossary's "default ad" entry says the same: Apple
_"automatically creates a default image and text ad using the first few
screenshots and app previews taken from the App Store product page"_. Policy
§1.3 closes the loop: _"Your ad content — **including content you submit to the
App Store used to generate your advertisement** — must comply with all
applicable laws and regulations."_

**So Apple Ads has no ad copy to write, and therefore no copy to get wrong —
except the copy already shipped.** And the shipped copy is wrong. `store/apple-info.json`
still holds a `subtitle` that is, word for word, **row 1 of
`docs/positioning.md` § _Words never to use_** — the phrase that "clinically
means _with a practitioner_. Selftend has none." — a defect that document
already records as
live and tracks at [#1760](https://github.com/Selftend/selftend/issues/1760) and
[#1789](https://github.com/Selftend/selftend/issues/1789).

> **Turning on Apple Ads today would buy paid distribution for a banned phrase.**
> This is the single most actionable finding in this file: **#1760 is a
> prerequisite for the first Apple Ads campaign**, not a tidy-up running beside
> it. Metadata edits propagate to the live ad in up to two hours, and to the
> in-account preview in up to 24.

Claims rules are principle-shaped rather than a banned-word list: §1.5
_"All claims made in ad content must be adequately substantiated"_, §1.6 _"Ad
content may not be misleading"_, §1.8 the listing _"must accurately reflect the
app's intent and core experience"_. Through policy §1.2 these pull in App Review
Guideline **§1.4.1** on medical apps
([review guidelines](https://developer.apple.com/app-store/review/guidelines/),
checked 2026-09-04) — the same rule
[ADR-0005](../adr/0005-store-seller-stays-an-individual.md) already navigates.
Today tab ads additionally go through creative review and forbid _"pricing,
offers, ranking, or other incentivized promotions"_
([ads/0086](https://ads.apple.com/app-store/help/ads/0086-create-today-tab-ads),
checked 2026-09-04) — moot here, since Today tab is "Not Allowed" for the
Pharmaceutical and Medical row anyway.

**Non-profit and free-app treatment: nothing published.** No programme, discount,
grant or restriction; the words do not occur in the policies, ToS, help pages or
credit terms. Silence means the ordinary rules apply, not that a concession
exists. (Contrast Apple's _Developer Program_ fee waiver, which does exist and
does need official non-profit recognition —
[ADR-0005](../adr/0005-store-seller-stays-an-individual.md).)

**Tracking: optional, and this is the good news.** Attribution is described as
_"two freely available and complementary methods"_ — the AdServices attribution
API and AdAttributionKit
([attribution/0028](https://ads.apple.com/app-store/help/attribution/0028-measuring-ad-performance),
checked 2026-09-04) — and **neither appears in the published campaign
prerequisites**, which are: linked Apple Account, live app, chosen regions, a
budget, an account, a payment method
([campaigns/0005](https://ads.apple.com/app-store/help/campaigns/0005-create-campaigns),
checked 2026-09-04). Campaign reporting works with **no app-side code at all**.
The ToS in fact contains a tracking _prohibition_: _"you will not… access, use,
or otherwise process any information that can be used to track any individual or
device, except with the user's explicit permission by means of the App Tracking
Transparency APIs"_ ([ToS](https://ads.apple.com/terms-of-service), effective
2026-07-28). AdServices, if ever adopted, returns no user or device identifier
and rounds `clickDate` to the minute — but it is still an app-side integration
and a disclosure decision (see § _The guardrail direction_), not a free lunch.

⚠️ **Could not verify:** whether the Business Details **Tax ID** field is
mandatory for a sole proprietor with no VAT registration. It is listed without
being marked optional. Expect this at signup.

---

## Google Ads

**Verdict: accepts this advertiser. An individual verifies with a national ID
card. Expect to lose remarketing.**

**Healthcare and medicines policy: out of scope, and that cuts both ways.** The
policy's restricted categories are prescription opioids, unapproved substances,
unauthorised pharmacies, speculative/experimental treatment, clinical-trial
recruitment, restricted drug terms, prescription drug services, pharmaceutical
manufacturers, addiction services, and US health insurance
([adspolicy/176031](https://support.google.com/adspolicy/answer/176031), checked
2026-09-04). **A mental-health self-help app is in none of them**, and the page
contains no reference to mental health, counselling, therapy or self-help apps.
The addiction-services policy explicitly excludes adjacent ground:
_"Promotion of services unrelated to drug and alcohol addiction, like services
for impulse control disorders, behavioral addiction, or nicotine addiction, are
out of scope of this policy."_
([15598649](https://support.google.com/adspolicy/answer/15598649), checked
2026-09-04) — and its certified-advertising country list (Australia, Canada,
France, Ireland, New Zealand, USA) does not include Bulgaria in any case.

**No certification is required, because none exists for this category.** The
healthcare certification troubleshooter
([6099627](https://support.google.com/google-ads/troubleshooter/6099627), checked
2026-09-04) lists every available certification: prescription drug services
(pharmacy, telemedicine), pharmaceutical manufacturer, governmental or
well-established non-profit health advocacy organisation, addiction services,
US health insurance, US FDA cell/gene therapy licensee, verified election
advertiser. **There is no certification for mental health, counselling, therapy,
or a wellness/self-help app.** LegitScript / NABP accreditation attaches to
pharmacy, telemedicine, addiction and insurance, not to a self-help app.

> ☠️ **Read the asymmetry.** Out of scope means no certification is _required_ —
> and also that **if an ad is wrongly flagged under a healthcare policy there is
> no certification route to cure it.** Misclassification into "addiction
> services" is a documented operational complaint on Google's own support forums
> (threads
> [91383003](https://support.google.com/google-ads/thread/91383003) and
> [157608371](https://support.google.com/google-ads/thread/157608371), checked
> 2026-09-04). ⚠️ Those are **user forum posts, not policy** — cited only as
> evidence that the risk is real, never as a rule.

**The clause that actually bites is personalised advertising, and it costs
targeting rather than acceptance.** _Health_ is a listed sensitive interest
category, alongside _Abuse and trauma_, _Imposing negativity_ and _Relationship
hardships_ ([143465](https://support.google.com/adspolicy/answer/143465), checked
2026-09-04). The Health page names the case directly, listing
_"Counseling services for mental health issues like depression, anxiety, and
addiction"_ as covered personal health content, and covers mental as well as
physical conditions
([16701855](https://support.google.com/adspolicy/answer/16701855), checked
2026-09-04). The consequence: advertisers in a sensitive category **cannot use
advertiser-curated audiences** — no Customer Match, no "your data" segments, no
audience expansion, no lookalikes. **Still permitted**: Google's predefined
audiences (in-market, affinity, demographics, detailed demographics, life
events), location targeting, custom segments — and keywords. For a search-led
launch that is a small loss; it is a large loss only for a retargeting strategy,
which this project would refuse anyway.

⚠️ **Uncertain: whether ad _copy_ is restricted, as opposed to classified.** The
pages frame the sanction as a targeting restriction ("Eligible (limited)"), and
the [May 2025 update note](https://support.google.com/adspolicy/answer/16258024)
(checked 2026-09-04) describes targeting-only adjustments — yet the Health page
also talks about editing content that falls within the policy on your _site, app
and ads_. Treat **"copy is restricted" as unverified**; treat **"copy determines
classification, and classification removes your audience tools"** as the
supported reading.

**Advertiser verification: an individual passes.**
_"All advertisers will eventually be required to complete advertiser
verification"_, and required documents _"are based on your account type
'Organization' or 'Individual'"_
([9703665](https://support.google.com/adspolicy/answer/9703665) and
[9872280](https://support.google.com/adspolicy/answer/9872280), checked
2026-09-04; note the older `/answer/9703391` now 404s). For **Bulgaria,
Individual**, the requirement is a government-issued photo ID issued in an EEA
country or Switzerland — passport, national ID card, driving licence or
residence permit. **No entity, no registration document, no company number.**
Organisation type, by contrast, needs a certificate of incorporation or
commercial-register extract.

One consequence to weigh deliberately: _"After getting verified, some of your
info will appear in ad disclosures and the Ads Transparency Center"_
([9703665](https://support.google.com/adspolicy/answer/9703665), checked
2026-09-04). Verifying as an individual publishes the maintainer's own name.
That is **not new exposure** — the App Store already shows the maintainer's
legal name as seller under
[ADR-0005](../adr/0005-store-seller-stays-an-individual.md) — but it is the same
decision being taken a second time, and it should be taken knowingly.

**Minimum spend: not published.** No Google page states a minimum to run Google
Ads, and no page states affirmatively that there is none — the absence is the
finding. Two published figures must **not** be mistaken for a minimum: the
**payment threshold** is a billing trigger that rises with spend
([2375432](https://support.google.com/google-ads/answer/2375432)), and the
**$5,000 USD in any 3 of the last 12 months plus one year of business
registration** is eligibility for **monthly invoicing only**
([2393035](https://support.google.com/google-ads/answer/2393035)) — irrelevant to
an individual paying by card. Both checked 2026-09-04.

**What is forbidden in the creative** (all checked 2026-09-04):

- **Misrepresentation** ([6020955](https://support.google.com/adspolicy/answer/6020955)) —
  _"Making inaccurate claims or claims that entice the user with an improbable
  result (even if this result is possible) as the likely outcome a user can
  expect is not allowed"_; no clickbait or sensationalism; and
  _"Ads that use negative life events such as death, accidents, illness, arrests
  or bankruptcy to induce fear, guilt or other strong negative emotions to
  pressure the viewer to take immediate action are not allowed."_
- **Unacceptable business practices**
  ([15938071](https://support.google.com/adspolicy/answer/15938071)) — do not
  _"Lie about services that could put people's health or safety at risk, like
  pretending to provide medical help when you don't"_, and do not offer services
  _"including not having the right licenses or qualifications."_
- **Inappropriate content**
  ([6015406](https://support.google.com/adspolicy/answer/6015406)) — no
  _"Promotions that are likely to shock or scare."_
- ⚠️ There is **no standalone policy page titled "Exploitative"** in 2026. The
  exploitation-of-hardship idea lives in the Misrepresentation negative-life-events
  clause and in the personalised-advertising rationale.

> That second bullet is the one to hold copy against: _pretending to provide
> medical help when you don't_ is a **named Google Ads violation**, not only a
> positioning problem. It is the same failure mode row 1 of
> `docs/positioning.md` § _Words never to use_ bans — see § _The guardrail
> direction_.

**App campaigns review the store listing, not just the ad.**
_"When reviewing app ads, we look at a variety of elements, such as the ad, the
developer name or app title, the app icon, the installation page, and the app
itself for compliance"_
([6258274](https://support.google.com/adspolicy/answer/6258274), checked
2026-09-04). Also: _"Apps can't be promoted in places where the application is
not available for download."_ No health-app-specific clause exists on that page;
health apps inherit the healthcare and personalised-advertising policies. The
operational consequence is that **the Play listing is in scope for ad review** —
and unlike the App Store subtitle, `store/play-listing.md` is on-frame as of
2026-09-02.

---

## Google Ad Grants — closed, and confirmed closed

**Verdict: not available. The gap is the legal entity, exactly as the map
suspected — but the prize is also smaller than it looks.**

Eligibility requires being _"a nonprofit charitable organization in good
standing"_ and _"registered as a charitable organization in one of the countries
or regions listed"_, and _"All organizations must also be verified as a nonprofit
organization by Google for Nonprofits' validation partner Goodstack"_
([google.com/nonprofits/eligibility](https://www.google.com/nonprofits/eligibility/)
and [3215869](https://support.google.com/nonprofits/answer/3215869), both checked
2026-09-04). **The validation partner is Goodstack** — not TechSoup, and not
Percent under that name. Ineligible outright: governmental entities, hospitals
and healthcare organisations, schools. **An individual with no registered entity
fails the first requirement, and no individual pathway exists.**

**Bulgaria, the UK and the US are all supported countries**
([3215869](https://support.google.com/nonprofits/answer/3215869), checked
2026-09-04), so jurisdiction is not the obstacle.

**Exactly what would have to change:**

1. Register a non-profit legal entity with charitable / public-benefit status in
   a supported country. Bulgaria qualifies as a jurisdiction.
2. Have that entity validated by **Goodstack**.
3. Own the domain the ads point to — _"'Own' means you have administrative
   control over the website's content, structure, and technical settings"_
   ([1657899](https://support.google.com/nonprofits/answer/1657899), checked
   2026-09-04). **`selftend.org` already satisfies this.**
4. Meet the website policy: substantial unique mission-related content, a clear
   mission statement, no excessive third-party ads, not primarily affiliate
   traffic. **A free non-profit app site already satisfies this.**

**Steps 1 and 2 are the entire gap.** Note that step 1 is precisely the decision
[ADR-0005](../adr/0005-store-seller-stays-an-individual.md) declined for a
different reason, so an Ad Grant is not a free upside — it is a new argument for
reopening a settled ADR, and it should be weighed as one.

⚠️ **Could not verify:** which Bulgarian legal forms (сдружение в обществена
полза / фондация, and whether public-benefit registration in the Register of
Non-Profit Legal Entities is needed) Goodstack accepts. The country page confirms
Bulgaria is supported but does not enumerate accepted forms.

**And the prize is narrower than the headline.** _"Google Ad Grants offers
eligible organizations access to up to $10,000 USD per month"*
([57772](https://support.google.com/google-ads/answer/57772) and
[grants FAQ](https://www.google.com/grants/faq/), both checked 2026-09-04 —
**$10,000/month is current_*). The programme policies
([9314402](https://support.google.com/nonprofits/answer/9314402), checked
2026-09-04) then constrain it hard:

- **Search ads on Google.com only** — _"This is for Search ads shown on
  Google.com"_, appearing _"either independently or in positions below paid
  ads"_. **No display, no YouTube, and no App campaigns.**
- **5% account-level CTR every month**; two consecutive misses temporarily
  deactivates the account.
- **Single-word keywords banned** (except own-brand terms, recognised medical
  conditions, acronyms and a short exception list); **overly generic keywords
  banned** — the policy names _"cool apps"_, _"easy yoga"_, _"download games"_ as
  examples; keywords with **Quality Score 1 or 2 must be paused or removed**.
- **Conversion tracking is required** for accounts created since January 2018,
  with **at least one conversion per month**.
- Structure minimums: ≥2 ad groups per campaign, ≥2 sitelink assets.

> ☠️ **Two of those collide with this project specifically.** Search-only means a
> grant **could never run App campaigns** — for an app-first product, $10,000 of
> in-kind search inventory buys web traffic and nothing else. And **mandatory
> conversion tracking** is the one thing the shipped privacy policy currently
> forbids (§ _The guardrail direction_). The grant is not merely out of reach; it
> arrives with a string this project would have to think hard about accepting.

⚠️ **Could not verify** from primary text: the maximum CPC bid cap and the
geotargeting requirement. Both are widely repeated in secondary sources; **no
figure is stated here** because none was found on an official page.

---

## Meta (Facebook / Instagram)

**Verdict: accepts this advertiser, and health is _not_ a Special Ad Category —
but this is the platform where the guardrails and the mechanics grind hardest.**

**Special Ad Categories: health is not one.** The Marketing API enum is
exhaustive — `HOUSING`, `EMPLOYMENT`, `FINANCIAL_PRODUCTS_SERVICES`,
`ISSUES_ELECTIONS_POLITICS`, `NONE`
([developers.facebook.com](https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/special-ad-category),
checked 2026-09-04); the help page names the same four and notes _"The Credit
Special Ad Category has been replaced by the financial products and services
category"_
([298000447747885](https://www.facebook.com/business/help/298000447747885),
checked 2026-09-04). Selftend declares `NONE`.

### The binding constraint is the grammar of the ad copy

**Privacy Violations and Personal Attributes**
([transparency.meta.com](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/),
page change log last updated 2024-06-26, checked 2026-09-04):

> _"ads must not contain content that asserts or implies personal attributes.
> This includes direct or indirect assertions or implications about a person's
> race, ethnicity, religion, beliefs, age, sexual orientation or practices,
> gender identity, disability, **physical or mental health (including medical
> conditions)**…"_ — and the remedy: _"Instead, ads should focus on the benefits
> of the product or service being advertised."_

Meta's own worked examples under _Physical or mental health and disability_:

| Allowed                            | Not allowed                                              |
| ---------------------------------- | -------------------------------------------------------- |
| "Depression counseling"            | "Depression getting you down? Get help now."             |
| "Bulimia counseling available"     | "Do you have diabetes?"                                  |
| "New diabetes treatment available" | "Don't wait!! Get your spouse treated for cancer today…" |

**The rule is grammatical: name the product, never diagnose the reader.**
"Anxiety help" passes; "Feeling anxious?" is the exact shape of Meta's own
rejects. ✅ This _agrees_ with `docs/positioning.md` — "a CBT programme" is a
product noun phrase, which is precisely the compliant form. A copywriter reaching
for the second-person hook is the failure mode, and both the guardrails and Meta
forbid it.

⚠️ Verbatim oddity worth recording so it is not mistaken for a transcription
error: under _Vulnerable financial status_ the same "Don't wait!!" string appears
as an **allowed** example two rows below its **not-allowed** listing. That
contradiction is on Meta's live page.

### Targeting: health interests were removed in 2022

_"Starting January 19, 2022 we will remove Detailed Targeting options that relate
to topics people may perceive as sensitive, such as options referencing causes,
organizations, or public figures that relate to health…"_
([Meta business news, dated 2021-11-09](https://www.facebook.com/business/news/removing-certain-ad-targeting-options-and-expanding-our-ad-controls),
checked 2026-09-04). Meta's own recommended replacement for advocacy groups was
engagement Custom Audiences, website Custom Audiences and lookalikes, and
location targeting.

⚠️ **What detailed targeting survives today is not determinable from published
sources.** Meta publishes no browsable public list; the relevant help article is
JS-rendered and returns title-only. Whether "Meditation", "Mindfulness" or
"Self-help" still exist as interests **can only be settled inside an Ads Manager
account or via an API token**. Any blog that publishes a current list is not
reading a Meta source.

### ☠️ Custom Audiences and Business Tools contractually forbid health data

Custom Audience Terms
([facebook.com/legal/terms/customaudience](https://www.facebook.com/legal/terms/customaudience),
effective 2025-12-03, checked 2026-09-04) require that audience names and criteria
_"will not include, reflect, imply or be based on, directly or otherwise… health
information, financial information… or other categories of sensitive
information"_. Business Tools Terms
([facebook.com/legal/terms/businesstools](https://www.facebook.com/legal/terms/businesstools),
effective 2025-11-03, checked 2026-09-04) §1.h says the same of pixel, CAPI and
SDK data.

**So a conversion event named for a mood log or a completed thought record is a
terms violation, not merely a guardrail violation.** Meta's contract and
`product-principles.md` §7 land in the same place, from opposite motives. That is
convenient, and it should be read as convergence rather than as permission.

### App ads: an SDK is not mandatory, but an App ID is

A no-SDK campaign is documented — Meta describes link-click optimisation as the
fallback _"for small-scale advertisers who haven't installed the Facebook SDK"_
([optimizing-your-app-ad](https://developers.facebook.com/docs/app-ads/optimizing-your-app-ad),
checked 2026-09-04), and _"When you first complete app setup, you can only
optimize delivery of your ads for `LINK_CLICK`"_
([get-started](https://developers.facebook.com/docs/app-ads/get-started)). Any
other objective needs the Meta Business SDK, the Conversions API, or an MMP
([overview](https://developers.facebook.com/docs/app-ads/overview)). **Registering
an App ID and having a Facebook Page are unavoidable** for any objective that
names the app
([754990972934516](https://www.facebook.com/business/help/754990972934516),
[marketing-api/mobile-app-ads](https://developers.facebook.com/docs/marketing-api/mobile-app-ads)).

☠️ **And the SDK's price is exact.** _"When using the Facebook SDK, certain events
in your app are automatically logged and collected for Facebook Events Manager
unless you disable automatic event logging"_ — auto-logged events include **App
Launch, on every launch**, plus the advertiser ID by default
([app-events getting started](https://developers.facebook.com/docs/app-events/getting-started-app-events-ios),
checked 2026-09-04). Opt-outs exist
(`FacebookAutoLogAppEventsEnabled`, `FacebookAdvertiserIDCollectionEnabled`, and
their Android manifest equivalents) but turning both off leaves the SDK
collecting nothing useful for ads.

> **The choice is binary and should be stated as such: ship the SDK and Meta
> learns every time a person opens their mental-health app, or ship no SDK and
> accept click-only campaigns with no attribution.** For this project the second
> is the only option consistent with the shipped privacy policy — which means
> Meta delivers the _least_ measurable spend of any channel here.

⚠️ **Could not verify:** whether a plain Traffic ad may point at an App Store or
Play URL. Meta publishes nothing either way; the documented traffic-objective app
ad is re-engagement of existing installers and still needs the registered app.
**Do not assume the store-link workaround exists.**

### EU: an individual can run ads, and pays in personal-name exposure

_"Advertiser and payer information is required for all new or edited ads
targeting the EU or its associated territories. Without this information, your ad
cannot be published"_, and _"If you're an individual promoting a specific
product, service, candidate, etc., the advertiser may be the product/service/candidate
name, and the payer may be your name"_
([605021638170961](https://www.facebook.com/business/help/605021638170961),
checked 2026-09-04). The information appears in the **Meta Ad Library** and
_"will remain… for one year after it serves its last impression"_.

So: advertiser "Selftend", payer the maintainer's own name, publicly archived for
a year. Same decision as Google's Ads Transparency Center and the App Store
seller line — take it once, knowingly.

**Advertiser eligibility otherwise is fine.** Meta defines an advertiser as
_"The person or organization (**an individual or business entity**)"_
([721913190475838](https://www.facebook.com/business/help/721913190475838)), and
Business Verification is triggered by advanced product access, restricted
categories or risk signals rather than being a blanket prerequisite
([810450577622394](https://www.facebook.com/business/help/810450577622394)). Both
checked 2026-09-04.

### Minimum spend: not published — and correct a common figure

_"Minimum budgets may vary by country and objective"_, and _"You should see an
alert in Meta Ads Manager if your budget doesn't meet our minimum requirements"_
([203183363050448](https://www.facebook.com/business/help/203183363050448),
checked 2026-09-04). The only numeric rule on the page is relative: with a cost
per result goal, _"your daily budget should be at least 5 times the amount of
your cost per result goal"_. The Daily budget pages
([206296442738865](https://www.facebook.com/business/help/206296442738865),
[190490051321426](https://www.facebook.com/business/help/190490051321426))
carry only illustrative examples.

> ⚠️ **The widely repeated "$1 per day" minimum is from an older revision of that
> page and is NOT on it as of 2026-09-04.** Do not quote it. Meta publishes no
> absolute minimum today.

### ⚠️ The one risk that could close Meta in the EU entirely

Meta **ended political, electoral and social issue advertising in the EU** under
the TTPA regulation — such ads _"are no longer able to be delivered in the EU"_
([about.fb.com, 2025-07-25, updated 2025-10-06](https://about.fb.com/news/2025/07/ending-political-electoral-and-social-issue-advertising-in-the-eu/),
checked 2026-09-04). **Mental health is a plausible candidate for a "social
issue" classification**, and Meta publishes no post-TTPA enumeration of what
counts. If Selftend creative were so classified it would be **undeliverable in
the EU** — not restricted, undeliverable.

⚠️ **This is a risk to test, not a confirmed blocker.** But it is the single
largest unknown in this file, and it lands on the platform whose measurement
story is already the weakest. Weigh it before Meta is put in a plan.

⚠️ **Also unverified on Meta:** no Meta page found acknowledges the DSA
special-category profiling ban in an ad-targeting context. The 2022 health-targeting
removal achieves the same practical effect, but the acknowledgement itself is
unproven from primary sources. And no page affirmatively states that a self-help
health app needs _no_ written permission — that is an argument from absence, and
only submitting an ad settles it.

---

## Reddit Ads

**Verdict: accepts this advertiser — and then forbids the only targeting that
would have made it worth doing.**

Reddit's policy index
([overview](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Overview),
checked 2026-09-04) lists 24 named policies. **There is no mental-health policy
and no wellness policy.** The nearest is _Healthcare Products and Services_
([policy](https://business.reddithelp.com/s/article/healthcare-products-and-services-policy),
checked 2026-09-04), whose sales-managed gate is scoped to providers:
_"All healthcare providers and medical services must be appropriately licensed
and/or approved by the Food and Drug Administration (FDA) or other relevant
authority. Healthcare providers and medical services advertisers must be managed
by a Reddit Sales Representative."_

⚠️ **A self-help app is not a provider, clinic, telemedicine service or addiction
centre, so it appears to fall outside that gate — but this is an inference from
category absence, not a stated permission.** Reddit nowhere says a mental-health
self-help app is allowed.

### ☠️ The finding that decides Reddit

[Targeting Guidelines](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Targeting-Guidelines)
(checked 2026-09-04):

> _"You may not target communities in the following categories **under any
> circumstance**: Addiction Support · Mature Themes and Adult Content ·
> **Medical & Mental Health** · Trauma Support"_
>
> _"Reddit prohibits targeting users based on the following sensitive categories:
> … Genetic, biometric, or health data · **Physical and mental health** … Users
> under the age of 18"_
>
> _"These targeting rules apply to both positive targeting (i.e. including
> attributes) and negative targeting (i.e. excluding attributes)."_

**r/anxiety, r/depression, r/CBT and every equivalent are off-limits, and so is
excluding them.** Reddit stays usable — against general-interest, open-source,
privacy or Bulgaria-geo communities — but **the audience that would most want
this app sits precisely in the communities Reddit forbids targeting.** Note the
asymmetry with the project's existing Reddit presence: the _organic_ route
([#510](https://github.com/Selftend/selftend/issues/510),
`docs/launch/reddit-promotion-package.md`) can post in those communities under
their own rules; the _paid_ route cannot target them at all. Paid Reddit is not a
faster version of what the project already does there — it is a different, worse
thing.

**Individual advertiser: not published either way.** The
[Ads Services Agreement](https://business.reddithelp.com/s/article/Reddit-Advertising-Services-Agreement)
(checked 2026-09-04) defines "You" as _"an advertiser or a third party acting as
principal for an advertiser"_ and imposes no entity requirement, but **Reddit
publishes no advertiser-eligibility page at all.** ⚠️ Unproven in both
directions.

**Minimum spend: not published.** The
[budgets and bidding page](https://business.reddithelp.com/s/article/How-much-do-Reddit-Ads-cost)
(checked 2026-09-04) describes a daily budget and warns _"your ad group may
overspend its budget by up to 20%"_, and contains **no minimum, no dollar figure,
and no "at least"**. ⚠️ **The commonly repeated "$5/day minimum" is not on
Reddit's current page.** Do not quote it.

⚠️ **And a stale nonprofit claim, corrected.** Search engines still surface a
_"If you are a registered 501(c)(3) organization, you may be eligible to receive
ad credit"_ line attributed to Reddit's advertiser-credits article. **That text
is not on the live page** (checked 2026-09-04). No current Reddit nonprofit
programme is published.

---

## ★ Microsoft Advertising (Bing, and therefore DuckDuckGo and part of Ecosia)

**Verdict: the standout. The only channel where all three questions resolve
favourably from primary sources — category, eligibility, and a published
minimum.**

**Mental health is not a restricted category.** The Healthcare and Pharmaceutical
policy ([help.ads.microsoft.com](https://help.ads.microsoft.com/#apex/ads/en/60379/-1),
page states **"This page was last updated on July 1, 2026"**, checked 2026-09-04)
scopes preapproval narrowly: _"**Online pharmacies, telemedicine providers that
sell prescription drugs, and prescription drug manufacturers** must be preapproved
in order to serve ads on the Microsoft Advertising network."_ **Mental health,
therapy, counselling and self-help appear nowhere in the policy** — no
certification is required because no restriction applies.

The one adjacent trap: _"Drug & Alcohol Recovery — Advertising for drug and
alcohol addiction recovery is only allowed in the United States. Advertisers…
must be certified by LegitScript."_ **Keep creative off addiction and recovery
framing** or a certification requirement is triggered that this project cannot
meet.

Creative rules that bind copy: _"Ensuring all health-related claims are supported
by credible scientific evidence, including the source and date of the study when
applicable"_; _"Avoiding exaggerated or unsupported claims that could create
unrealistic expectations about product effectiveness"_; and comparative or
superlative statements must be _"supported by a trusted third-party study, with
the study name and date clearly referenced in the ad or ad destination."_ Also
relevant, and easy to miss: _"Not targeting consumers based on sensitive health
information."_

### ★ An individual with no company is an explicitly named verification path

[Advertiser identity verification](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_advertiseridentityverification)
(`ms.date` 2026-06-18, checked 2026-09-04):

> _"**Verify as an individual (if you represent or promote yourself as an
> individual)** — You can choose to verify as an individual if you meet any of
> the following criteria: **Independent contractors, sole traders, freelancers, or
> hobbyists** · **Unregistered companies/corporations or self-employed
> affiliates**"_

**This is the strongest eligibility finding in the file** — not an absence of a
prohibition, but a named category that describes this advertiser exactly. The
cost: personal identity documents plus _"a photo of yourself that reflects your
current appearance"_, the account's legal business name must match the person's
full name, and **verification is mandatory in the EEA, Bulgaria included** —
_"Most new accounts will have 30 days to complete the process. If not verified,
your account may stop showing ads in the European Economic Area (EEA)
countries/regions"_. Review takes 3–5 business days.

### ★ And the minimum spend is published, and it is tiny

[Currencies reference](https://learn.microsoft.com/en-us/advertising/guides/currencies?view=bingads-13)
(`ms.date` 2025-06-26, checked 2026-09-04):

| Currency | Minimum bid | Minimum daily budget | Minimum monthly budget |
| -------- | ----------- | -------------------- | ---------------------- |
| USD      | 0.05        | **0.05**             | **5.00**               |
| EUR      | 0.05        | **0.05**             | **5.00**               |
| GBP      | 0.05        | **0.05**             | **5.00**               |

BGN is not a bid or budget currency (it appears only in the conversion-revenue
list), so a Bulgarian account bills in EUR or USD. Billing threshold starts at
$50 for USD accounts, and _"In order to use a postpay threshold account, your
advertiser identity verification (AIV) status must be verified"_
([billing threshold](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_billingthreshold),
checked 2026-09-04).

**These are the only published minimum-spend figures anywhere in this file.**
Every other platform's minimum is "not published".

One extra policy that bites _because the app is free_: the Software Download
Products and Services, Freeware, and Shareware policy
([60386](https://help.ads.microsoft.com/#apex/ads/en/60386/-1), page states last
updated 2026-04-22, checked 2026-09-04) — _"All ads must disclose if a software
download is required to access content or services."_ Its heavier obligations
target desktop installers and mostly do not bite a store link or a web app, but
**the disclosure requirement applies to any ad driving an install.**

**Reach bonus that fits the privacy posture:** Microsoft's own network page names
the partners — _"These ads can appear with search results on sites like Microsoft
Bing, AOL, Yahoo, **DuckDuckGo, Ecosia**, and other partners"_
([about the network](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_aboutadvertisingnetwork),
`ms.date` 2026-06-18, checked 2026-09-04). DuckDuckGo sells nothing itself —
_"To advertise on DuckDuckGo, visit Microsoft Advertising"_
([DDG help](https://duckduckgo.com/duckduckgo-help-pages/company/advertise-on-duckduckgo-search),
checked 2026-09-04) — and Ecosia says _"It's unfortunately not currently possible
to advertise directly on Ecosia"_ and _"it isn't currently possible to target
Ecosia users directly"_
([Ecosia support](https://support.ecosia.org/article/108-how-to-advertise-on-ecosia),
checked 2026-09-04). ⚠️ Ecosia is **not purely Bing** — it names _"Microsoft
Bing, Google and EUSP"_ as result providers
([579](https://support.ecosia.org/article/579-search-results-providers)) — and
placement is excludable, not selectable, with aggregated reporting.

---

## Everything else, briefly

All checked 2026-09-04. "Not published" means the platform publishes no figure —
none was inferred.

| Channel                 | Mental health?                                                                                                                                                                                                                                                                                                                             | Individual, no entity?                                                                                                                                                                                            | Published minimum                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TikTok**              | Not a named category ([healthcare policy](https://ads.tiktok.com/help/article/tiktok-ads-policy-healthcare-pharmaceuticals))                                                                                                                                                                                                               | ☠️ **No** — _"You'll need a valid business license that matches the region where the business operates"_ ([registration](https://ads.tiktok.com/help/article/how-to-register-a-business-account))                 | **$50/day campaign, $20/day ad group** ([budget](https://ads.tiktok.com/resources/help/article/budget))                                                                                                                        |
| **X (Twitter)**         | ☠️ **Default-deny.** _"Unless listed below, the promotion of health and pharmaceutical products and services is prohibited"_, with scope including products that _"significantly influence mood"_ ([healthcare policy](https://business.x.com/en/help/ads-policies/ads-content-policies/healthcare)). No allowlist path for wellness apps. | Yes, but requires paid X Premium ([eligibility](https://business.x.com/en/help/ads-policies/campaign-considerations/about-eligibility-for-x-ads))                                                                 | _"There is no minimum spend required for X Ads"_ ([pricing](https://business.x.com/en/help/overview/ads-pricing))                                                                                                              |
| **Pinterest**           | Not a named category; ads may not _"reference sensitive health or medical conditions"_ unless paired with educational or charitable information. ☠️ **Bulgaria bans "Healthcare services" and "Non-conventional medical treatments" outright** ([guidelines](https://policy.pinterest.com/en/advertising-guidelines))                      | Yes — business account type, no entity, 16+ ([terms](https://business.pinterest.com/business-terms-of-service/))                                                                                                  | _"there is not a minimum budget"_ — stated only in the Performance+ FAQ ([page](https://business.pinterest.com/pinterest-performance-plus/))                                                                                   |
| **LinkedIn**            | Allowed, but _"LinkedIn reserves the right to restrict advertising related to any health matter"_; "mental health" appears nowhere ([ads policy](https://www.linkedin.com/legal/ads-policy))                                                                                                                                               | Needs a LinkedIn Page; no registration proof documented                                                                                                                                                           | **$10/day, $100 lifetime** ([best practices](https://business.linkedin.com/marketing-solutions/success/best-practices/maximize-your-budget)) ⚠️ no CPC figure exists on linkedin.com; every quoted CPC traces to third parties |
| **Spotify**             | Restricted category; wellness unnamed ([policies](https://adshelp.spotify.com/s/article/advertising-policies-US))                                                                                                                                                                                                                          | ☠️ **No** — _"Programs are not open to 'consumers'… or anyone acting for personal, family, or household purposes"_ ([advertiser terms](https://www.spotify.com/us/brands/legal/advertiser-terms-and-conditions/)) | **$15/day, ~$250 lifetime** ([budget](https://adshelp.spotify.com/s/article/Setting-your-budget-US)) — which contradicts the pricing page's _"determine your own budget"_                                                      |
| **DuckDuckGo / Ecosia** | = Microsoft                                                                                                                                                                                                                                                                                                                                | = Microsoft (individual OK)                                                                                                                                                                                       | = Microsoft ($5/month)                                                                                                                                                                                                         |
| **EthicalAds** (paid)   | ⚠️ **No category policy published at all** — only _"EthicalAds has final approval for all ads"_ ([FAQ](https://www.ethicalads.io/advertisers/faq/))                                                                                                                                                                                        | ✅ Explicitly — _"the individual person, company, or organization"_ ([terms](https://www.ethicalads.io/terms-of-service/)); no user tracking ([vision](https://www.ethicalads.io/advertising-vision/))            | **$1,000 minimum ad buy**, CPM $3.00–$7.50 ([advertisers](https://www.ethicalads.io/advertisers/))                                                                                                                             |
| **Carbon Ads**          | ⚠️ No health or content policy published anywhere; generic BuySellAds AUP                                                                                                                                                                                                                                                                  | Terms allow it; **no self-serve**, sales-gated ([carbonads.net](https://www.carbonads.net/))                                                                                                                      | None published. _"Successful first-time advertisers typically start with a $5,000–$10,000 monthly investment"_ is a **stated expectation, not a minimum**                                                                      |

**Two to rule out now.** **X** is a default-deny health policy with no path — do
not spend time on it. **Spotify** excludes non-business advertisers by its own
terms, and **TikTok** requires a business licence, which ADR-0005 says does not
exist. **Pinterest** is closed for healthcare services in Bulgaria specifically,
which is the one market the project has a second locale for.

---

## Free or discounted inventory without charity status

**Every mainstream ad grant requires formal charity registration. Exactly one
programme found does not.**

- ★ **EthicalAds Community Ads** — [ethicalads.io/community-ads](https://www.ethicalads.io/community-ads/)
  (checked 2026-09-04): _"running ad campaigns at no cost."_ Qualifications, in
  full: the organisation and linked site _"should not be trying to entice
  visitors to buy a product or service"_; _"A software project should have an
  **OSI approved license**"_; and it must not be tied to a paid advertiser.
  **No entity, no charity status, no tax ID, no minimum.** Selftend is AGPL-3.0
  (OSI-approved) and sells nothing, so it appears to qualify on both stated
  criteria. Read the Docs describes the publisher side —
  _"We'll show 10% of our ad inventory each month"_
  ([docs.readthedocs.com](https://docs.readthedocs.com/platform/en/stable/advertising/ethical-advertising.html)).
  ⚠️ **The audience is developers, not people looking for help.** This is a
  **contributor-recruitment** channel, not user acquisition — which is a real
  fit for `product-principles.md` §9 _Real Contributor Paths_, but should not be
  counted as paid reach in a marketing plan. ⚠️ And EthicalAds publishes no
  category policy, so acceptance of a mental-health app is unknown until asked.
- **Google Ad Grants** — requires charity registration plus Goodstack validation;
  **fiscal sponsorship is explicitly refused**
  ([9932982](https://support.google.com/nonprofits/answer/9932982), checked
  2026-09-04). See § _Google Ad Grants_ above.
- ☠️ **Microsoft Ads for Social Impact has ENDED** — _"will end effective December
  2025… we are no longer accepting new program applicants"_
  ([learn.microsoft.com](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_aboutadsforsocialimpact),
  checked 2026-09-04). Microsoft for Nonprofits carries no ad credits and lists
  **"Individuals"** as ineligible. So the best paid channel has no grant route.
- **Meta** — no published ad-credit programme at all as of 2026-09-04.
- **TikTok** — the NGO advertiser route requires national registration, and the
  Bulgaria clause names the _"Non-Profit Legal Entities Registry kept by the
  Registry Agency of the Republic of Bulgaria"_ by name.
- **Reddit** — no current nonprofit programme published (see above).
- **X** — Ads for Good is invitation-only since September 2015; _"you cannot
  request access at this time."_
- **LinkedIn** — _"We don't offer discounts for advertising products"_; its Ad
  Grants programme requires _"recognized, legal charitable status"_ and its three
  cause areas do not include mental health. ⚠️ The canonical help article
  returned HTTP 500 on 2026-09-04.
- **Open Source Collective** is a 501(c)(**6**) trade league — it solves money
  handling, **not** charity-equivalence for any of these grants.

## The guardrail direction

The ticket asked two specific questions. Both have answers, and they land on
opposite sides.

### Does acceptance require a forbidden claim? No — the pressure runs the other way

Nothing any platform requires would push copy toward a phrase
`docs/positioning.md` § _Words never to use_ bans. The platforms' health rules
push in the **same** direction as the guardrails, not against them:

| Guardrail                                                                  | The platform rule that agrees with it                                                                                                                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Row 1 of § _Words never to use_ — _"clinically means with a practitioner"_ | Google: do not _"pretend to provide medical help when you don't"_ or advertise services _"without the right licenses or qualifications"_ ([15938071](https://support.google.com/adspolicy/answer/15938071)) |
| No copy implying medical outcomes (`product-principles.md` §6)             | Google: no claims enticing _"an improbable result… as the likely outcome"_ ([6020955](https://support.google.com/adspolicy/answer/6020955)). Apple §1.5: claims _"must be adequately substantiated"_        |
| **no streaks** never advertised; no loss-framing (`ADR-0004`)              | Google _Imposing negativity_: _"suggesting negative outcomes for users if they don't take specific actions"_; Misrepresentation: no using negative life events _"to induce fear, guilt"_                    |

**The one live conflict is already ours.** `store/apple-info.json` ships a
`subtitle` carrying row 1's banned phrase, and **Apple Ads builds the ad out of
that metadata**. That is not a claim Apple demands — it is a banned phrase this repo
already knows about ([#1760](https://github.com/Selftend/selftend/issues/1760),
[#1789](https://github.com/Selftend/selftend/issues/1789)) that paid media would
amplify. Fix it before the first campaign, not after.

⚠️ **One structural risk in the other direction.** Google's personalised-advertising
classification appears to be driven by _content_ even though the sanction is on
_targeting_. A page or ad that names anxiety and depression plainly — which the
honesty guardrails favour — is more likely to be classified Health, and (per the
forum evidence, **not policy**) more likely to be misflagged as addiction
services, for which **no certification cure exists**. The guardrails do not
cause this; they simply do not protect against it.

### Does acceptance require refused tracking? Not to _run_ ads — but it does to _measure_ them

**No platform researched requires conversion tracking to run a campaign.** Apple
publishes attribution as _"two freely available and complementary methods"_ and
lists none of it among campaign prerequisites; Google Ads publishes no tracking
prerequisite for a self-serve card-paid account. **Ads can be bought today with
zero new SDKs.**

The conflict is with **measurement**, and it is sharper than it looks, because
the privacy policy this app ships makes the promise in eight separate places
(`src/i18n/locales/en/policies.json`, read 2026-09-04):

- _"We do not use advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."_
- _"We do not perform device fingerprinting and do not collect hardware identifiers, advertising IDs, or your location."_
- _"We do not use tracking cookies, advertising cookies, or third-party cookies."_
- _"We do not use advertising networks, social media widgets, or third-party tracking pixels that would set cookies on your device."_

`docs/analytics.md` states the same posture from the build side: _"The MVP does
not include any analytics SDK, tracking service, or telemetry"_, citing product
principle **§7 "Avoid surveillance-style analytics."**

☠️ **And the promise is version-pinned.** `src/features/policies/policy-content.test.ts`
hashes the English policy text and pins it to `policyVersion` as one tuple. A
**disclosure** change — which adding any ad SDK, pixel or advertising-ID use
would be — bumps the version, and a version bump **re-gates every existing
user's consent**. So the cost of a conversion pixel is not "one dependency"; it
is _a privacy-policy amendment plus a forced re-consent of the whole user base_.

**There is also, today, nothing to attribute with.** No UTM parameter, referrer,
or channel field is captured anywhere: `src/lib/linking.ts` opens external links
with `noopener,noreferrer`, and none of the three reports behind
`scripts/analytics-report.js` carries a channel axis. The map's _"Not yet
specified — what instrumentation would have to exist"_ has its answer:
**none exists, and the cheapest honest measurement is not a pixel.**

Three options, in ascending privacy cost:

1. **Platform-side only.** Read taps, installs and spend from the ad platform's
   own dashboard; read signups and activation from the existing Supabase
   aggregate reports; correlate by date and by campaign on/off. No app change,
   no policy change, no re-consent. Weak attribution, zero privacy cost.
2. **Channel-scoped landing pages or store links** (a distinct URL per channel,
   counted server-side without a per-user identifier). Modest signal, no SDK —
   but ⚠️ whether it is a _disclosure_ change is a judgement call for whoever
   owns the policy, not a settled fact.
3. **Platform SDKs / pixels / conversion tags.** Real attribution. Requires a
   privacy-policy amendment, a version bump, and a re-consent of every user.
   Refuse by default; if it is ever proposed, propose it as an ADR.

> ⚠️ **This is why Google Ad Grants is not merely unreachable — it is
> unattractive.** Ad Grants **mandates** conversion tracking with at least one
> conversion per month. Option 3 is the price of admission, before the entity
> even exists.

---

## The legal floor under every platform policy (EU)

Worth stating separately, because it explains _why_ the platform rules take the
shape they do, and it does not move when a platform changes its policy.

Under the **Digital Services Act**, providers of online platforms may not present
advertisements based on profiling that uses the **special categories of personal
data** in GDPR Article 9(1) — which include **data concerning health**. The
European Commission states it as: _"Targeted advertisement on online platforms is
also prohibited when profiling uses special categories of personal data"_, and
separately that _"The DSA bans targeted advertisement to minors on online
platforms"_
([ec.europa.eu — DSA impact on platforms](https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms),
checked 2026-09-04). The Commission has enforced it — it issued a formal request
for information to LinkedIn about _"the ban on presenting advertisements based on
profiling using special categories of personal data"_
([Commission news, 14 March 2024](https://digital-strategy.ec.europa.eu/en/news/commission-sends-request-information-linkedin-potentially-targeted-advertising-based-sensitive-data),
checked 2026-09-04).

⚠️ **Citation honesty:** this prohibition is commonly cited as **DSA Article
26(3)**, but neither Commission page checked states an article number, and
EUR-Lex could not be retrieved by the tooling used here. **Treat the article
number as unverified**; the substance is confirmed by two European Commission
pages.

**What this means in practice, and it is the shape of the whole answer:**

- **Profiling-based targeting on inferred mental-health interest is closed by
  law in the EU**, whatever any platform's policy says. That is the targeting a
  mental-health app would most want, and it is the one place no budget helps.
- **Search-intent targeting is not profiling.** A keyword matched against what
  someone typed this second is contextual, not a profile built from their health
  data. This is why Apple Ads, Google Search and Microsoft Advertising stay open
  while social interest-targeting narrows.
- The adults-only posture in `docs/product-principles.md` sits comfortably beside
  the minors ban rather than against it.

⚠️ This is a **structural reading**, not legal advice, and this file is not a
legal review.

---

## What this file does not settle

Recorded as open questions rather than hidden, per `AGENTS.md`.

1. **Whether Apple classifies a non-clinical mental-health self-help app as a
   "medical service" under policies §4.3.** Unanswerable from published text.
   Bounded: it would cost the Search tab, Today tab and product-page placements,
   never search results.
2. **Whether ad _copy_ — as opposed to targeting — is restricted under Google's
   personalised-advertising policy.** The sanction is documented as a targeting
   restriction; the classification input appears to include content.
3. **Whether the Apple Ads Business Details Tax ID field is mandatory for a sole
   proprietor with no VAT registration**, and how EU non-profit VAT is treated.
   Nothing published.
4. **The Apple Ads $100 App Store sign-up credit's eligibility criteria.** The
   linked eligibility page documents only the Apple Maps credits.
5. **Which Bulgarian legal forms Goodstack accepts** for Google for Nonprofits
   validation. Bulgaria is a supported country; the accepted forms are not
   enumerated.
6. **Google Ad Grants' maximum CPC bid cap and geotargeting requirement.** Widely
   repeated in secondary sources; not found on a primary page, so **no figure is
   stated here.**
7. **Which detailed-targeting interests survive on Meta.** Meta publishes no
   browsable list; only an Ads Manager account or an API token can settle whether
   "Meditation" or "Mindfulness" still exist.
8. **Whether mental-health creative trips Meta's EU social-issue classifier**,
   which would make it undeliverable in the EU. Needs a live test. **Largest
   single unknown in this file.**
9. **Whether Meta requires written permission for a self-help health app.** No
   affirmative "no" is published for any category — an argument from absence.
10. **Whether a plain Meta Traffic ad may point at a store URL.** Meta publishes
    nothing either way; do not assume the workaround exists.
11. **Whether a self-help app clears Reddit's healthcare policy**, and **whether
    Reddit accepts an individual advertiser.** Both are inferences from silence;
    Reddit publishes no advertiser-eligibility page.
12. **Whether X's _"significantly influence mood"_ clause captures a CBT app.**
    Genuinely ambiguous; no X page resolves it. Moot if X is ruled out.
13. **Whether EthicalAds or Carbon would approve a mental-health app.** Neither
    publishes a category policy. Only they can answer, and asking is free.
14. **Whether an EU individual with no company can pass TikTok verification**,
    and TikTok's unpublished verification spend threshold. Likely moot given the
    business-licence requirement.
15. **The DSA article number** for the special-category profiling ban — see
    § _The legal floor_.
16. **Whether a channel-scoped landing URL counts as a privacy-policy disclosure
    change.** A judgement for whoever owns the policy, not a fact this file can
    settle.
17. **Every platform reserves absolute discretion.** Apple's ToS: some ad content
    or content providers _"may not be eligible for promotion using the Services"_;
    policies §5.1 gives reviewers the final call. **No published rule guarantees
    acceptance anywhere.** Everything above says "the published rules do not
    forbid this", which is not the same as "this will be approved".
18. **Nothing here was tested by actually opening an account.** The cheapest way
    to convert most of the uncertainty above into fact is to open one account on
    one platform and try, at the smallest budget the platform will take.

## Sources

Every URL cited above was checked on **2026-09-04**. Grouped for re-checking:

- **Apple Ads** — [policies](https://ads.apple.com/policies) ·
  [ToS](https://ads.apple.com/terms-of-service) ·
  [countries and regions](https://ads.apple.com/app-store/countries-and-regions) ·
  [account setup](https://ads.apple.com/app-store/help/get-started/0004-set-up-an-account) ·
  [Basic vs Advanced](https://ads.apple.com/app-store/help/apple-ads-basic/0001-compare-apple-ads-solutions) ·
  [ad placements](https://ads.apple.com/app-store/help/ad-placements/0081-ad-placement-options) ·
  [budgets](https://ads.apple.com/app-store/help/bids-and-budget/0016-manage-budgets) ·
  [attribution](https://ads.apple.com/app-store/help/attribution/0028-measuring-ad-performance) ·
  [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Google Ads** — [healthcare and medicines](https://support.google.com/adspolicy/answer/176031) ·
  [addiction services](https://support.google.com/adspolicy/answer/15598649) ·
  [certification troubleshooter](https://support.google.com/google-ads/troubleshooter/6099627) ·
  [personalised advertising](https://support.google.com/adspolicy/answer/143465) ·
  [health in personalised ads](https://support.google.com/adspolicy/answer/16701855) ·
  [advertiser verification](https://support.google.com/adspolicy/answer/9703665) ·
  [verification documents](https://support.google.com/adspolicy/answer/9872280) ·
  [misrepresentation](https://support.google.com/adspolicy/answer/6020955) ·
  [unacceptable business practices](https://support.google.com/adspolicy/answer/15938071) ·
  [inappropriate content](https://support.google.com/adspolicy/answer/6015406) ·
  [app promotion](https://support.google.com/adspolicy/answer/6258274)
- **Google Ad Grants** — [grants](https://www.google.com/grants/) ·
  [eligibility](https://www.google.com/nonprofits/eligibility/) ·
  [countries](https://support.google.com/nonprofits/answer/3215869) ·
  [programme policies](https://support.google.com/nonprofits/answer/9314402) ·
  [website requirements](https://support.google.com/nonprofits/answer/1657899)
- **EU** — [DSA impact on platforms](https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms) ·
  [LinkedIn RFI](https://digital-strategy.ec.europa.eu/en/news/commission-sends-request-information-linkedin-potentially-targeted-advertising-based-sensitive-data)

- **Meta** — [personal attributes](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/) ·
  [health and wellness](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/) ·
  [unacceptable business practices](https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/) ·
  [special ad categories](https://www.facebook.com/business/help/298000447747885) ·
  [API enum](https://developers.facebook.com/documentation/ads-commerce/marketing-api/audiences/special-ad-category) ·
  [2022 targeting removal](https://www.facebook.com/business/news/removing-certain-ad-targeting-options-and-expanding-our-ad-controls) ·
  [Custom Audience Terms](https://www.facebook.com/legal/terms/customaudience) ·
  [Business Tools Terms](https://www.facebook.com/legal/terms/businesstools) ·
  [app ads optimisation](https://developers.facebook.com/docs/app-ads/optimizing-your-app-ad) ·
  [app events auto-logging](https://developers.facebook.com/docs/app-events/getting-started-app-events-ios) ·
  [EU advertiser and payer](https://www.facebook.com/business/help/605021638170961) ·
  [minimum budgets](https://www.facebook.com/business/help/203183363050448) ·
  [EU political/social-issue ads ended](https://about.fb.com/news/2025/07/ending-political-electoral-and-social-issue-advertising-in-the-eu/)
- **Reddit** — [policy overview](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Overview) ·
  [healthcare products and services](https://business.reddithelp.com/s/article/healthcare-products-and-services-policy) ·
  [targeting guidelines](https://business.reddithelp.com/s/article/Reddit-Advertising-Policy-Targeting-Guidelines) ·
  [services agreement](https://business.reddithelp.com/s/article/Reddit-Advertising-Services-Agreement) ·
  [budgets and bidding](https://business.reddithelp.com/s/article/How-much-do-Reddit-Ads-cost)
- **Microsoft Advertising** — [restricted categories](https://about.ads.microsoft.com/en-us/policies/restricted-categories) ·
  [healthcare and pharmaceutical](https://help.ads.microsoft.com/#apex/ads/en/60379/-1) ·
  [software download / freeware](https://help.ads.microsoft.com/#apex/ads/en/60386/-1) ·
  [advertiser identity verification](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_advertiseridentityverification) ·
  [currencies and minimums](https://learn.microsoft.com/en-us/advertising/guides/currencies?view=bingads-13) ·
  [billing threshold](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_billingthreshold) ·
  [network partners](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_aboutadvertisingnetwork) ·
  [Ads for Social Impact ending](https://learn.microsoft.com/en-us/advertising/msa-help/hlp_ba_conc_aboutadsforsocialimpact)
- **Others** — [TikTok healthcare](https://ads.tiktok.com/help/article/tiktok-ads-policy-healthcare-pharmaceuticals) ·
  [TikTok business registration](https://ads.tiktok.com/help/article/how-to-register-a-business-account) ·
  [X healthcare](https://business.x.com/en/help/ads-policies/ads-content-policies/healthcare) ·
  [X pricing](https://business.x.com/en/help/overview/ads-pricing) ·
  [Pinterest guidelines](https://policy.pinterest.com/en/advertising-guidelines) ·
  [LinkedIn ads policy](https://www.linkedin.com/legal/ads-policy) ·
  [Spotify advertiser terms](https://www.spotify.com/us/brands/legal/advertiser-terms-and-conditions/) ·
  [DuckDuckGo](https://duckduckgo.com/duckduckgo-help-pages/company/advertise-on-duckduckgo-search) ·
  [Ecosia](https://support.ecosia.org/article/108-how-to-advertise-on-ecosia) ·
  [EthicalAds Community Ads](https://www.ethicalads.io/community-ads/) ·
  [EthicalAds advertisers](https://www.ethicalads.io/advertisers/)

## Where this leaves square 3

Not a decision — this file is research, and the media square is decided on
[#1850](https://github.com/Selftend/selftend/issues/1850). But the ground it
stands on is now known:

- **Paid media is available at this budget.** Microsoft Advertising publishes a
  **$5/month** minimum and names this exact advertiser type as eligible. The book's
  "most lead sources should be paid" prescription is not refused by the
  platforms.
- **Two channels are gated on our own work, not theirs.** Apple Ads waits on
  [#1760](https://github.com/Selftend/selftend/issues/1760); every channel waits
  on a decision about whether anything can be measured without a pixel.
- **The ROI discipline the book demands cannot be had honestly today.** Option 1
  in § _The guardrail direction_ — platform dashboard plus date-correlated
  Supabase aggregates — is the ceiling until someone decides otherwise. A plan
  that promises attributed cost-per-install is promising something this product
  has refused to build.
