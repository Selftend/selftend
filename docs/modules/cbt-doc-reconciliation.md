# CBT Doc Reconciliation — `cbt.md` vs `cbt-gillihan-made-simple.md`

**Status:** Recommendation (drafted) — the `cbt.md` edits recommended below are still
un-applied. The one exception is "Where shipped copy deliberately diverges from the
spec", appended later as a live record of decisions that have shipped.
**Author:** doc-reconciliation follow-up
**Date:** 2026-07-11 (divergence record appended 2026-08-21)

## TL;DR

`docs/modules/cbt.md` is **not** stale and should **not** be deleted or overwritten with
the Gillihan spec. Contrary to the "MVP placeholder only" label carried in project
memory, its contents are an **accurate as-built description** of the shipped CBT module —
in several places it matches the code _better_ than the canonical spec does.

**Recommendation: (c) keep `cbt.md`, reframe it as the as-built reference, and add a
pointer header** that names `cbt-gillihan-made-simple.md` as the canonical design spec and
records the known code-vs-spec deltas. Exact edit below (owner-gated — I did not touch
`cbt.md`).

---

## What each artifact actually is

| Artifact                                   | Real role                                                                                          | Evidence                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/modules/cbt.md`                      | As-built snapshot of the shipped module (routes, data shape, thought-record flow, reminder fields) | Matches `src/features/cbt/*` and `app/(app)/modules/cbt/*` closely (details below)                 |
| `docs/modules/cbt-gillihan-made-simple.md` | Canonical design/target spec derived from the Gillihan book — the 10-strategy north star           | Self-labeled "Canonical spec for the real CBT feature"; describes intended model, not current code |

These are **two different document types** (as-built reference vs design spec), not two
drafts of the same doc. Reconciling them means clarifying roles, not merging them.

---

## Gap analysis: placeholder vs real-spec vs implemented

### Where `cbt.md` matches the code (and the spec does not)

The thought-record flow is the clearest case. The **code implements the 8-step flow that
`cbt.md` documents**, not the Gillihan 5-step model:

- `src/features/cbt/types.ts` — `ThoughtRecord` has `nats: NegativeAutomaticThought[]`
  (each with `beliefRating` and `isHotThought`), and `evidenceFor: string[]` /
  `evidenceAgainst: string[]` as **arrays**.
- `src/features/cbt/schemas.ts` — `thoughtRecordFormSchema` confirms `nats` (with
  `beliefRating` 0–100 + `isHotThought`) and array-typed evidence fields.
- `cbt.md` §"Thought record flow" documents exactly this: per-thought belief rating,
  hot-thought marking, evidence for/against (eight wizard steps at the time of this
  analysis; one six-part column since #1381 - the fields are unchanged).
- `cbt-gillihan-made-simple.md` §Strategy 3 specifies a **5-step** record, a single
  `automaticThought` string (no NATs, no belief rating, no hot thought), and
  `evidenceFor` / `evidenceAgainst` as **strings**.

So on the module's core tool, the "placeholder" is correct and the "canonical" spec is
aspirational/divergent.

Other `cbt.md` claims that check out against code:

- **Strategy surface** — `strategies.ts` defines 11 strategy keys (goals, activities,
  thoughts, values, beliefs, exposure, worry, mindfulness, tasks, anger, selfCare);
  `cbt-home-screen.tsx` renders strategy pillars + recovery/weekly-review. Matches the
  `cbt.md` "Current CBT implementation" bullet list.

  There are **two intentional strategy vocabularies**, not one list that has drifted:

  - **Pillar/home vocabulary** — `PILLAR_STRATEGIES` (`cbt-home/cbt-home-config.ts`),
    11 keys across think/act/be, described by `pillars.strategyDescriptions` (13 entries
    = the same 11 plus `weeklyReview` and `recovery`, which are `REVIEW_LINKS`, not
    pillar strategies). Includes `distortions`.
  - **Recovery vocabulary** — `strategyKeys` (`strategies.ts`), 11 keys, driving which
    integration-note fields a recovery plan offers (`recovery/active-strategies.ts`).
    Includes `mindfulness`.

  They overlap in 10 keys and differ by exactly one each way. `distortions` stays out of
  the recovery list because `/modules/cbt/learn` is a reference guide, not a practice, and
  a recovery plan asks which practices you will keep using — it has no
  `dashboard.strategies.*` label at all, only `home.distortionGuide` ("Thinking
  patterns"). `mindfulness` stays out of the pillar list because the relocation ruled by
  #1198 stands: shared tools are not CBT strategies. `src/features/cbt/strategies.test.ts`
  gates that delta, and also gates the two label maps, which are read with dynamic keys
  and so are invisible to `test/i18n-key-coverage.test.ts`.

  The recovery `mindfulness` label reads **"Calming practice"**, not "Mindfulness": the
  key is fed by `listMindfulnessSessions`, and `mindfulness_sessions` is the shared table
  that breathing, grounding **and** meditation all write to, so one round of box breathing
  used to produce a recovery field labelled "Mindfulness". The key id is deliberately
  unchanged — it is persisted as a key of `recovery_plans.strategyIntegrationNotes`, and
  renaming it would orphan every note already stored under it (#1507). Because the key id
  still reads `mindfulness`, `strategies.test.ts` holds the label to that decision: it
  fails if either locale's label claims mindfulness again.

- **Dashboard** — `cbt-home-screen.tsx` uses `useCbtInsights`, `personalSlogan`
  (from `recoveryPlan`), and read-only insight cards. Matches `cbt.md`'s "dashboard with
  quick actions, strategy links, recovery slogan, and read-only insights".
- **Routes** — `app/(app)/modules/cbt/*` contains index, learn, new, history/[id],
  goals, activities, values, weekly-review, beliefs, exposure, worry, tasks, anger,
  self-care, recovery, and the `[id]` redirect — the exact set `cbt.md` lists.
- **Mindfulness relocation** — `program-definition.ts` routes calming tasks to
  `/tools/meditation`; matches `cbt.md`'s note that mindfulness moved to the shared
  meditation tool.

### Where the spec is ahead of the code (intended, not yet built)

These are genuine forward-looking items in `cbt-gillihan-made-simple.md` with no 1:1 code
equivalent yet — they belong in the spec, not in the as-built doc:

- 5-step thought record + evidence-as-string model (code uses the richer 8-step/NATs
  model instead — a deliberate divergence, see below).
- `MoodLog { moodScore 1-10, emotions[], linkedStrategy }` — the shipped mood tool uses a
  CBT-column shape (`situation`, `thoughts`, `behaviours`, `bodilySensations`; see
  `program-definition.ts` `DAILY_NOTICING`), routed at `/tools/check-in`.
- Onboarding assessment / concern→strategy mapping (§10), strategy recommendation,
  distortion pre-selection, auto pattern-detection after 3+ records. `cbt.md` explicitly
  notes the concern/strategy personalization scaffolding is retained but **not surfaced**.
- Program milestone/timeline model. Code has a 5-week `CBT_PROGRAM` scaffold
  (`program-definition.ts`: assessment → formulation → thinking → behavioural →
  resilience) that does **not** match the spec's Week 1 / 2-4 / 4-8 / 8-12 table.

### Where shipped copy deliberately diverges from the spec

Unlike the rest of this document, this section is a **record of shipped decisions**, not a
recommendation. These wordings do not match `cbt-gillihan-made-simple.md` **on purpose**;
they are listed here so a later reader does not mistake either for drift and revert it.
Recorded 2026-08-21.

- **`Be`'s pillar kicker reads "Wellbeing", not "Mindfulness".** The spec's pillar table
  (`cbt-gillihan-made-simple.md` line 19) labels the pillar `Be | Mindfulness`; the
  shipped string (`pillars.be.sub` in `src/i18n/locales/*/cbt.json`) says "Wellbeing".
  The kicker was narrower than the pillar's own contents — all six of `Be`'s reachable
  routes tend a baseline state and only some concern present-moment attention, so a sleep
  log and a self-care check covering movement, meals and connection sat under a heading
  called "Mindfulness". "Wellbeing" also keeps the parallel with `Think`'s "Cognitive"
  and `Act`'s "Behavioral".
  **The counter-evidence, recorded so a later reader does not have to rediscover it:**
  §10's concern-to-approach table (line 902) _does_ carry per-pillar strategy columns for
  `Think`, `Act` and `Be`, and every cell of its `Be` column is mindfulness, breathing or
  acceptance — its only sleep mention sits in an **`Act`** cell. So the spec
  does lean on a narrow reading of `Be`. What it never does is assign one of its **ten
  numbered Strategies** to a pillar: §10 prescribes per-concern _approaches_ for the
  onboarding assessment, not a taxonomy of which module belongs to which pillar, and
  Self-care (Strategy 9) is placed in `Be` neither there nor anywhere else. The
  strategy-to-pillar mapping is therefore ours, and the kicker's job is to describe the
  pillar **as we have populated it** — six routes, one of them a sleep log — rather than
  as §10 would have populated it. Self-care's placement is unchanged by this decision;
  nothing moved between pillars.
- **`Be`'s description drops the phrase "without judgment".** The spec uses
  "Present-moment awareness without judgment" both in the pillar table (line 19) and in
  Strategy 5 (line 254); `pillars.be.description` no longer does. It was rewritten to
  describe the pillar rather than list the tools it leans on — it was the only pillar
  description that named products, and its second sentence existed to compensate for a
  card that used to look empty. The non-judgment framing is not lost from the product: it
  still ships in ACT's body-awareness copy and in the gratitude tool, and it belongs to
  Strategy 5 rather than to the pillar as a whole.

### Minor drift inside `cbt.md` itself (worth a touch-up, not a rewrite)

- The route list omits `/modules/cbt/saved/[id]` (present at
  `app/(app)/modules/cbt/saved/[id].tsx`, backing `thought-record-saved-screen.tsx`).

---

## Why not the other options

- **(a) Replace/align `cbt.md` to the Gillihan spec** — actively harmful. It would
  overwrite an accurate as-built reference with an aspirational model the code does not
  implement (5-step vs 8-step TR, string vs array evidence, different mood shape),
  _manufacturing_ drift where there is currently none and destroying the one doc that
  tells a contributor what actually ships today.
- **(b) Delete `cbt.md` as stale** — it is not stale; it tracks the code. Deleting it
  removes the only as-built map of routes, data shape, and reminder fields, leaving only a
  spec that diverges from reality. Worse for onboarding contributors and for debugging.
- **(c) Keep with a clear pointer** — preserves accurate as-built docs, names the
  canonical spec so design intent has a home, and captures the deltas so future work can
  reconcile _code toward spec_ deliberately. This is the fix.

---

## Recommended follow-up action (owner-gated)

**Edit `docs/modules/cbt.md` only. Do not touch `cbt-gillihan-made-simple.md`
(it is already correctly self-labeled canonical). Do not delete anything.**

1. **Retitle + reframe the top of `cbt.md`.** Change the framing from "spec/placeholder"
   to as-built reference and add a pointer block immediately under the H1. Suggested text:

   ```markdown
   # CBT Module — As-Built Reference

   > **Doc role:** This documents the CBT module **as currently implemented**
   > (routes, data shape, flows). For the canonical product/design target — the
   > 10-strategy Gillihan "Think-Act-Be" model — see
   > [`cbt-gillihan-made-simple.md`](./cbt-gillihan-made-simple.md).
   > Where the two differ, this file describes what ships **today**; the Gillihan
   > spec describes where the module is **headed**. Known deltas are listed at the
   > bottom of this file.
   ```

2. **Add a short "Known deltas vs canonical spec" section** at the end of `cbt.md` so the
   drift is tracked in one place instead of rediscovered:

   ```markdown
   ## Known deltas vs the canonical Gillihan spec

   These are intentional/known differences between what ships today and
   `cbt-gillihan-made-simple.md`. Reconcile deliberately, not by editing docs to match.

   - Thought record: implemented as an 8-step flow with negative automatic thoughts
     (per-thought belief rating + hot-thought marking) and array-typed evidence
     (`evidenceFor[]` / `evidenceAgainst[]`). The spec's Strategy 3 describes a 5-step
     flow with a single `automaticThought` string and string-typed evidence.
   - Mood tool uses a CBT-column shape (situation / thoughts / behaviours / bodily
     sensations) at `/tools/check-in`, not the spec's `moodScore` 1-10 model.
   - Program scaffold is a 5-phase model (assessment → formulation → thinking →
     behavioural → resilience), not the spec's Week 1 / 2-4 / 4-8 / 8-12 milestones.
   - Onboarding concern→strategy assessment, strategy recommendation, distortion
     pre-selection, and auto pattern-detection (spec §10, §4) are not yet surfaced;
     the personalization scaffolding is retained but dormant.
   ```

3. **Fix the one intra-doc omission:** add `/modules/cbt/saved/[id]` to the route list in
   `cbt.md` (backs the post-save confirmation screen).

4. **Update project memory** (`project_cbt_direction.md`): correct the "cbt.md is MVP
   placeholder only" note to "cbt.md is the as-built reference; cbt-gillihan-made-simple.md
   is the canonical target spec; deltas tracked in cbt.md's Known deltas section." The
   current memory framing is what makes this doc look like drift when it is not.

No code changes are required by this reconciliation — the deltas above are product
follow-ups, not doc bugs.
