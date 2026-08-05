# Bulgarian foundation registration mechanics (фондация under ЗЮЛНЦ)

> Research for [wayfinder ticket #648](https://github.com/Selftend/selftend/issues/648),
> resolved 2026-08-05. Goal: register a Bulgarian foundation to hold Selftend so the Google
> Play developer account can become an Organization account (health-app policy requirement).
> All sources checked **2026-08-05** unless noted. Bulgaria is in the eurozone since
> 2026-01-01 (fixed rate 1 EUR = 1.95583 лв), so official fees are EUR-denominated; both
> currencies given.

## Recommended path (summary)

**One person can do this alone, cheaply, and the law fully supports it.** Register
**"Фондация Селфтенд" (additional foreign-language form "Selftend Foundation") в частна
полза** with a symbolic founding donation, yourself as sole founder and **едноличен
управител**, filed **online via ЕПЗЕУ with a КЕП** for **12.78 EUR**. Then request a
**D-U-N-S via ICAP CRIF Bulgaria** (free, up to 30 business days — start immediately after
getting the ЕИК), create the new Play **organization account** ($25) with a **new payments
profile** seeded from the D-U-N-S record, and **transfer the app** from the personal account.
Total out-of-pocket without a lawyer: **≈25–35 EUR + endowment + $25 Google fee**; steady-state
annual burden at zero revenue: **≈0 EUR** (one-time free inactivity declarations).

Choose **частна полза, not обществена полза**: private-benefit permits a single-person
governing body and minimal reporting, and can be converted to public-benefit later (чл. 2
ЗЮЛНЦ); the reverse conversion is **legally impossible** (чл. 2 + чл. 42 ЗЮЛНЦ). Google does
not distinguish nonprofit vs company — any legal entity with a D-U-N-S qualifies.

## 1. Founding requirements

- **Single founder: yes.** ЗЮЛНЦ чл. 33 — a foundation is founded inter vivos by a
  **unilateral founding act (учредителен акт)** gratuitously dedicating property to a
  non-profit goal, with **нотариално заверен подпис** on the act
  ([justice.government.bg ЗЮЛНЦ](https://justice.government.bg/home/normdoc/2134942720);
  [pravatami.bg/s/4749](https://www.pravatami.bg/s/4749): "няма пречка и едно лице да
  учреди фондация").
- **Founding act contents (чл. 34 ал. 1):** наименование, седалище, цели, вид дейност
  (обществена/частна полза), предоставеното имущество, органи, клонове, правомощия на
  органите, представляване, срок. Only **цели + имущество** are strictly required for
  validity (чл. 34 ал. 2) — but include everything for a clean registration
  ([BCNL ЗЮЛНЦ Q&A](https://bcnl.org/uploadfiles/documents/publikacii/zulnc_qa.pdf)).
- **Endowment (учредително дарение): no legal minimum.**
  ([advocatus.bg](https://advocatus.bg/registracia-na-fondacia/);
  [newbalkanslawoffice.com](https://www.newbalkanslawoffice.com/bg/donations-for-establishing-private-benefit-foundations-evidence-requirements-and-collection-accounts/)).
  A monetary donation **must actually be deposited into a набирателна сметка** opened in the
  foundation's name and the вносна бележка filed — missing proof is a ground for refusal.
  Customary range often quoted as 100–1000 лв (≈51–511 EUR) is **anecdotal, no citable
  source**; "symbolic" amounts are accepted.
- **Bodies (чл. 35 ал. 1):** "Фондацията има управителен орган, който може да бъде
  **едноличен или колективен**" — a private-benefit foundation may have exactly one body:
  a sole **управител**, who may be the sole founder (BCNL Q&A: private-benefit foundations
  may have a single one-person organ; public-benefit ones must have a collective supreme
  body + management body).

## 2. Public-benefit (обществена полза) vs private-benefit (частна полза)

| | Частна полза | Обществена полза |
|---|---|---|
| Governing bodies | one body, may be a sole управител | collective supreme body + management body mandatory (чл. 39 ал. 1); registries expect ≥3 people in practice |
| Annual ТРРЮЛНЦ filing | ГФО only (or free inactivity declaration) | ГФО **+ годишен доклад за дейността** (чл. 40 ал. 2), form Г2 by 30 September, free |
| Spending rules | free | чл. 41 restrictions on related-party spending (2/3 motivated decision) |
| Liquidation | per founding act | чл. 43–44: assets cannot go to founder/relatives; go to a similar public-benefit ЮЛНЦ |
| Donor tax relief | none | corporate donors up to 10% of profit (чл. 31 ЗКПО), individuals up to 5% of tax base (чл. 22 ЗДДФЛ) ([BCNL tax Q&A](https://bcnl.org/uploadfiles/documents/analyses/qa12.pdf)) |
| Sanctions | minimal | 2 years without reports → suspension of status ([BCNL 2025 reporting guide](https://bcnl.org/ngo_support/godishno-otchitane-na-yulncz-za-2025-g-zadalzheniya-srokove-dokumenti)) |
| Reversibility | **convertible to обществена полза later** (чл. 2) | **irrevocable** (чл. 2; чл. 42 bans conversion to private benefit) |

**Fit for a one-person free app: частна полза.** No collective body to recruit, no annual
activity report, and the public-benefit door stays open for a future where donor tax
deductibility or grant eligibility matters.

## 3. ТРРЮЛНЦ registration (Registry Agency)

Since 2018-01-01 foundations register in **ТРРЮЛНЦ** at the Registry Agency (not court),
receiving the **ЕИК automatically** (no separate BULSTAT).

- **Form А16** "Вписване на обстоятелства относно фондация"
  ([ЕПЗЕУ help](https://portal.registryagency.bg/help/topics/i4040.html)); field 17 selects
  обществена/частна полза.
- **Documents** ([BCNL registration guide](http://bcnl.org/ngo_support/kak-se-registrira-fondatsiya-v-registara-na-yulnts-neobhodimi-dokumenti);
  [ngobg.info 5.03](https://www.ngobg.info/bg/legislation/law/394-503)):
  учредителен акт with notarized signature; a redacted copy for publication (ЕГН/addresses/
  signatures blacked out); act appointing the bodies (can be inside the founding act);
  спесимен of the representative (**no notarization needed** when the manager files
  themself); вносна бележка for the endowment deposit; декларация чл. 13 ал. 4 ЗТРРЮЛНЦ;
  fee proof; (power of attorney + чл. 13 ал. 5 declaration if a proxy files).
- **State fee** (Тарифа АВ, чл. 16б): **50 лв paper / 25 лв online = 25.56 / 12.78 EUR**
  ([official tariff PDF](https://www.registryagency.bg/media/filer_public/2024/05/27/tarifa_za_drzhavnite_taksi_sbirani_ot_agentsiia_po_vpisvaniiata.pdf)).
  Online filing needs a **КЕП**. Optional name reservation (Д1): 40/20 лв ≈ 20.45/10.23 EUR
  (article mapping partially verified).
- **Timeline:** statutory ruling after **3 working days** (ЗТРРЮЛНЦ чл. 19 ал. 2), but
  deadlines are systematically overrun ([news.lex.bg](https://news.lex.bg/)); defects come
  back as **указания** curable via Ж1 within the same window. Practitioner end-to-end
  estimate ~7 working days incl. notary and bank; **realistically budget 2–4 weeks** with
  one указания round.
- **Name (чл. 7 ЗЮЛНЦ):** must include "фондация", be unique in the register, be written in
  Bulgarian (Cyrillic), and **may additionally be written in a foreign language** —
  "Фондация Селфтенд" + "Selftend Foundation" is the standard pattern.

## 4. Post-registration obligations (zero-revenue entity)

- **ЕИК:** assigned automatically at registration.
- **Bank account:** no statutory duty to maintain one after founding (the набирателна
  сметка converts/closes), but practically required for Google/Apple fees.
- **NRA:** no стопанска дейност, no rental income, no taxable expenses → **exempt from the
  чл. 92 ЗКПО annual return** ([BCNL 2025 reporting guide](https://bcnl.org/ngo_support/godishno-otchitane-na-yulncz-za-2025-g-zadalzheniya-srokove-dokumenti)).
- **NSI:** inactivity (or net revenue < 500 лв / 255.65 EUR) → free **декларация за
  неактивност**, 1 Jan–30 June, filed **once** (not re-filed for later inactive years).
- **ТРРЮЛНЦ:** inactive → free one-time **Г3 declaration** (чл. 38 ал. 9 т. 2 ЗСч) by
  30 June; active → ГФО via Г2 by 30 September, **no state fee**. Note: even small
  donations received/spent typically make the entity "active" → ГФО track.
- **Audit:** thresholds nowhere near relevant at zero revenue.
- **Accountant cost:** dormant year-end filings offered at ≈**80–100 лв / 41–51 EUR
  one-off**; subscription accounting from ≈100 лв/month is unnecessary while dormant —
  the inactivity declarations are DIY-realistic
  ([flexyfinance.bg](https://flexyfinance.bg/ceni-za-scetovodni-uslugi/),
  [bsiservice.bg](https://bsiservice.bg/ednokratni-schetovodni-uslugi/godishno-prikliuchvane-firmi/);
  generic firm pricing, NPO-specific unverified).

## 5. What Google Play organization verification demands

- **D-U-N-S is mandatory** for org accounts
  ([Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885);
  [Required information](https://support.google.com/googleplay/android-developer/answer/13628312)).
  For Bulgaria, D&B routes Google developers to **ICAP CRIF**
  ([D&B Google-developer page](https://www.dnb.com/en-us/smb/duns/google-developers.html) →
  [icapcrif.com/duns-number](https://www.icapcrif.com/duns-number/);
  Sofia office +359 2 8014 100, icapcrifbulgaria@icapcrif.com). Free, **up to 30 business
  days**; paid expedite availability in BG unverified — ask ICAP CRIF.
- **Exact-match rule:** the Google **payments profile legal name and address must match the
  D&B record exactly**; Google imports them from D&B
  ([13634888](https://support.google.com/googleplay/android-developer/answer/13634888);
  [paymentscenter 13992651](https://support.google.com/paymentscenter/answer/13992651)).
  Mismatches are fixed **at D&B first**, then retried in Google (~5 business days
  propagation). **Transliteration trap:** the BG register holds Cyrillic; D&B holds Latin —
  when applying via ICAP CRIF, **explicitly request the exact Latin spelling** you want
  (e.g. "SELFTEND FOUNDATION") and reuse it verbatim in the payments profile.
- **Identity documents:** D-U-N-S + government ID of the verifying person + an official
  organization document, all matching the payments profile
  ([10841920](https://support.google.com/googleplay/android-developer/answer/10841920)).
- **Website:** verify **selftend.org as a Search Console Domain property under the same
  Google account** as the Play Console — the org-website verification request then
  auto-approves ([android-developer-console 16641416](https://support.google.com/android-developer-console/answer/16641416)).
- **Contacts:** a private contact email + a **public developer email and phone** (orgs must
  show a phone), all OTP-verified
  ([10840893](https://support.google.com/googleplay/android-developer/answer/10840893)).
  A domain-matched email is best-practice, not a documented hard rule — use
  @selftend.org addresses anyway.
- **Conversion path:** there is **no in-place personal→org conversion**. Documented path:
  create a **new org account ($25, refundable if the old account is later closed)** and
  **transfer the app** ([6230247](https://support.google.com/googleplay/android-developer/answer/6230247)) —
  users, ratings, stats, listings carry over; **test tracks, Firebase/AdMob links, and
  report history do not** (re-link after). Needs both accounts' registration transaction
  IDs; support processes transfers in ~2 business days. A newer **owner-transfer flow for
  non-monetizing personal accounts**
  ([16909862](https://support.google.com/googleplay/android-developer/answer/16909862))
  may allow transferring the existing account to the foundation without a new account —
  whether it flips the account type is **unverified; ask Play support before choosing**.
- **Health-apps org mandate:** primary-sourced — health (incl. **mental health**, an
  explicit declared category) requires org accounts
  ([policy announcement 2024-07-17](https://support.google.com/googleplay/android-developer/answer/14993590);
  [health declaration 14738291](https://support.google.com/googleplay/android-developer/answer/14738291);
  [categories 13996367](https://support.google.com/googleplay/android-developer/answer/13996367)).
  The widely reported **2026-01-28 migration deadline for existing developers is
  secondary-only** (blogs); Google delivers individual deadlines via Play Console. That
  date has nominally passed — **check Play Console → Policy status / Account details
  promptly**.

## 6. Foundation-vs-company gotchas

- Google's docs make **no nonprofit/company distinction**; only government bodies get a
  D-U-N-S waiver. A фондация follows the standard org path.
- The most common org-verification rejection (community-sourced) is **name mismatch
  between the uploaded document and the D&B profile**; D&B corrections can require two
  legal documents ([Subsplash troubleshooting](https://support.subsplash.com/en/articles/10228303),
  secondary). The Cyrillic→Latin transliteration risk above is the main foreseeable
  failure mode for a BG foundation. No documented Bulgarian-foundation-specific case found.

## Cost and timeline picture

| Item | Cost | Time |
|---|---|---|
| Notary заверка на подпис (founding act) | 3–9 EUR | same day |
| Набирателна сметка + deposit | 5–10 EUR fees + endowment | 1–2 days |
| ТРРЮЛНЦ state fee (online, КЕП) | 12.78 EUR | 3 working days statutory; 2–4 weeks realistic |
| Lawyer (optional, customary) | ~119–180 EUR turn-key | — |
| D-U-N-S via ICAP CRIF | free | up to 30 business days (parallelize) |
| Play org account | $25 | verification review ≈5 days; app transfer ≈2 business days |
| Annual steady state (dormant) | ≈0 EUR (free one-time declarations); 41–51 EUR if using an accountant | — |

**Critical path:** foundation registration (~2–4 weeks) → D-U-N-S (~up to 6 weeks,
started the day the ЕИК exists) → Play org account + verification (~1–2 weeks) → app
transfer (days). **Realistic end-to-end: 2–3 months.**

## Unverified points

1. Customary endowment range (100–1000 лв) — anecdotal, no citable source.
2. "Minimum three founders" for public-benefit — registry practice derived from чл. 39
   ал. 1's collective-body rule, not a statutory founder count.
3. Exact current verbatim of чл. 7 and чл. 2 post-2018 renumbering (lex.bg blocked
   automated access; substance confirmed across BCNL, balans.bg, kik-info).
4. Name-reservation fee article mapping in the tariff PDF.
5. ICAP CRIF Bulgaria paid-expedite existence/price for D-U-N-S.
6. Whether the owner-transfer flow (16909862) flips account type personal→org.
7. The 2026-01-28 health-app org-account migration deadline (secondary sources only).

## Primary sources (all checked 2026-08-05)

- ЗЮЛНЦ text: [justice.government.bg/home/normdoc/2134942720](https://justice.government.bg/home/normdoc/2134942720); verbatim reproduction in [BCNL ЗЮЛНЦ Q&A](https://bcnl.org/uploadfiles/documents/publikacii/zulnc_qa.pdf) (lex.bg blocked automated fetching)
- Registry Agency: [ЕПЗЕУ А16 help](https://portal.registryagency.bg/help/topics/i4040.html), [official fee tariff PDF](https://www.registryagency.bg/media/filer_public/2024/05/27/tarifa_za_drzhavnite_taksi_sbirani_ot_agentsiia_po_vpisvaniiata.pdf)
- BCNL guides: [foundation registration](http://bcnl.org/ngo_support/kak-se-registrira-fondatsiya-v-registara-na-yulnts-neobhodimi-dokumenti), [2025 annual reporting](https://bcnl.org/ngo_support/godishno-otchitane-na-yulncz-za-2025-g-zadalzheniya-srokove-dokumenti)
- Google Play Console Help: answers [13634885](https://support.google.com/googleplay/android-developer/answer/13634885), [13628312](https://support.google.com/googleplay/android-developer/answer/13628312), [13634888](https://support.google.com/googleplay/android-developer/answer/13634888), [10841920](https://support.google.com/googleplay/android-developer/answer/10841920), [10840893](https://support.google.com/googleplay/android-developer/answer/10840893), [6230247](https://support.google.com/googleplay/android-developer/answer/6230247), [16909862](https://support.google.com/googleplay/android-developer/answer/16909862), [14993590](https://support.google.com/googleplay/android-developer/answer/14993590), [14738291](https://support.google.com/googleplay/android-developer/answer/14738291), [13996367](https://support.google.com/googleplay/android-developer/answer/13996367); [paymentscenter 13992651](https://support.google.com/paymentscenter/answer/13992651)
- D&B / ICAP CRIF: [Google-developer D-U-N-S page](https://www.dnb.com/en-us/smb/duns/google-developers.html), [worldwide network partners](https://www.dnb.com/en-us/why-dnb/partnerships/worldwide-network/partners.html), [icapcrif.com/bg](https://www.icapcrif.com/bg/en/)
- Practitioner guides (secondary): [advocatus.bg](https://advocatus.bg/registracia-na-fondacia/), [pravatami.bg/s/4749](https://www.pravatami.bg/s/4749), [yuyaconsult.com](https://yuyaconsult.com/kak-da-registrirash-npo/), [juen.bg](https://juen.bg/registratsia-na-npo/), [ngobg.info 5.03](https://www.ngobg.info/bg/legislation/law/394-503), [centara.bg](https://centara.bg/registratsia-na-fondatsia/)
