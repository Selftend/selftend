# Teen-access §5 review

The owner legal review that [spec #227](https://github.com/Selftend/selftend/issues/227)
§5 requires over the published teen-floor text. Run for
[#1771](https://github.com/Selftend/selftend/issues/1771); the remedy rules it
applies were settled on
[#2684](https://github.com/Selftend/selftend/issues/2684), and this document is
the artifact [#2708](https://github.com/Selftend/selftend/issues/2708) commissioned.

**Reviewed: 2026-09-24. Outcome: no Tier-1 findings.**

Two Tier-3 wording candidates are recorded in § _Findings_ and ride the next
release under #2684's tiering. Nothing here invalidates consent already given,
so no re-gate is owed.

> [!IMPORTANT]
> **This review ran after the text was published, not before it.** Spec #227 §5
> set the order as _review → publish_; the teen-floor text went live in v0.18.0
> on 2026-09-09 under `policyVersion` `2026-09-04-teen-floor`. The ordering slip
> is recorded separately, and deliberately, in
> [dpia-minors-assessment.md](dpia-minors-assessment.md) § _Ordering_ — Art. 5(2)
> accountability is about showing what happened and when, including when the
> process did not run as designed.

## Method, and what that means for how much to trust it

The review was run in two halves, and they carry different weight.

**The mechanical half** checked every factual claim in the published text against
the code and schema that implement it — file and line named for each, so a
reader can re-run the check rather than trust it. Where a claim is already
pinned by a test, the test is cited instead of a reading, because a test holds
and a reading goes stale.

**The judgement half** — whether wording constitutes valid explicit consent,
whether the exit copy is neutral, whether the statute rows are legally right —
is the owner's, and is marked as such wherever it appears. ☠️ **The two are not
interchangeable**, and this document does not present a judgement as a
verification.

## Findings

Tiers are #2684's: **1** = consent invalidated, re-collecting _is_ the remedy;
**2** = accurate but incomplete, rides the next release; **3** = wording, rides
anything.

### Tier 1 — none

#2684 defines three testable Tier-1 classes. Each was checked.

#### A wrong country row — not possible without CI going red

`src/features/policies/policy-age-floor.test.ts` compares the **published**
floor table in `policies.json` against the **applied** table `FLOOR_BY_COUNTRY`
in `src/features/auth/age-floor.ts`, in both `en` and `bg`, in both directions:
every country the code places on a floor must appear on that floor's line, no
country may appear on another floor's line, and no country may be named that the
code does not place there. **28 assertions, passing.**

That is the failure mode `age-floor.ts` was written to prevent, in its own
words: _"a published list that is retyped by hand drifts from the one the gate
applies — silently, and in the direction that admits someone the floor was meant
to hold back."_ It cannot drift unobserved.

⚠️ The test proves the published list **matches** the applied one. It does not
prove either is **legally correct** — see § _What this review does not cover_.

#### "We never store your date of birth" — true, and structurally so

The claim appears in privacy § 1 and § 2 and on the age-gate screen itself
(_"Your date of birth is checked and then discarded - it is never stored."_).

`src/features/auth/age-attestation.ts` makes it a property of the type rather
than a promise about behaviour: `AttestationOutcome` is a union of
`incomplete`, `invalid-date`, `pass` (carrying `country` only) and
`under-floor`. **No variant has a field a date of birth could travel in**, so a
caller cannot persist, log or report what it was never handed.

Confirmed at the only write site, `recordAgeAttestation` in
`src/features/settings/repository.ts`: `age_floor_met`,
`age_attested_country`, `age_attested_at`. Three fields, matching the published
_"whether you met the age, the country you chose, and the date we asked"_
exactly.

#### Art. 9(2)(a) explicit consent — the mechanics hold

Privacy § 5 claims the consent is _"a separate, affirmative act — a step of its
own, worded on its own… never bundled into accepting these policies, and never
inferred from your continued use."_ Checked against
`src/components/app/consent-gate.tsx`:

| Claim                            | Implementation                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate from policy acceptance  | Two strings under their own heading: `consent.checkbox` for the policies, `consent.healthDataCheckbox` under _"Consent to processing your entries"_ |
| Affirmative — nothing pre-ticked | Both are `useState(false)`                                                                                                                          |
| Unbundled — both required        | The submit button is disabled unless **both** flags are true, never either alone                                                                    |
| Not inferable from continued use | The gate blocks the app, and the both-ticked invariant is restated at the **write** site, not only on the button                                    |

⚠️ **Whether that wording is sufficiently _explicit_ for Art. 9 is a legal
judgement, and it is the owner's.** What is verified here is that the consent is
separate, specific, affirmative and unbundled — the mechanical preconditions,
not the legal conclusion.

### Tier 3 — two wording candidates, riding the next release

#### The withdrawal sentence does not name the in-app route

`consent.healthDataWithdrawal` reads _"You can withdraw it at any time by
deleting your account or contacting {{privacyEmail}}."_

Self-serve deletion **does** exist in the app
(`src/components/app/delete-account-modal.tsx`, Settings → _Delete my account_),
so withdrawal is not gated behind an email. But the sentence does not say so,
and a reader may assume the email is the path. Naming the in-app route would
make the Art. 7(3) position self-evident from the copy rather than only from the
code.

📌 A stricter reading — that withdrawal requiring account deletion is not "as
easy as" ticking a box — was considered and not adopted: the processing **is**
the product, so deletion is the honest consequence rather than a penalty. That
is a judgement, recorded so it is not silently re-made.

#### "Nothing you entered has been kept" and the 24-hour timer

`underFloor.retention` says _"Nothing you entered has been kept."_ Privacy § 12
records that the device stores one further item after an under-floor verdict: a
time 24 hours ahead, holding _"no personal data, no identifier, and no record of
what was answered."_

Read as consistent — the timer is not something the person entered, and it
records nothing about the answer. Recorded because the two sentences sit in
different documents and a reader meeting only one of them could see tension.

### Neutrality of the age gate and exit screen — no objection found

> _"Selftend is not available to you."_ · _"There is a minimum age for using
> Selftend, and it differs from country to country. From what you told us, you
> are below it where you live."_ · _"Nothing you entered has been kept."_ ·
> _"You are welcome back when you reach it."_

No blame, no implication of wrongdoing, and it closes by leaving the door open.
⚠️ Neutrality is a judgement rather than a check; this is the reviewer's read.

## What this review does not cover

Stated so the absences are not mistaken for passes.

- **The legal correctness of each floor.** Whether 14 is right for Bulgaria is
  primary-source work, and it lives in
  [age-floor-statute-checks.md](age-floor-statute-checks.md). The **(C) rows**
  there remain as that document leaves them.
- **The quality of the Bulgarian phrasing.** The `bg` floor table is pinned to
  the code table by the same test as `en`, so it cannot name a wrong country —
  but whether it reads well to a Bulgarian speaker was not assessed.
- **Play Console's own wording.** What the Console says during the audience
  change is captured separately, on
  [#2691](https://github.com/Selftend/selftend/issues/2691).
- **The Play store description.** It still reads _"Selftend is for adults
  (18+)"_, which the app contradicts. That is
  [#2705](https://github.com/Selftend/selftend/issues/2705), not a finding of
  this review — the text reviewed here is the in-app and in-repo policy text.

## When this must be re-read

The same triggers as the DPIA (see
[dpia-minors-assessment.md](dpia-minors-assessment.md) § 8), plus one specific
to this document: **any change to the floor table, the age-gate copy, the
under-floor copy, or the Art. 9 consent wording.** Those four are what was read
here, and a change to any of them makes this pass stale in the part that
matters.
