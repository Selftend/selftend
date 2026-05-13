# Crisis Guidance Strategy

This document records the jurisdiction review of the current `/crisis` page and proposes a launch strategy. Operational handling for emails containing crisis content lives in [operations-runbook.md](operations-runbook.md); the lawful posture for safety copy lives in [policies.md](policies.md).

## Current state

The `/crisis` route is built from `src/features/policies/policy-screen.tsx` driven by:

- Action buttons defined in `src/features/policies/policy-content.ts` (`crisisActionUrls`)
- Section text loaded from the `crisis` namespace of each locale in `src/i18n/locales/{lang}/policies.json`

Two locales: `en` and `bg`. The page is structurally identical in both. It currently surfaces:

| Block                                   | Content                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Title                                   | "Crisis guidance"                                                                                                       |
| Description                             | "This app is not emergency support and is not monitored by crisis responders."                                          |
| Notice banner                           | "Crisis guidance must stay separate from self-help tools. Review jurisdiction-specific resources before public launch." |
| Section 1 — Immediate danger            | Direct people to local emergency services.                                                                              |
| Section 2 — Crisis support              | Lists 988 (US + territories), 9-8-8 (Canada), and a one-line fallback for outside those jurisdictions.                  |
| Section 3 — How this app should be used | Calm reflection framing; do not delay urgent contact.                                                                   |
| Section 4 — Review requirement          | Tells the reader the resources must be reviewed before launch.                                                          |
| Action buttons                          | Open 988 Lifeline → `https://988lifeline.org/get-help/`; Open 9-8-8 Canada → `https://988.ca/get-help/help-right-now`.  |

## Audit findings

1. **The notice banner and section 4 leak internal launch hygiene into user-facing copy.** "Review jurisdiction-specific resources before public launch" is guidance to maintainers, not users. A user landing on `/crisis` should see calm, actionable safety information, not a build-readiness note.
2. **The Bulgarian locale lists US and Canada hotlines.** The bg translation faithfully mirrors the en structure, but a Bulgarian-speaking user calling 988 cannot reach the US Lifeline. Both locales surface the same two action buttons. For bg, that is not just unhelpful — it risks delay in an emergency by directing attention at lines that won't connect.
3. **The fallback for "outside those jurisdictions" has no concrete next step.** The current fallback paragraph asks the reader to "use the emergency number or crisis support service available where you are," with no link to a reviewed registry of international lines. The MVP launch surface is public web + Android closed test; people will reach `/crisis` from outside US and Canada on day one.

## Constraints on what we can promise

- AGENTS.md and product principles forbid emergency-response or therapist-replacement claims. The page must keep saying Selftend is not emergency support.
- We cannot verify every national crisis line ourselves before launch. Adding unreviewed phone numbers is worse than not listing them: a wrong or rotated number is dangerous, not just unhelpful.
- Selftend has no geolocation — we know the user's UI language, nothing else. Locale is a coarse proxy for jurisdiction and will mislead bilingual users.
- The `/crisis` page is reachable without sign-in (it is a public web route), so any change ships immediately on the next web deploy.

## Options considered

**A. Stay narrow (US + Canada only)**: keep the page exactly as is, restrict launch markets, hide non-en locales from the route. Rejected: we cannot prevent web traffic from outside the named markets, and we already ship a bg locale.

**B. Generic-only**: remove every named hotline. Direct everyone to "local emergency services" plus a reviewed international registry. Safest, least useful for the US and Canadian users who already have a working number in front of them.

**C. Hybrid — keep US + CA, add a reviewed international fallback, fix the locale and banner issues** (recommended below).

**D. Locale-aware per-jurisdiction**: research, verify, and ship a curated list per locale. Out of scope for MVP — every line listed should have a verification date and a re-check cadence, which is a meaningful ongoing commitment.

## Recommendation (Option C, hybrid)

1. **Remove the internal banner from user-facing copy.** Replace the `crisis.reviewBanner` with empty/absent, or repurpose to a calmer user-facing line ("This page is not monitored. Use it as a reference, not as a way to reach someone.").
2. **Remove section 4 ("Review requirement") from user-facing copy.** It is an instruction to the team, not the reader. Move the equivalent reminder into this strategy doc.
3. **Add an international fallback link.** Use a reviewed registry — [Find A Helpline](https://findahelpline.com/) (verified by ThroughLine) or [IASP crisis centre directory](https://www.iasp.info/resources/Crisis_Centres/) — as a clickable action on the page so people outside the US and Canada have one verified next step.
4. **Adjust the Bulgarian locale.** Either:
   - Show 112 (EU emergency) and Find A Helpline as the primary actions for the bg locale, dropping the US/CA-specific action buttons; OR
   - Keep the bg locale aligned with en for now (since en is fallback) but make the international action button the most prominent option in both locales.
     The first option is safer for bg users but requires diverging the locale content. The second option keeps a single content shape.
5. **Document the verification cadence.** Whichever lines remain, record the verification date in this file and re-check on each minor release.

The user-facing crisis copy should be calm and short. Concrete, no marketing tone, no urgency tactics.

## Suggested copy (Option C)

If approved, the locale changes are roughly:

```diff
- "pageDescription": "This app is not emergency support and is not monitored by crisis responders."
+ "pageDescription": "This app is not emergency support and is not monitored. If you are in danger, contact local emergency services."

- "reviewBanner": "Crisis guidance must stay separate from self-help tools. Review jurisdiction-specific resources before public launch."
+ (removed)
```

Sections become:

1. Immediate danger — unchanged.
2. Crisis support — same US/Canada lines, plus a new third line: "If you are elsewhere, Find A Helpline (https://findahelpline.com) lists verified crisis services by country."
3. How this app should be used — unchanged.
4. Removed.

Add a third action button: `openFindAHelpline` → `https://findahelpline.com/`.

For the Bulgarian locale specifically, recommend additionally surfacing 112 (the EU/Bulgaria emergency line) inline in section 1 prose so Bulgarian-speaking users see a number that will connect.

## Decision needed

- Approve Option C (or pick another option) so the i18n + `crisisActionUrls` edits can land before launch.
- Decide whether the Bulgarian locale diverges from English on the action buttons or stays aligned.

Once the option is approved, implementation is a small i18n + one-line `crisisActionUrls` patch. Strategy approval closes ROADMAP P2 #5 ("Approve the global crisis-resource strategy"); the locale + button patch closes the implementation step.

## Verification cadence

Whichever lines we keep, re-verify on each minor release:

- 988 Lifeline (`https://988lifeline.org/get-help/`)
- 9-8-8 Canada (`https://988.ca/get-help/help-right-now`)
- Find A Helpline (if added)
- 112 EU emergency reference (if added in bg)

Record the most-recent verification date below.

- 2026-05-13: existing US + CA links resolved at audit time; international fallback not yet added.
