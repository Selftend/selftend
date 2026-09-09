# ADR-0004: Retention by return, not engagement — the practice boundary

Date: 2026-09-02 · Status: accepted · Origin: #1655 (map; owner rulings #1662
and #1659; #1657 and #1663 resolved under the owner's standing in-session
authorization) · Recorded by: #1664

## Context

The warrant to continue Selftend is a retention number — 30 W4-retained users
by 2027-08-31 (#1598) — and _retained_ means **returned at all in the window**,
never duration or frequency. Wanting people to come back is therefore
on-mission; wanting them to come back _more often_ is not. The sharpest
available taxonomy of the mechanics that blur that line is Eyal's _Hooked_
(2014), so the practice-boundary map (#1655) read it in full against the
product's guardrails instead of adopting or dismissing it unread.

Selftend had already ruled on most of the Hook's phases case by case — #28
(every nudge traces to one explicit opt-in), #952 (derived eligibility,
vanish-when-satisfied, fixed order, state-don't-read copy), #711 (show the
record, don't read it; the framework may talk about missing, the product may
not advertise its own restraint), #960 (no derived sentence on Home), ADR-0003
(the update offer is an offer, not a nag), #1598 / `docs/positioning.md`
(growth as an ambition refused) — without naming the model those rulings kept
refusing. A future contributor optimising the warrant in good faith reaches
for exactly the playbook those rulings refuse, which is why the boundary
needed a name and a written form.

## Decision

**Retention by return, not engagement.** Selftend wants people to return and
refuses to engineer the wanting. Per Hook phase:

- **Trigger** — external triggers are opt-in, off by default, and traced to
  one explicit choice each; **nothing on any channel is triggered by
  non-use**. Eyal's own end state — external triggers fading until none are
  needed — is adopted; his facilitator playbook (daily push, badges,
  get-back-on-track email, the breakable calendar chain) is refused.
- **Action** — ability-first is adopted whole: remove steps toward the
  practice, never toward the account.
- **Reward** — the criterion is the inverse of Eyal's "wanting more":
  **fulfilling, and done**. Every completion moment satisfies and ends.
  Variability is banned as a reward category — content variety in fixed,
  user-advanced order is a library, not a schedule.
- **Investment** — stored value is pro-user while it is the user's own:
  user-authored commitments welcome, everything exportable, nothing that
  cannot leave. Loading the next trigger at the investment moment survives
  only in its consented form (the once-ever post-completion reminder offer).

The success condition behind all four: **the skill becomes automatic, never
the app — a user who needs Selftend less is a success.**

### The over-use obligation (#1659)

The obligation a habit-forming reading imposes — what does the product owe
someone using it too much? — is answered without per-user data: **"too much"
is a way of using, not an amount.** The risk is mode (stuck in "why",
re-opening the same hot thought, challenging-as-reassurance, emotion-only
journaling); it rides on the reflective tools and not the somatic or
attention ones; and a computed "enough" is refused doubly — it appraises the
record back at the user (#711/#952), and it measures the wrong variable (a
count-triggered brake fires on healthy heavy use and stays silent through a
two-records-a-day spiral). Delivery is the tools' own shape plus static
framework teaching carrying a one-sentence professional door (#1671);
per-user detection stays refused (#1605 governs the instrument).

## Alternatives considered

- **Full adoption of the facilitator playbook** (Eyal ch. 7 — his own
  best-practice case ships daily push, a red badge, missed-day emails and a
  breakable calendar chain, with a clean conscience). Refused: the warrant
  counts _return_, and every one of those mechanics optimises frequency by
  making non-use itch.
- **The Manipulation Matrix as the contributor rule.** Rejected: it judges
  the maker's intent, never the feature — a facilitator passes it while
  shipping the red badge. Kept only as a personal habit.
- **Prose only, no guard.** Rejected: a fresh audit of a product this
  careful still filed four issues (#1665–#1668); the vocabulary regrows.

## Consequences

- `docs/product-principles.md` §12 **Fulfilling, And Done** is the
  principle; the AGENTS.md review bullet (Retention & product guardrails) is
  the reviewer's handle; `CONTEXT.md` defines **Practice** and **Return**.
- `test/practice-copy.test.ts` holds the machine-checkable floor — seeded
  deliberately short, zero-live patterns only, **no allowlist** (#1606); the
  judgement calls stay with the principle (an enumerating grep finds under a
  third of the boundary-relevant copy — #1658's census).
- The shipped-surface audit and its passes-by-design precedent list live in
  #1658's resolution; the contested-call rulings (the Never-Miss-Twice line,
  the settings disclosure group) in #1662's; the return-path short-list —
  four changes, ranked, measured by the 72h-activation ordering — in
  #1663's.
- What this boundary refuses is refused, not deferred: variable reward,
  non-use-triggered contact, per-user habit analytics, engineered sunk cost.
