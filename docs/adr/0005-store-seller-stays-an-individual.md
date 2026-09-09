# ADR-0005: The store seller stays an individual, and the listing stays non-clinical

Date: 2026-09-02 · Status: accepted · Origin: #1618 (owner ruling recorded on
#1699, map #1692)

## Context

Selftend is sold on the App Store from an **Individual** Apple Developer
Program enrolment, so the seller shown to users is the maintainer's legal name
(`docs/internal-testing.md`, decision of 2026-07-30). The Google Play side is
likewise a personal developer account.

Apple's App Review Guideline **5.1.1(ix)** reads, as of 2026-09-02:

> Apps that provide services in highly regulated fields (such as banking and
> financial services, healthcare, gambling, legal cannabis use, air travel and
> crypto exchanges) or that require sensitive user information should be
> submitted by a legal entity that provides the services, and not by an
> individual developer.

Selftend sits next to that rule rather than inside it: it is listed under
Health & Fitness, not Medical, makes no diagnosis, treatment or outcome claims,
and states the not-therapy boundary throughout its copy. Four versions (0.9.0,
0.15.0, 0.16.0, 0.17.0) have passed review under the individual seller. But a
review outcome is not precedent — a different reviewer, a new binary, or a
listing that reads more clinical can be rejected on a rule an earlier reviewer
did not apply — so the exposure is a standing risk, and it deserved a deliberate
answer rather than a drift.

The alternative — enrolling an organisation and transferring the app — is a
project of its own. Verified on Apple's enrolment, fee-waiver and app-transfer
pages on 2026-09-02:

- Organisation enrolment needs a real legal entity (no trade name or DBA), a
  D-U-N-S number, a work email and a public website on the entity's own domain,
  and the same annual fee. The nonprofit fee waiver needs official nonprofit
  recognition (an EU charities register counts) and only free apps with no Paid
  Applications Agreement — Selftend already meets the free-apps half.
- An app transfer keeps the bundle ID, ratings and installed users. It needs
  both accounts on the latest agreements, no version in any review state, and
  TestFlight fully cleared. Selftend has no in-app purchases, so the hardest
  precondition is absent. Sign in with Apple's Service ID transfers with the
  app; APNs certificates stay valid until they expire and are then re-issued by
  the new team.

Google Play has no equivalent entity requirement for a wellness app (its Health
apps policy is a declaration, not an account type), and the personal-account
closed-testing gate has already been passed.

## Decision

- **Both store accounts stay the maintainer's personal accounts.** The risk under
  5.1.1(ix) is accepted, knowingly, with this record as the evidence that it was
  a choice.
- **The listing stays wellness-framed and non-clinical as a standing
  constraint**, not a happy accident. Store copy is governed by
  `docs/positioning.md` and mirrored in `store/`; an edit that makes the listing
  read as a healthcare service is a change to this decision, not a copy tweak.
- **No legal entity is formed for this reason alone.** If one is ever formed,
  transferring the app to it is possible and the preconditions above are the
  checklist.

## Alternatives considered

- **Do nothing, silently.** Rejected because an unrecorded risk is the thing
  #1618 was filed to prevent; the accepted risk needs a date and a trigger list.
- **Form an entity now and transfer the app.** Rejected for now: it carries
  legal, tax and reporting obligations that nothing yet requires, and the same
  question is open on the donation path (#1625), where an entity might actually
  be needed. Deciding it there, with a concrete need, is cheaper than deciding it
  here against a "should".

## Consequences

- **This ruling reopens on any of three events, whichever comes first**, and on
  no calendar date:
  1. an App Review or Beta App Review rejection that cites 5.1.1(ix);
  2. the donation-path ruling (#1625) concludes that a legal entity is needed;
  3. a grant or nonprofit-status application that needs a legal person.

  Reopening means a new ADR that supersedes this one, not an edit to it.

- Anyone editing store copy inherits the non-clinical constraint; the
  positioning doc and the store-listing drift checks are where it is enforced.
- The seller-name paragraph in `docs/internal-testing.md` points here so the two
  records cannot drift apart.
