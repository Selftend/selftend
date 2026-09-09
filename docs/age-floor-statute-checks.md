# Age-floor statute checks

The primary-source verification of the per-country age floor that
[spec #227](https://github.com/Selftend/selftend/issues/227) §2 requires before
a row governs anyone's access. Run for
[#1763](https://github.com/Selftend/selftend/issues/1763).

**Checked: 2026-09-04.** Every row in § _The rows checked in this pass_ was read
out of a national statute, a national gazette, or a national data protection
authority's own publication of its statute — with two exceptions, both named as
such: Czechia, where only a private consolidator could be reached, and Hungary,
where nothing official could be. Consolidated mappings — the euConsent table and
the Library of Congress survey — are what is being checked here, so they are
never the evidence for a row.

The rows in § _Rows carried over_ were **not** read in this pass at all. That
section records where each came from, and when.

> [!IMPORTANT]
> **One row was contradicted, and the table has been corrected.** Denmark raised
> its age of digital consent from 13 to **15** with effect from **1 January
> 2024**; this check found `src/features/auth/age-floor.ts` still carrying
> `DK: 13`. It was raised rather than silently applied
> ([#1921](https://github.com/Selftend/selftend/issues/1921)), the owner decided
> to follow the statute, and **Denmark now sits at 15** in the floor table, in
> `age-floor.md`, and in the published policy text in both languages. § _The
> contradiction, and what was done about it_ keeps the finding on the record.

## What this replaces

The floor table came from `docs/research/2026-07-24-gdpr-consent-ages.md` (on
branch `research/gdpr-consent-ages`, not merged). That document marks each row
**(P)** where it followed the national statute, or **(C)** where it rested on a
consolidated mapping — and its own § _Open questions_ says the (C) rows must be
spot-checked before launch. Twenty-one rows carried (C).

**The (C) marking was right to exist.** That research also states that "no
country other than Slovenia is known to have changed its age since initial
implementation; a targeted search for 2023–2025 amendments found none". Denmark's
amendment was passed on 28 December 2023 and took effect on 1 January 2024 —
inside that window. A consolidated mapping that has not been refreshed since a
statute moved reports the old number with total confidence, which is the failure
mode this pass exists to catch.

Provenance for the whole table now lives here, on `dev`, rather than only on an
unmerged research branch. `test/age-floor-provenance.test.ts` holds every code
in `FLOOR_BY_COUNTRY` to a row in this file, and fails if a stated age and the
shipped floor disagree without the row being marked as contradicted or
unresolved.

## Verdicts

**`CONFIRMED`** — the age in the shipped table is what the national text says.
**`CONTRADICTED`** — the national text says something else. **`UNRESOLVED`** —
no official text could be reached; the row is not verified, and saying so is the
point.

A confirmation resting on **an absence** ("the implementing act contains no
Article 8 derogation, so the GDPR's own 16 applies") is weaker than one resting
on a quoted provision, and is marked `absence` rather than being presented as
equivalent. The GDPR supplies 16 by default, so silence and a provision reach the
same number by different routes — but only one of them can be quoted.

## The rows checked in this pass

Twenty-one (C) rows, plus Spain — whose (P) mark in the research actually rests
on a law firm's summary, which is exactly what a (C) row is.

| Code   | Floor in code | Verdict                                  | Provision read                                                                                        | Source                                                                                                                                                                                                     |
| ------ | ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AT** | 14            | `CONFIRMED`                              | Datenschutzgesetz, Art. 2 § 4(4) — _"wenn das Kind das vierzehnte Lebensjahr vollendet hat"_          | [RIS open-data, consolidated](https://ogd.ris.bka.gv.at/Dokumente/Bundesnormen/NOR40212006/NOR40212006.html)                                                                                               |
| **BG** | 14            | `CONFIRMED`                              | ЗЗЛД чл. 25в (нов, ДВ бр. 17/2019) — under-14 consent valid only if given by the parent or guardian   | [Държавен вестник, бр. 17/2019](https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=135056)                                                                                                            |
| **CY** | 14            | `CONFIRMED`                              | Ν. 125(Ι)/2018, άρθρο 8(1) — _"εάν το παιδί είναι τουλάχιστον δεκατεσσάρων (14) ετών"_                | [Επίσημη Εφημερίδα, Αρ. 4670, 31.07.2018](https://www.cylaw.org/nomoi/arith/2018_1_125.pdf)                                                                                                                |
| **CZ** | 15            | `CONFIRMED` ⚠️ source grade              | Zákon č. 110/2019 Sb., § 7 — capacity acquired _"dovršením patnáctého roku věku"_                     | [zakonyprolidi.cz, consolidated](https://www.zakonyprolidi.cz/cs/2019-110) — a **private** consolidator; state sources unreachable, see § _Source grades_                                                  |
| **DK** | 15            | `CONFIRMED` — **table corrected, #1921** | Databeskyttelsesloven § 6(2) — _"hvis barnet er mindst 15 år"_, since 2024-01-01                      | [LBK nr 289 af 08/03/2024](https://www.retsinformation.dk/eli/lta/2024/289); amending act [LOV nr 1783 af 28/12/2023](https://www.retsinformation.dk/eli/lta/2023/1783)                                    |
| **EE** | 13            | `CONFIRMED`                              | Isikuandmete kaitse seadus § 8(1) — _"kui laps on vähemalt 13-aastane"_                               | [Riigi Teataja, consolidated](https://www.riigiteataja.ee/et/akt/112072025014?leiaKehtiv)                                                                                                                  |
| **ES** | 14            | `CONFIRMED`                              | LO 3/2018 art. 7(1) — consent valid only _"cuando sea mayor de catorce años"_                         | [BOE, consolidated](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673)                                                                                                                                 |
| **FI** | 13            | `CONFIRMED`                              | Tietosuojalaki 1050/2018, 5 § — _"jos lapsi on vähintään 13-vuotias"_                                 | [Finlex, consolidated](https://www.finlex.fi/fi/lainsaadanto/2018/1050)                                                                                                                                    |
| **GR** | 15            | `CONFIRMED` ⚠️ source grade              | Ν. 4624/2019 άρθρο 21(1) — _"εφόσον ο ανήλικος έχει συμπληρώσει το 15ο έτος"_                         | [HDPA's own consolidated text](https://www.dpa.gr/sites/default/files/2023-06/4624_2019%20%CE%BC%CE%B5%20%CF%84%CF%81%CE%BF%CF%80%CE%BF%CF%80%CE%BF%CE%B9%CE%AE%CF%83%CE%B5%CE%B9%CF%82.pdf) — not the ΦΕΚ |
| **HR** | 16            | `CONFIRMED` — basis corrected            | ZPOUZP čl. 19(1) — _"ako dijete ima najmanje 16 godina"_. An **express provision**, not the default   | [Narodne novine 42/2018](https://narodne-novine.nn.hr/clanci/sluzbeni/2018_05_42_805.html)                                                                                                                 |
| **HU** | 16            | **`UNRESOLVED`**                         | Infotv. — no current consolidated text could be reached                                               | njt.hu unreachable across three clients; see § _The unresolved row_                                                                                                                                        |
| **IT** | 14            | `CONFIRMED`                              | Codice privacy art. 2-quinquies(1) — _"il minore che ha compiuto i quattordici anni"_                 | [Normattiva, in force from 19.09.2018](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2003-06-30;196~art2quinquies)                                                              |
| **LT** | 14            | `CONFIRMED`                              | Law No. I-1374 art. 6 — consent valid if given by a child _"ne jaunesnis negu 14 metų"_               | [e-seimas, consolidated 2026-06-30](https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/TAIS.29193/asr)                                                                                                         |
| **LU** | 16            | `CONFIRMED` — `absence`                  | Loi du 1er août 2018 — whole act read twice, no Art. 8 derogation                                     | [Mémorial A 686](https://data.legilux.public.lu/filestore/eli/etat/leg/loi/2018/08/01/a686/jo/fr/pdfa/eli-etat-leg-loi-2018-08-01-a686-jo-fr-pdfa.pdf)                                                     |
| **LV** | 13            | `CONFIRMED`                              | Personal Data Processing Law, **33. pants** — _"ja bērns ir vismaz 13 gadus vecs"_                    | [likumi.lv, consolidated](https://likumi.lv/ta/id/300099)                                                                                                                                                  |
| **MT** | 13            | `CONFIRMED` — citation corrected         | **S.L. 586.11 reg. 4** — _"lawful where the child is thirteen years of age"_, not Cap. 586 art. 9     | [legislation.mt, S.L. 586.11](https://legislation.mt/eli/sl/586.11/eng/pdf)                                                                                                                                |
| **NL** | 16            | `CONFIRMED` — `absence`, basis corrected | UAVG art. 5 applies only _"indien artikel 8 van de verordening **niet** van toepassing is"_ ⇒ default | [wetten.overheid.nl, current](https://wetten.overheid.nl/BWBR0040940/)                                                                                                                                     |
| **PL** | 16            | `CONFIRMED` — `absence`                  | Dz.U. 2018 poz. 1000 — as-promulgated and amendment-current texts both searched, no derogation        | [Dziennik Ustaw](https://www.dziennikustaw.gov.pl/DU/2018/1000/D2018000100001.pdf) · [consolidated via state ELI API](https://api.sejm.gov.pl/eli/acts/DU/2018/1000/text/U/D20181000Lj.pdf)                |
| **PT** | 13            | `CONFIRMED`                              | Lei 58/2019 art. 16(1) — _"quando as mesmas já tenham completado 13 anos de idade"_                   | [Diário da República, 1.ª série N.º 151](https://files.diariodarepublica.pt/1s/2019/08/15100/0000300040.pdf)                                                                                               |
| **RO** | 16            | `CONFIRMED` — `absence`, basis corrected | Legea 190/2018 is **silent**; its art. 1 scope list omits GDPR Art. 8 ⇒ default                       | [ANSPDCP's hosted text](https://www.dataprotection.ro/servlet/ViewDocument?id=1520) — DPA-hosted, no consolidation stamp                                                                                   |
| **SE** | 13            | `CONFIRMED`                              | Lag (2018:218) 2 kap. 4 § — _"om barnet är minst 13 år"_                                              | [riksdagen.se, consolidated](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2018218-med-kompletterande-bestammelser_sfs-2018-218/)                                 |
| **SK** | 16            | `CONFIRMED`                              | Zákon č. 18/2018 Z. z. § 15(1) — _"ak dotknutá osoba dovŕšila 16 rokov veku"_                         | [Slov-Lex, consolidated to 2024-07-01](https://static.slov-lex.sk/pdf/SK/ZZ/2018/18/ZZ_2018_18_20240701.pdf)                                                                                               |

## The contradiction, and what was done about it

**Denmark is 15, and has been since 1 January 2024.**

`LOV nr 1783 af 28/12/2023`, titled _"Justering af aldersgrænsen for samtykke til
behandling af personoplysninger i forbindelse med udbud af
informationssamfundstjenester"_, provides in § 1: _"I § 6, stk. 2 og 3, ændres
»13 år« til: »15 år«."_ The consolidated act now reads: _"behandling af
personoplysninger om et barn lovlig, hvis barnet er mindst 15 år"_.

Verified twice by different routes — the consolidated act on retsinformation.dk,
and the Folketinget bill record for L 79a (2023-24), whose title alone states
what the act does.

**What was decided.** The finding was raised rather than applied — §2's rule,
and the reason this document changes no floor on its own. The owner decided on
**2026-09-04** to follow the statute, and Denmark moved to 15 in the same change
that records this: `FLOOR_BY_COUNTRY`, the table in
[age-floor.md](age-floor.md), the published privacy text in `en` and `bg`, and
the literal expectation in `age-floor.test.ts` — which is the one place a floor
is restated rather than imported, so it had to move by hand.

⚠️ **Counsel has not seen it yet.** Spec §5 puts the legal review before
publication ([#1771](https://github.com/Selftend/selftend/issues/1771)), and
this correction reaches `dev` ahead of that review, not past it. Nothing here is
live until the §7 release.

Three things that shaped the decision:

- **The shipped table admitted 13- and 14-year-olds in Denmark**, below the age
  at which Danish law says they can consent for themselves. That is the failure
  direction that matters: under-protection, on the lowest floor in the table.
- **Correcting it before the release was nearly free; after it would not have
  been.** `policyVersion` was already at `2026-09-04-teen-floor` and unreleased,
  so Denmark moved on a version bump already paid for. The same edit after
  publication is a fresh disclosure change: another bump, a moved consent digest,
  and every existing user re-gated. The consent digest did move here — but that
  costs nothing while no user has accepted this version yet.
- **A grandfathering clause exists but does not help.** § 2, stk. 2 of the
  amending act preserves the old 13 rule for consents given _before_ 1 January 2024. Selftend holds no Danish consent predating that date, so every consent it
  collects falls under the 15 rule.

The research row this floor came from also names the wrong limb — it cites
`Databeskyttelsesloven §6(3)`, and **§ 6(2)** is what sets the age; § 6(3) is the
parental-consent fallback. That research is unmerged, so nothing in this change
corrects it; the row above is the citation to use. And the only "13 år" left
anywhere in the consolidated act sits inside the reproduced text of GDPR
Art. 8(1) in an annex — an easy way for a re-checker to confirm the wrong number.

## The unresolved row

**Hungary is not verified.** The Nemzeti Jogszabálytár (njt.hu), the official
consolidated repository, was unreachable across three different clients and five
URL forms; `magyarkozlony.hu` and `kozlonyok.hu` also failed. The Parliament's
own database carries only as-enacted texts, which cannot answer what Infotv. says
today.

What _was_ established, from as-enacted texts: the 2011 Infotv. contained a
pre-GDPR general capacity rule at § 6(3) (a minor who has reached 16 needs no
representative's consent), and the 2018 GDPR-adaptation act replaced that
subtitle wholesale without putting an Article 8 derogation in its place. So there
was no derogation as of 25 July 2018 — but **2019 to 2026 is unchecked**.

This is an open question for counsel, not a verified row. The number 16 is
probably right and is not currently relied on to admit anyone (16 is the GDPR's
own default, and the highest floor in the table), so the risk it carries is the
mildest kind: over-protection if wrong. It still must not be recorded as checked.

## Rows carried over, not re-checked in this pass

These nine were already followed to primary or national-DPA sources in the 2026-07-24
research and carry its **(P)** mark; the tenth, `US`, never appears in that table
at all because it does not come from GDPR Art. 8. They are listed so this file is
the complete provenance record for `FLOOR_BY_COUNTRY` — **not** because they were
re-verified today.

| Code   | Floor | Basis carried from the research (checked 2026-07-24)                                                                                                                                            |
| ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BE** | 13    | Act of 30 July 2018, art. 7 — [APD/GBA published text](https://www.dataprotectionauthority.be/publications/act-of-30-july-2018.pdf)                                                             |
| **DE** | 16    | GDPR default; [BDSG](https://www.gesetze-im-internet.de/englisch_bdsg/englisch_bdsg.html) contains no Art. 8 derogation                                                                         |
| **FR** | 15    | Loi 78-17 [art. 45](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037823135) — below 15, consent is given **jointly** by minor and parent                                          |
| **GB** | 13    | UK GDPR Art. 8, written in directly by the DPPEC (EU Exit) Regulations 2019 when [DPA 2018 s. 9](https://www.legislation.gov.uk/ukpga/2018/12/section/9) was omitted                            |
| **IE** | 16    | Data Protection Act 2018, [s. 31](https://www.irishstatutebook.ie/eli/2018/act/7/section/31/enacted/en/html)                                                                                    |
| **IS** | 13    | [Act No. 90/2018](https://www.wipo.int/wipolex/en/legislation/details/18498), art. 10                                                                                                           |
| **LI** | 16    | Datenschutzgesetz 2018 — GDPR default kept                                                                                                                                                      |
| **NO** | 13    | Personopplysningsloven 2018, § 5                                                                                                                                                                |
| **SI** | 15    | ZVOP-2, in force 26 Jan 2023 — **changed** from the default 16 Slovenia had while it had no implementing act                                                                                    |
| **US** | 13    | Not an Art. 8 row. COPPA regulates under-13s only ([15 U.S.C. § 6501(1)](https://www.law.cornell.edu/uscode/text/15/6501)); 13 is the floor at which no verifiable parental consent is required |

⚠️ **Denmark was a (P)-grade claim in spirit too** — the research cited a named
section of the right act and still had the wrong number, because the act moved
after the mapping it came from was written. A (P) mark records _how_ a row was
sourced, never _when_ it was last true. The annual check in the operations
runbook is what keeps that from rotting again.

## Source grades, stated rather than implied

Four rows rest on something less than a national gazette, and a reviewer should
know which:

- **Czechia** — `zakonyprolidi.cz`, a private consolidator. The official
  e-Sbírka is a JavaScript application that serves no text to a fetcher, the
  Sbírka zákonů PDF that the Chamber of Deputies' own record links to returns
  404, and EUR-Lex never produced the Czech transposition file. A state-published
  copy is the one outstanding fetch.
- **Greece** — the HDPA's own consolidated publication rather than the ΦΕΚ. The
  National Printing House download endpoint redirects to a bare IP address. The
  file is also dated 2023-06, so any amendment after mid-2023 is unreflected.
- **Romania** — the DPA's hosted copy of Law 190/2018; `legislatie.just.ro` was
  unreachable over three clients. That PDF carries no consolidation stamp, so a
  later amendment cannot be ruled out.
- **Austria** — `www.ris.bka.gv.at` is behind a bot challenge, which was **not**
  bypassed. The text came from the Bundeskanzleramt's own open-government-data
  host, which serves the identical consolidated document, located through the
  official RIS API.

**Portugal** has a narrower gap: the gazette text as published was read in full,
but DRE's consolidated view could not be reached to confirm art. 16 is unamended.
No evidence of an amendment was found, and the CNPD's decision disapplying nine
provisions of Lei 58/2019 does not touch art. 16.

## What else the statutes say

The check was for a number. These came with it, and each is a live product or
drafting question rather than a curiosity.

- ☠️ **The Netherlands exempts free help-and-advice services for minors
  outright.** UAVG art. 5(5) disapplies the article to _"hulp- en adviesdiensten
  die rechtstreeks en kosteloos aan een minderjarige … worden aangeboden"_ —
  help and advice services offered directly and free of charge to a minor. A
  free, non-profit mental-health self-help product is squarely the shape of thing
  that clause describes. It does not lower the Dutch floor by itself (Art. 8's
  own 16 still governs an information society service offered directly to a
  child), but it is the closest thing in any of the 22 statutes to Recital 38's
  counselling carve-out written into national law, and counsel should see it.
- **Slovakia imposes a verification duty, not just an age.** § 15(2) requires the
  controller to make _"primerané úsilie"_ — reasonable efforts, taking account of
  available technology — to verify that a legal representative gave consent for
  an under-16. That is a design obligation, and Selftend's answer to it is that
  it admits nobody under the floor rather than seeking parental consent at all.
- **Italy imposes a plain-language duty.** Art. 2-quinquies(2) requires the
  information notice to be _"particolarmente chiaro e semplice, conciso ed
  esaustivo, facilmente accessibile e comprensibile dal minore"_. That reaches
  the Italian privacy copy, if the app is ever offered in Italian.
- **Bulgaria and Spain are broader than Article 8.** ЗЗЛД чл. 25в governs consent
  by an under-14 generally, with information society services named as an
  included case; LO 3/2018 art. 7 likewise governs a minor's consent for _any_
  processing. In both, the threshold reaches beyond the Art. 8 scenario.
- **Croatia and Sweden are scoped by the child's residence.** Croatian čl. 19(2)
  applies to a child resident in Croatia; Swedish 2 kap. 4 § applies to a child
  _"som bor i Sverige"_, and 1 kap. 5 § extends it expressly regardless of where
  the controller is established. Self-declared country of residence is what the
  age gate collects, which happens to be the right question for both.
- **Greece is stricter than the GDPR baseline.** Art. 21(2) requires consent
  _given by_ the legal representative, dropping Art. 8(1)'s "or authorised by"
  limb. It also hooks on Art. 6(1)(a) rather than Art. 8.
- **Lithuania states no parental limb at all** — art. 6 makes the child's own
  consent valid from 14 and leaves GDPR Art. 8(1)'s second subparagraph to supply
  the parental route.
- **Malta's drafting is loose.** Reg. 4 says processing is lawful _"where the
  child is thirteen years of age"_, not "has attained the age of thirteen". Read
  hyper-literally that is a point rather than a floor; reg. 3 and the enabling
  power in Cap. 586 art. 33(g) both make "13 and over" the obvious reading.
- **Finland has a bill pending.** Finlex lists HE 46/2026 against the Data
  Protection Act. It was not read, and its effect on 5 § is unknown. Also worth
  knowing: Finland publishes **no official English translation** — Finnish and
  Swedish are the authentic texts, and Finlex files English under _unofficial_
  translations.

## Method, and what it does not cover

Each row was checked by locating the operative provision in an official text,
reading the provision itself, and quoting it in the original language. Where a
state publishes a consolidated version, that was preferred over the
as-enacted text, and the consolidation date is recorded above.

**What this pass does not establish:**

- **That no other row has moved.** Denmark was found because every (C) row was
  re-read, not because anything pointed at it. Rows carried over from the
  research (§ _Rows carried over_) were not re-read, so a Danish-style amendment
  in Belgium, France, Germany, Ireland, Slovenia, Iceland, Liechtenstein, Norway
  or the UK since 2026-07-24 would not have been caught here.
- **Contract-law capacity.** The floor is set by consent, not by contract
  (`docs/age-floor.md` § _Why the floor varies_), and minors' contractual
  capacity was not researched per country.
- **Anything beyond the age.** The obligations in § _What else the statutes say_
  were noticed while reading for the number; they are not the output of a
  systematic sweep for national obligations, and no such sweep has been run.

⚠️ One reading trap, recorded because it produced a confident wrong answer during
this pass: an automated summariser reading the Cypriot consolidated page returned
**16**, quoting a sentence that does not exist in the law. The correct value, 14,
is in the typeset gazette PDF cited above. Ages in this file were read from
statutory text, never from a summary of it.

## Where this is read next

- The owner's legal review, [#1771](https://github.com/Selftend/selftend/issues/1771)
  (spec §5), which happens before publication. **The Hungary gap is the one row
  that reaches it unfinished.** The Denmark finding is on it too, now as a
  correction already made rather than a decision still owed — counsel sees the
  changed floor, not a choice about it.
- The Denmark decision itself:
  [#1921](https://github.com/Selftend/selftend/issues/1921).
- The annual legal-landscape check in
  [operations-runbook.md](operations-runbook.md#annual-legal-landscape-check-minors),
  which is what keeps this file from becoming the next stale mapping.
