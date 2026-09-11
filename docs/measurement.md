# Measurement spec — how Selftend counts visitors and arrivals

**Status:** Decided spec, assembled 2026-09-11 from wayfinder map [#2301](https://github.com/Selftend/selftend/issues/2301) on its last ticket, [#2310](https://github.com/Selftend/selftend/issues/2310). Every section links the ticket whose resolution comment holds the full reasoning and the owner's ruling. ☠️ **Almost nothing here is built.** The one schema change is now built ([#2323](https://github.com/Selftend/selftend/issues/2323), § 4 and § 10 items 1–3); the link-tagging scheme is still specified and waiting (§ 5, § 10 item 4); the visitor layer was measured and **declined** (§ 2.3); everything else is a refusal, a cadence or a trigger. That is the honest output of the map and not a shortfall.

**Audience:** Developers and product contributors; the owner for the store-console and Cloudflare dashboard reads in § 6.

**The word:** the two layers are **visitors** and **arrivals**, defined in § 1 and used nowhere else in this repo in any other sense. ☠️ **Neither is _attribution_**, which is a refused capability with a precise boundary — see § 3.1, and read it before reaching for a channel field.

---

## 0. What this spec is, and how to read it

- **A decided spec, not a proposal.** Ten owner rulings were taken while charting the map (its body, _Owner rulings at charting_) and eight tickets ruled the rest: [#2304](https://github.com/Selftend/selftend/issues/2304) the visitor layer, [#2305](https://github.com/Selftend/selftend/issues/2305) the tagging scheme, [#2306](https://github.com/Selftend/selftend/issues/2306) the schema change, [#2307](https://github.com/Selftend/selftend/issues/2307) the reopening trigger, [#2316](https://github.com/Selftend/selftend/issues/2316) the beacon, plus [#2309](https://github.com/Selftend/selftend/issues/2309) research, and [#2302](https://github.com/Selftend/selftend/issues/2302) and [#2303](https://github.com/Selftend/selftend/issues/2303) measuring the ground.
- **Where this file and a resolution comment disagree, the comment wins and this file has a defect** — with one exception: Appendix A lists the premises the map falsified, and there the appendix wins.
- **Research findings live on throwaway `research/*` branches that are never merged**; the branch name is the citation.
- ☠️ **Two rulings in this document outrank the rest, because they are guardrails rather than plan decisions.** § 3.2's refusal of a source value on an account row rests on product principles #7 and #10, which `docs/marketing-plan.md` cannot repeal. § 3.3's refusal of a tracking SDK rests on the shipped privacy promise. Neither is reopened by any trigger in § 7.

---

## 1. The two layers

|             | Definition                                                                                                                 | Status                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Visitor** | A page load on `selftend.org` by someone with no account. Counted at the edge, never in the database, never with a script. | ☠️ **Has never existed, and none is built** (§ 2.3).      |
| **Arrival** | An account coming into existence. The number `docs/marketing-plan.md` § 3 answers to, at about five a week to 2027-08-31.  | Partly computable today; fully computable once § 4 ships. |

**A visitor who creates an account becomes an arrival, and nothing joins the two records.** That join is the refused capability (§ 3.1), not a gap waiting on work.

⚠️ **Neither layer counts people.** A native reinstall mints a new guest account (`CONTEXT.md` § _orphaned guest account_), so an arrival count overcounts people by an unknown factor, and no column can fix it ([#2306](https://github.com/Selftend/selftend/issues/2306)). Any number quoted from this spec is a count of accounts or of page loads, and says so.

---

## 2. The instruments, and which number comes from which

### 2.1 Arrivals — Supabase, and only Supabase

**How many** is answered by the database, free, today, and exactly. `docs/analytics.md` Phase 1 reports stand unchanged; this spec adds no query language and no new report.

☠️ **The split is not computable until § 4 ships.** `docs/marketing-plan.md` § 3 defines arrivals as _registered signups plus web-CTA guests, excluding native cold-start guests_, and **no column anywhere in the schema distinguishes a web guest from a native one** — `user_preferences` carries ~100 columns and not one is a source, referrer, channel or platform; the only `platform` column is `device_push_tokens.platform`, constrained to `('ios','android')`, written at push registration and unrelated to signup ([#2301](https://github.com/Selftend/selftend/issues/2301) charting facts).

⚠️ **The baseline broke on 2026-09-02** when anonymous sign-in went live, so pre- and post-toggle signup numbers are not comparable and on native `signup` now means approximately _install_ ([#1674](https://github.com/Selftend/selftend/issues/1674)). A fresh post-toggle baseline is a prerequisite to the first campaign and cannot usefully be taken before mid-October 2026.

### 2.2 Where from — the store consoles, never the database

**Play Console and App Store Connect answer "where from" for native, in aggregate, with no SDK and no in-app collection** ([#2303](https://github.com/Selftend/selftend/issues/2303)). Their source dimensions are read by a human on the cadence in § 6.

☠️☠️ **The constraint is the absence of tagging, not suppression.** ASC's source columns reconcile exactly and a `-` means zero, not hidden. **Untagged links are about 65% of Play and 80% of iOS acquisitions** — so most of what these consoles could say is unsaid because nothing was ever labelled, which is what § 5 fixes.

⚠️ **Three console traps, each of which has already produced a wrong reading:**

- **The ASC Sources page defaults to a daily-average metric that renders every row `-`** and looks like total suppression.
- **Play's store-listing "All time" is only about eight weeks**, so tags decay out of the console and a read taken late is not a read of the campaign.
- **Three mutually inconsistent Play conversion rates can sit on screen at once.** Never quote one without naming its surface and its window.
- ⚠️ UTM and campaign dimensions live on the **store-listing report**, not on Statistics, which offers none despite reaching back five years.

### 2.3 Visitors — ☠️☠️ measured, and declined

**No visitor layer is built, and that is a measured result rather than an omission** ([#2304](https://github.com/Selftend/selftend/issues/2304)). The instrument question turned out to be the wrong question: every candidate works and none can see anything.

- **The signal is about 1% of the number.** Zone-wide traffic runs ~1,890 page views a day against ~20–70 production named-browser HTML requests a day, for a product taking about one signup a week and a plan that must detect about five arrivals a week.
- ☠️ **Variance, not volume, is what kills it.** One day read **563** production Chrome page views against 9–55 on its neighbours — a 60× excursion larger than any channel effect being sought.
- ☠️☠️ **On Cloudflare's Free plan you can filter bots or staging, never both.** `ipClassMap` exists only on the year-long `httpRequests1dGroups`, whose sole dimension is `date`; `clientRequestHTTPHost` exists only on the 8-day adaptive dataset, which has no `ipClass` and `authz`-refuses `botScore`. **Pro fixes neither** — `1dGroups` is `date`-only on every plan and `botScore` is a Bot-Management tier — so $20/month buys referrer host on a number that is ~95% machine. Refused on measurement grounds, not budget.
- **The decisive argument is the marketing plan's own**: § 3 already says a channel producing five a week is unmistakable in the arrivals aggregate, which Supabase answers exactly and free. A layer with a 100× noise floor can only add false precision.

✅ **What is nevertheless true and free today**, if the trigger in § 7.2 ever fires: `httpRequests1dGroups` returns requests, page views and uniques back to 2026-07-18 over a roughly one-year window, script-free, with **no API token** — the dashboard session authenticates GraphQL at `/api/v4/graphql` ([#2302](https://github.com/Selftend/selftend/issues/2302)).

☠️ **Staging dominates the zone** — 1,403 against 808 requests in 24h — and its path pattern is the project's own e2e suite. Until [#2319](https://github.com/Selftend/selftend/issues/2319) moves staging off `selftend.org`, no zone number refers to production.

### 2.4 Demand — Search Console, and Ahrefs only until 2026-10-10

☠️ **Search Console impressions and clicks are a standing-surface reading, never an arrival** ([#2289](https://github.com/Selftend/selftend/issues/2289)). They measure Google's side — was a page shown, was it clicked — not who arrived, so they are never added to or subtracted from a window's number and never judge a worked channel's window.

**Ahrefs was cancelled on 2026-09-11** ([#2308](https://github.com/Selftend/selftend/issues/2308)); Starter access runs to 2026-10-10, after which the workspace is free Ahrefs Webmaster Tools. ⚠️ **Site Audit survives only because `selftend.org` is a verified project** — competitor reads are on unverified sites and stop. See `docs/costs.md` § _Search instrument: Ahrefs_.

---

## 3. What stays refused, and the reasoning for each

### 3.1 Attribution — ☠️☠️ and "attribution" names three different things

`docs/marketing-plan.md` § 3 refuses attribution. [#2307](https://github.com/Selftend/selftend/issues/2307) found the word covers three separable things, and the refusal does not reach all three:

|                                 | What it is                                                                                                                                                                        | Status                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **The sender**                  | A referrer read from the person's browser, or a third party observing them. A fact about the person's session, obtained from outside.                                             | **Refused**, permanently.                      |
| **The surface label**           | `?s=r-bulgaria` — a fact about **Selftend's own artifact**: which copy of a link Selftend minted and placed was used. Nothing about the person is observed; they merely carry it. | **Not refused** — this is § 5.                 |
| **The label on an account row** | The surface label written against a person's account, which converts it into an inference about where that person had been.                                                       | ☠️ **Refused on principle. This is the line.** |

### 3.2 A source or channel field on an account record

**Refused, and the ground is a guardrail rather than a price.** [#2305](https://github.com/Selftend/selftend/issues/2305)'s naming rule is _name the surface, not the platform_, so the source vocabulary is surface-shaped — and surfaces in this domain can be condition-shaped. **A health product holding `r-anxiety` in a column on someone's account row is an inferred-mental-state field.** `docs/marketing-plan.md` § 6 already refuses targeting by inferred mental state _"on every platform, even where permitted"_, on product principles #7 and #10.

☠️☠️ **Never cite "a pixel costs a privacy-policy amendment plus a forced re-consent" as the reason the web is unattributed.** That is a **priced** refusal, and [#2305](https://github.com/Selftend/selftend/issues/2305) demonstrated that a priced refusal yields to any mechanism cheap enough — a first-party query parameter is cheap enough, and the price argument would have lost. The price is still correct **about pixels** (§ 3.3); it is not what holds this line.

### 3.3 Conversion pixels, tracking SDKs, attribution SDKs, and the Play Install Referrer API

**Refused at their price, which is unchanged and real.** The shipped privacy policy promises none of these in **nine** places, and `src/features/policies/policy-content.test.ts` pins that text to `policyVersion` as one tuple. ☠️ **There is no free window**: `policyVersion` is `2026-09-04-teen-floor` and v0.18.0 ships it, so any such addition re-gates every existing user today.

☠️ **The Install Referrer API is refused on both grounds now.** It exists precisely to deliver `utm_source` back _into the installed app_, where it would land on a row — so § 3.2 refuses it independently of price, and it cannot be reopened by finding a cheaper implementation.

### 3.4 Client-side analytics scripts and beacons on the website

**Refused**, including Cloudflare Web Analytics, which has no script-free mode. Already out of scope in `docs/indexability.md`; restated here because this is where someone would reach for it. See § 9 for what happened when it was switched on.

### 3.5 A Worker on the critical path

**Refused.** A `run_worker_first` Worker writing to Analytics Engine forfeits free static-asset requests and puts code on the critical path of a deploy `docs/indexability.md` deliberately kept script-free — a permanent architectural liability in exchange for data rentable at $20 a month (map ruling 6).

### 3.6 ☠️ Reading edge data is **not** a new disclosure — in a form a reader can check

Map ruling 7, confirmed by [#2309](https://github.com/Selftend/selftend/issues/2309) against primary sources in eleven jurisdictions. ⚠️ **Both grounds originally given for it were unsound and have been replaced. Do not cite "no script on the page" or "no per-visitor identifier."**

- **"No script" is not the Article 5(3) test.** EDPB Guidelines 2/2023 ¶¶54–55 apply Article 5(3) to IP-only techniques with no script at all, and the adopted v2.0 **deleted** the draft's "actively takes steps" qualifier. Anyone quoting that qualifier is citing a superseded text.
- **"No per-visitor identifier" is true only downstream.** Cloudflare states: _"Once Cloudflare identifies a unique IP address for a request, we identify such request as a visit."_ The identifier exists; it is consumed inside the processor.

**The five grounds that actually hold:**

1. Nothing sent to the terminal changes — the bytes on the wire are identical before and after.
2. ☠️ **ePrivacy governs the access, not the subsequent use, and the access is unchanged.** ICO, verbatim: Regulation 6 _"does not apply to, or contain any specific rule about, subsequent processing operations involving this information."_ This is the finding that resolves the hinge, so the "is receiving an IP an access?" argument never has to be won.
3. Statistical further processing is treated as compatible — GDPR Recital 50, Art. 5(1)(b).
4. No new recipient, processor, transfer or retention.
5. What reaches the controller is anonymous information — Recital 26. ⚠️ _Planet49_ ¶¶68–70 mean this helps under the GDPR only, never under ePrivacy.

✅ **The repo already owns the disclosure test and this passes it.** `policy-content.test.ts`: _"nothing DISCLOSED changed: not the data collected, not a processor, not retention, not a user right, not eligibility, not liability."_ And `policies.json:77` already discloses _"standard edge server logs (IP address in access logs)"_.

> ### ☠️ The line, restated
>
> **It is crossed when a byte sent to the terminal changes, or when a per-visitor identifier reaches Selftend.**

⚠️ **The element that would cross it is the IP-derived deduplication that turns requests into "unique visitors"** — every adverse source converges there. Hence § 8's rule that `uniques` is never quoted.

⚠️ **Bulgaria, the establishment jurisdiction, is at the permissive end on both limbs** (чл. 4а ЗЕТ — information plus opt-out). ☠️ But there is no single European answer; France expressly excludes acquisition-channel measurement from its exemption, and Italy's Art. 122(2-bis) has no storage predicate at all. **Nothing here is legal advice and none of it was reviewed by a lawyer.**

---

## 4. The schema change — `account_origin`

One new column makes § 2.1's split computable ([#2306](https://github.com/Selftend/selftend/issues/2306)). **Built** in [#2323](https://github.com/Selftend/selftend/issues/2323) — `supabase/migrations/20260914000000_account_origin.sql` and `src/features/auth/account-origin.ts`; this section is the spec it was built from and still describes it.

```sql
alter table public.user_preferences
  add column if not exists account_origin text
    check (account_origin in ('native_cold_start', 'web_cta', 'native_signup', 'web_signup'));
```

**One column, not two.** Two orthogonal columns (`origin_platform` + `origin_intent`) would admit `web` + `automatic`, which cannot occur; platform alone was refused by map ruling 8. A single column naming whole doors cannot express an impossible combination.

☠️☠️ **Writing it at the mint is impossible**, and this is the trap the obvious implementation walks into: `signInWithOAuth` and `signInWithIdToken` **cannot carry custom user metadata**, web OAuth loses any in-memory marker across the full-page redirect, and **there is no `auth.users` trigger and no `handle_new_user()`** in this schema. That leaves one door of four dark.

**So it is derived on-device at the earliest gate** — `AgeGate`, which is documented as covering all four ways into the app, including the silent guest:

| Platform | Guest? | Value               |
| -------- | ------ | ------------------- |
| web      | yes    | `web_cta`           |
| web      | no     | `web_signup`        |
| native   | yes    | `native_cold_start` |
| native   | no     | `native_signup`     |

Guest-ness is read with `isGuestAccount(user)` — **the absence of an email, never `is_anonymous`**, which lies for one window after conversion.

☠️ **The derivation is only sound at the first gate after the mint.** A converted guest reads as native + registered, which the rule would label `native_signup` when it was really a `native_cold_start` that later converted. Today that cannot bite, but **any gate added later would silently mislabel every converted guest**. Three mitigations, all required: write only when the column is null; write it at the earliest gate; and carry a `comment on column` saying why the order matters.

**`null` means unknown — minted before the column existed — never "refused" and never "other".** ☠️ The roughly 46 existing accounts stay null forever; any number spanning both eras **shows the unknown bucket rather than folding it in**.

⚠️ Exported via `export_user_data()`; the migration must copy the newest declaration wholesale into a fresh `create or replace`, because redeclarations are last-writer-wins.

---

## 5. The campaign-link tagging scheme

**Adopted for both stores** ([#2305](https://github.com/Selftend/selftend/issues/2305)). It is a **source** scheme, not a campaign one: Play exposes `utm_source` and `utm_campaign` as two separate dimensions, so a source with no campaign names where a link sat without asserting a campaign.

- **One vocabulary**, lowercase-hyphenated, **naming the surface not the platform** — `r-selftend` ≠ `r-bulgaria`, because the release machine posts to the project's own subreddit and a flat `reddit` would merge existing users into the acquisition number. ≤30 characters, so one string serves Play's `utm_source` and Apple's `ct`.
- **`utm_campaign` is minted only for a worked-queue window**, named `<source>-<start-month>`.
- ⚠️ **`utm_medium` is deliberately omitted** — Play has no medium dimension and Apple no slot. Recorded so nobody "fixes" it later.
- **On Apple, `ct` = the campaign when one exists, else the source.** ⚠️ This works only because campaign names are self-identifying, so the naming rule and the Apple format are coupled.

☠️☠️ **Play's UTM parameters ride URL-encoded inside `referrer=`, not as top-level query params.** A hand-written `?utm_source=…` on a Play link registers **nothing**, silently.

☠️☠️ **The in-app update offer is never tagged.** `appEnv.playStoreUrl` / `appStoreUrl` feed four consumers, and `use-update-availability` opens the store _from inside the installed app_ — a tag on those constants would inject every updating user into the very dimension the scheme exists to read. **Bare constants stay bare**; a separate tagged constant serves the three web-facing surfaces.

☠️ **Why in-URL tagging is the only mechanism that can work:** every web store link opens through `openExternalUrl` with `noopener,noreferrer`, so the site's own posture already destroyed the referrer signal.

⚠️ **Tagging does not convert a standing surface into a pursued one**, and the control is written down: **a tagged standing surface's number is read, never used to keep or cut it.**

### The minted vocabulary

Built on [#2324](https://github.com/Selftend/selftend/issues/2324). The source names live in `src/lib/store-links.ts` as `STORE_LINK_SOURCES`, which is the canonical list; this table is the reader's copy.

| Source             | Surface                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| `web-download-bar` | The Android-browser download bar on the public web app                     |
| `web-get-the-app`  | The "Get the app" section (user menu popover, and anywhere else it mounts) |
| `app-support`      | The Support screen's two store rows                                        |

⚠️ **`app-support` names itself rather than a marketing surface on purpose.** It fires for someone _already using the web app_, so a marketing-style name would let existing users read as fresh acquisitions. Named this way the number stays legible — "existing web users who installed native" — instead of polluting the channel vocabulary (owner ruling, 2026-09-11).

⚠️ **The bare constants necessarily carry a query parameter, and that is not a tag.** `appEnv.playStoreUrl` is `…/details?id=<package>`; the package id is what makes it a link at all. What must never appear on the bare constants is a **tagging** parameter — `referrer`, `utm_*`, `ct` — which is what `src/lib/store-links.test.ts` pins.

---

## 6. The reading cadence

☠️ **Store reads run on the window's clock, not a calendar's** (map ruling 9). **No monthly duty is created by this document.**

- **At the close of each worked 8-week window**: the Play store-listing report and the ASC Sources page for that window, with § 2.2's three traps in hand.
- **One fold-in at the 2026-12-10 sitting**, which is `docs/marketing-plan.md` § 7's existing date — a fold-in, never a second clock.
- **At the same sitting**: re-read the two triggers in § 7, and re-read the Cloudflare zone's Web Analytics state per § 9.

---

## 7. Triggers — the deferred items, each with its condition

☠️ **Both triggers have the same shape: a level limb and a variance limb, both required.** That is not a coincidence — it is [#2304](https://github.com/Selftend/selftend/issues/2304)'s 563-page-view day applied twice. **A bare "when traffic exceeds N" trigger would have fired on that day and been wrong.**

### 7.1 Reopening the attribution refusal

⚠️ **`docs/marketing-plan.md` § 3's original trigger sentence was incoherent and has been replaced.** It said volume growth would let parallel running be revisited. **Volume can never do that** — two channels run at once are **confounded**, not noisy, and more arrivals do not disentangle them; only an identifier does. And the arithmetic runs the opposite way: with weekly-count noise on the Poisson floor, a channel adding five a week is **5.0σ at λ=1, 2.2σ at λ=5, 2.0σ at λ=6.25 and 1.0σ at λ=25**. Growth **degrades** serial measurement.

> **Reopen when both hold, measured on the § 2.1 arrivals series with the `null` bucket shown separately:**
>
> 1. the **trailing 8-week mean is ≥ 6 arrivals a week**; and
> 2. over the **trailing 26 weeks**, the largest single-week absolute deviation from that mean is **≥ 5**.

Neither number is invented: the **5** is § 3's own detection target, and the **6** is the last integer baseline at which a +5 week is still a 2σ move.

☠️☠️ **It fires if and only if the plan is succeeding.** The warrant needs 5.5 to 21.5 arrivals a week, so the trigger straddles its own success condition — decisive at the pessimistic W4 rate, possibly never firing cleanly at the optimistic one. **Honest as a governance condition, useless as a diagnostic one: its silence is not a finding, and nobody should wait on it to learn whether the plan works.**

**What a reopening may build** — given § 3.2, not a source column:

> A table keyed `(source, window)` carrying a **count**. **No `user_id`, no per-arrival timestamp, no wall-clock column at all.**

☠️☠️ **"No `user_id`" is not "unlinkable" — `created_at` re-joins it.** A row written seconds after an account is created is trivially correlated back to it. That is why the cell is keyed by **window, not week**: at about one arrival a week, a weekly cell names the person. ☠️ An `updated_at` reinstates the leak for the most recent arrival. ⚠️ The write is client-side and therefore **spoofable**, and whether a tag survives the landing → age-gate transition on a static export is **unverified**.

### 7.2 Reopening the visitor layer

> **Re-read at the 2026-12-10 sitting. Reopen only when both: (i) staging has left the `selftend.org` zone ([#2319](https://github.com/Selftend/selftend/issues/2319)), so the numbers refer to production; and (ii) a month of production named-browser page views shows a baseline whose largest single-day excursion is smaller than the ~5-a-week the plan needs to detect.**

⚠️ **Cloudflare Pro returns only if this fires.** It was refused on measurement grounds, not budget.

---

## 8. Reporting discipline

**Binding even though no visitor layer is built**, because the discipline is what makes a future reading honest rather than what makes this one possible.

- **Requests and page views only.** ☠️ **`uniques` is never quoted** — IP-derived deduplication is the element every adverse source in § 3.6 converges on.
- ☠️☠️ **A visitor figure is never quoted without its host filter and its bot composition.** The same day honestly reads **1,890 or about 40** depending on which is applied, and § 2.3 is why you cannot apply both on the Free plan.
- **A number spanning the `account_origin` era boundary shows the unknown bucket** rather than folding it in (§ 4).
- **A native arrival count names its reinstall overcount** (§ 1).
- **A Play conversion rate is never quoted without its surface and window** (§ 2.2).

---

## 9. The beacon that was armed for eight weeks

**Cloudflare Web Analytics was enabled on the `selftend.org` zone from 2026-07-18 to 2026-09-10**, wildcard rule, mode _"Enable, excluding visitor data in the EU"_ ([#2302](https://github.com/Selftend/selftend/issues/2302)). **Zero page views and zero visits were ever collected.** It is now disabled.

☠️ **The promise was literally false for those eight weeks** ([#2316](https://github.com/Selftend/selftend/issues/2316)). `src/i18n/locales/en/policies.json:46` says _"We do not **use** advertising SDKs, analytics tracking services, behavioral profiling tools, or social media pixels."_ Cloudflare Web Analytics is an analytics tracking service, and it was configured on the property. **"Use" means configured**, and the record says so rather than reasoning its way out.

⚠️ **But nothing about anyone's data changed, so no `policyVersion` bump and no re-gate.** There is nothing for a user to re-consent to, and spending a forced re-consent on an event that collected nothing costs users something real in exchange for nothing.

**Recorded as [ADR-0007](adr/0007-a-vendor-setting-can-break-a-promise-the-repo-makes.md)**, whose lesson is the general one: _a promise made in the app's copy can be broken by a setting in a vendor dashboard that nobody in this repository ever touched_ — so where a promise is load-bearing, ask what would make a violation **inert** rather than absent, and put that in the repository.

☠️☠️ **Whether the beacon ever reached a browser is unknown and now unknowable, and this document does not resolve it in either direction.** On 2026-09-11 an identically-stacked zone on the same account with automatic setup still enabled — `wikicanvas.org` — served HTML containing **zero** beacon references, reproduced with a cache-buster, with none of the documented `no-transform` blocker present. And **the Wayback Machine holds no capture of `selftend.org` at all**. ⚠️ So the earlier reading that _"the CSP was the only real guard, not hypothetically"_ is **not established**: the CSP provably makes execution impossible, but "nothing was collected _because_ the CSP blocked it" has an unruled-out rival — nothing was injected — and both produce the same 0/0. Routed as [control-tower#134](https://github.com/vasilyoshev/control-tower/issues/134).

### What guards it now

☠️☠️ **The guard that actually held is unasserted by any test.** `test/theme-web-surfaces.test.ts` pins the two inline-script hashes and forbids `'unsafe-inline'` — so a CSP reading `script-src 'self' https://static.cloudflareinsights.com 'sha256-…' 'sha256-…'` **passes every existing assertion**.

**The guard is the CSP, hardened to an allowlist** (§ 10 item 5): parse `script-src` out of `public/_headers` and assert its token set is _exactly_ `{'self', <palette hash>, <hydration hash>}`. Any added host, scheme source or `'unsafe-*'` fails CI.

**Why in-repo and not a production monitor:** the CSP is the only guard that is in the repo, deterministic, and effective **regardless of what Cloudflare does** — and ⚠️ **Cloudflare re-enabled Web Analytics by default for free domains once already, on 2025-10-15**. A live-HTML check was **declined as a monitor rather than a test**: it fails on production state unrelated to the commit under review.

☠️☠️ **The audit trap, which silently defeats the zone re-read: disabling flips only `ruleset.enabled`. `auto_install` stays `true` and the wildcard rule remains.** A check that reads `auto_install` reports a disabled zone as armed. **Read `ruleset.enabled`.**

---

## 10. The build, in dependency order

Ready for `/to-tickets`. Items 1–3 are one coherent change; 4 and 5 are independent of it and of each other.

1. **Migration** — add `account_origin` with its `CHECK` and a `comment on column` explaining the gate-order constraint; redeclare `export_user_data()` from the newest declaration with the column in the `preferences` list.
2. **Client write** — derive and write the value at `AgeGate`, guarded on null. ⚠️ **This item predicted a `PREFERENCE_COLUMNS` entry, and that part of it is wrong.** The guard is a conditional `update(...).is("account_origin", null)`, atomic where a read-then-write would race; a patch-map entry would exist only to let `updateUserPreferences` overwrite a value that must never change. The write plumbing the item is really asking for is the third argument to `recordAgeAttestation`.
3. **Tests** — the § 4 derivation table, the converted-guest case, and whatever the export-completeness suite demands.
4. **The tagged store constant** — a separate constant carrying § 5's `utm_source` / `ct`, wired to the three web-facing surfaces only, with a test pinning that `appEnv.playStoreUrl` and `appStoreUrl` stay bare.
5. **Harden the CSP test** (§ 9) to an exact `script-src` token-set allowlist, with a comment naming the beacon incident as the reason.
6. **Documentation** — `CONTEXT.md` § _Accounts_ gains the **account origin** glossary entry; an ADR records the beacon incident and its lesson.

⚠️ **Not a build item: the § 7.1 aggregate.** It is the content of a reopening that has not triggered.

---

## 11. Not in this spec, and where each thing went

- **In-product behaviour measurement** — `docs/analytics.md` Phase 1 reports stand; Phase 3 stays deferred. Map ruling 2.
- **Session replay, heatmaps, user-level behavioural profiling** — excluded by `docs/analytics.md` and product principle #7.
- **Revising the warrant, or the arrivals target of about five a week** — a positioning effort with its own review.
- **Ahrefs' classification as an instrument** — settled by [#2289](https://github.com/Selftend/selftend/issues/2289); only the keep/downgrade call was reopened, and it is done ([#2308](https://github.com/Selftend/selftend/issues/2308)).
- **The zone's security posture** — scanner probes and a 28% 403 rate, surfaced while measuring. Infrastructure, not measurement → [control-tower#133](https://github.com/vasilyoshev/control-tower/issues/133).
- **`wikicanvas.org`'s Web Analytics state** — a different project with different promises → [control-tower#134](https://github.com/vasilyoshev/control-tower/issues/134).
- **Moving staging off the zone** — [#2319](https://github.com/Selftend/selftend/issues/2319), a prerequisite to § 7.2 rather than part of this spec.

**Still open, and deliberately not forced:** whether arrivals are split EN/BG and on what — it depends on `account_origin` and `user_preferences.language`, not on the edge; whether Play's explore-versus-search split is readable without becoming store-keyword pursuit; and whether the reinstall caveat rides on every quoted number or once here.

---

## Appendix A — premises this map falsified

☠️ **Roughly a third of this map's ticket premises were wrong.** Listed because each was believed by whoever wrote the ticket, and a reader retracing the work would otherwise re-derive them.

| Premise, as written                                                      | What was found                                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No beacon was on the zone                                                | ☠️☠️ Web Analytics had been **on for eight weeks**. The "no beacon" reading was taken from an EU PoP and the mode excludes only the EU.                                      |
| A Cloudflare API token is needed for GraphQL                             | ☠️ **No token is ever needed** — the dashboard session authenticates `/api/v4/graphql`.                                                                                      |
| `clientRefererHost` is merely filter-limited on Free                     | ☠️ It is `authz`-refused **as a dimension**. No query, granularity or dataset recovers referrers on Free.                                                                    |
| Cloudflare shows only the top five countries                             | `countryMap` returns **all** countries on Free; "top five" was the dashboard tab.                                                                                            |
| Edge data lags 24 hours                                                  | There is **no delay** — the API returns the current day.                                                                                                                     |
| There is no free script-free bot filter                                  | `ipClassMap` **is** one; it just cannot be combined with a host split.                                                                                                       |
| ASC suppresses source data at low volume                                 | ☠️☠️ **Suppression is not the constraint — the absence of tagging is.** Source columns reconcile exactly; `-` means zero.                                                    |
| Play's store-listing "All time" is all time                              | ☠️ It is about **eight weeks**.                                                                                                                                              |
| Tagging store links needs no in-app code                                 | ⚠️ False and self-blocking — a tagged URL string in `src/lib/env.ts` _is_ in-app code. The test is **collection and disclosure**, never whether a file under `src/` changed. |
| Play UTM params ride as top-level query params                           | ☠️☠️ They ride URL-encoded **inside `referrer=`**; `?utm_source=` registers nothing.                                                                                         |
| The marketing plan counts five standing surfaces                         | It counts **four**.                                                                                                                                                          |
| Apple's 4 Web Referrer impressions are `selftend.org` traffic            | ⚠️ Wrong — the site strips its own referrers with `noopener,noreferrer`.                                                                                                     |
| Ruling 7 holds because no script runs and no identifier reaches Selftend | ☠️☠️ **Both grounds are unsound.** See § 3.6 for the five that hold.                                                                                                         |
| The remaining attribution gap is the web-to-account join                 | ☠️ The join is **refused**, not missing. The web is the whole hole, not its last mile.                                                                                       |
| Volume growth would permit parallel channel running                      | ☠️☠️ **Incoherent** — channels run together are confounded, not noisy, and growth _degrades_ serial measurement.                                                             |
| Reopening costs a policy amendment and a re-consent                      | ⚠️ That is the **pixel's** price, not the price of the only thing a reopening may build.                                                                                     |
| For non-EU visitors the beacon's bytes did change                        | ☠️☠️ Never observed, and **now unobservable**. An identically-stacked zone with auto-setup on serves no beacon at all.                                                       |
| `wikicanvas.org` is collecting, so disable it                            | ⚠️ Its HTML carries **no beacon**. The real question is whether the figure was misread or injection never reaches this stack.                                                |
