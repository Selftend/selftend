# Age Floor

The minimum age for using Selftend, per country.

> [!IMPORTANT]
> **This table is not in force yet.** Selftend's live eligibility rule is still
> 18 and over — in the terms, the privacy policy, the consent checkbox, and the
> Google Play target-audience declaration. The table below is the decided
> destination, being built out ticket by ticket; it governs nobody until the
> policy rewrite ships and the owner completes the rollout pass. Until then,
> [product-principles.md](product-principles.md) is the statement of record.

Source: **[Spec: teen access (13+ per-country age floor)](https://github.com/Selftend/selftend/issues/227) §2**, the settled
destination of wayfinder map [#216](https://github.com/Selftend/selftend/issues/216). This file is the durable copy — the
values were previously reviewable only inside an issue body.

Implemented in `src/features/auth/age-floor.ts`.

## The table

| Floor  | Countries                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **13** | United States, United Kingdom, Belgium, Denmark, Estonia, Finland, Latvia, Malta, Portugal, Sweden, Norway, Iceland — **and every jurisdiction not named below** |
| **14** | Austria, Bulgaria, Cyprus, Italy, Lithuania, Spain                                                                                                               |
| **15** | Czechia, France, Greece, Slovenia                                                                                                                                |
| **16** | Croatia, Germany, Hungary, Ireland, Luxembourg, Netherlands, Poland, Romania, Slovakia, Liechtenstein                                                            |

Never below 13, anywhere.

## Why the floor varies

The floor is set by **GDPR Art. 9(2)(a) explicit consent, not by contract.**

Thought records, mood entries and journal text are special-category health
data. The age that matters is therefore the age at which a person may consent
to _that processing_ on their own behalf — which member states set individually
under Art. 8, between 13 and 16. Where a country sets it higher, Selftend's
floor rises to match.

There is **no parental-consent path and no age verification.** Where the law
would require one, the floor rises instead. That is a deliberate scope
decision: parental-consent infrastructure is a different product with different
risks, and Selftend does not build it.

The Recital 38 counselling carve-out is a fallback defence only. It is never
load-bearing, and no row in the table depends on it.

## Why 13-floor countries are listed individually

Thirteen is also the catch-all, so those rows look redundant. They are not.

An entry means the value was **decided and sourced** for that jurisdiction. The
catch-all means **nobody has looked yet.** The legal review needs to tell those
two apart, and so does anyone extending the table later.

## Open question

The rows flagged **(C)** in the underlying research have not yet been checked
against primary legislative sources — only against secondary summaries. That
verification is [#1763](https://github.com/Selftend/selftend/issues/1763), and it must complete before those rows govern
anyone's access. The research itself lives at
`docs/research/2026-07-24-gdpr-consent-ages.md` on branch
`research/gdpr-consent-ages`.

If a primary source contradicts this table, that is **raised, not silently
applied** — the table is a settled decision of map #216, and revising it is the
owner's call with counsel.

## Behaviour worth knowing

- **Country codes are ISO 3166-1 alpha-2**, read case-insensitively. The United
  Kingdom is `GB`.
- **An unknown or malformed country takes the catch-all**, rather than throwing.
  A gate that crashes on an unrecognised code fails open, which is the one
  outcome worth ruling out.
- **The check fails closed.** An impossible date, a birth in the future, or an
  unusable clock reading all return "does not meet the floor".
- **29 February births qualify on 1 March** in non-leap years — the later of the
  two possible readings, which is the conservative one for a protective floor.
- **The date of birth is compared and dropped.** The module returns a boolean
  and never echoes the date back, which is what lets the caller honour §227 §3's
  "DOB is discarded" without holding anything in reserve.
