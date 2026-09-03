# Age Floor

The minimum age for using Selftend, per country.

> [!IMPORTANT]
> **This table is not in force yet.** Selftend's live eligibility rule is still
> 18 and over — in the terms, the privacy policy, the consent checkbox, and the
> Google Play target-audience declaration. The table below is the decided
> destination, being built out ticket by ticket; it governs nobody until the
> policy rewrite ships and the owner completes the rollout pass. Until then,
> [product-principles.md](product-principles.md) is the statement of record.

> [!WARNING]
> **The gate is built, and the published text has not caught up — so this chain
> must not reach a production release on its own.** Since
> [#1764](https://github.com/Selftend/selftend/issues/1764) the app asks a new
> account for its date of birth and country and applies this table. The terms
> still say 18 and over and the consent checkbox still reads _"I am 18 or
> older"_, so a release cut between here and
> [#1767](https://github.com/Selftend/selftend/issues/1767) would ship a product
> that admits a 14-year-old and then asks them to affirm they are 18. §7's
> order — build, owner review, then release the app and publish the text
> together — is what closes that window, and it is an owner decision, not a
> branch state. Nothing merges to `main` on this chain until #1767 is in it.

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

Not every row is sourced to the same standard. Some were established only from
secondary summaries rather than from the national statute itself, and the
research table marks those rows **`(C)`** — the marker is defined there, not
here, and this file deliberately does not restate which countries carry it,
because that list is the research document's to change.

Checking those rows against primary legislative sources is
[#1763](https://github.com/Selftend/selftend/issues/1763), and it must complete before they govern anyone's access.

The research is not merged: it lives at
`docs/research/2026-07-24-gdpr-consent-ages.md` on branch
`research/gdpr-consent-ages`, so reading it means checking that branch out.

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

## The gate that asks

Built in [#1764](https://github.com/Selftend/selftend/issues/1764):
`src/components/app/age-gate.tsx`, decided by
`src/features/auth/age-attestation.ts`, offered the world by
`src/features/auth/countries.ts`.

**It runs in the shared gate slot in `ProtectedLayout`, above the consent
gate.** That position is a deliberate correction to §3, which predates two of
the app's entry paths. There are now **four** — email/password, Google, Apple,
and the silent guest from `signInAnonymously`, which is the primary one. One
gate in the shared slot covers all four; per-flow plumbing would have missed
guests, and guests write thought records, which are exactly the Art. 9 data the
floor exists to protect. Confirmed by the owner 2026-09-03.

**Who is asked, and who is never asked again:**

- A brand-new account — one that has not been through the consent gate, so
  `policy_version_accepted` is `null`. Guests included.
- **Not** an account that predates the gate. `age_floor_met` is `null` for every
  existing account and `null` means _never asked_, so null alone cannot be the
  trigger: gating on it would ask the entire install base. §7 is explicit that
  existing users meet the one-time consent prompt **without** being re-asked for
  age or country, and the policy-version clause is what delivers that.
- The verdict is read as `=== true`, never as a truthiness check. Three states,
  and `null` is not `false`.

**What the screen does and does not say.** Date of birth is three empty fields —
day, month, year — rather than a calendar, because a picker has to open on some
month and that is a default year §3 rules out. Country is type-to-find over all
250 codes. Nothing before or during the questions names an age, a range, or a
qualifying answer; `age-gate.test.tsx` asserts that against the strings in both
locales, and fires the same predicate on deliberately bad copy so the absence
assertions cannot go quiet.

**A typo is not an exit.** `meetsAgeFloor` collapses "too young" and "that date
is nonsense" into one `false` so that a careless caller still fails closed — but
the gate checks the calendar first and shows a correctable field error, because
the under-floor path deletes an account and a mistyped birthday must never reach
it.

**A failure writes nothing at all** — not even `age_floor_met = false`. Only a
pass is persisted, through `recordAgeAttestation`, which takes a country and a
verdict and has no parameter a date of birth could travel in.

### Two known gaps in the gate as it stands

Both are recorded rather than hidden, and both close on
[#1765](https://github.com/Selftend/selftend/issues/1765) or the release
sequencing:

- **The gate fails open on a preferences error with nothing cached.** In that
  state the attestation is unknown, and the person reaches the shell until a
  fetch succeeds. Failing closed would block every user whose first fetch of a
  cold start failed — nothing in that state tells a new guest from a
  ten-month user. The consent gate makes the identical call for the identical
  reason ([#164](https://github.com/Selftend/selftend/issues/164)), so the age
  gate is no weaker than the legal gate beside it, but the window is real and
  belongs in the legal review's view of §3.
- **The under-floor block is React state only.** Nothing is written for a
  failure, so a reload re-opens the gate and the person may answer again. §3
  wants a hard block; #1765's account deletion and device-local retry flag are
  what deliver it.

### Still owed by [#1765](https://github.com/Selftend/selftend/issues/1765)

`src/components/app/under-floor-screen.tsx` is a deliberate stub: it blocks, and
that is all it does. The `/crisis` and Find A Helpline links, deletion of the
auth user that already exists on three of the four paths, and the device-local
retry flag are #1765's, and until they land an under-floor person is blocked
only for as long as the screen stays mounted.
