# What already ships against the three proposed CBT `Be` tools

**Ticket:** [Audit: what ACT already ships against the three proposed Be tools](https://github.com/Selftend/selftend/issues/1196) (map [#1195](https://github.com/Selftend/selftend/issues/1195))
**Date:** 2026-08-20
**Method:** read of `src/features/act/*`, `src/features/grounding/*`, `src/features/meditation/*`, `src/constants/*`, `src/i18n/locales/en/{act,cbt,meditation}.json`, `supabase/migrations/*`. Route/table columns cross-checked against the `#1176` inventory on `research/cbt-act-seed-inventory` rather than re-derived.

---

## Headline

The three proposed `Be` tools are not merely duplicated by ACT. They are **triple-covered**: each one already exists as an ACT screen _and_ as a practice inside the shared tools that the owner's own sketch keeps in `Be`'s bottom row.

| Owner's proposed `Be` tool                                                                          | ACT already ships                                                                                                  | Shared tool already ships                                                                                                                | Verdict                                                          |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Mindful Awareness** — "Notice thoughts, feelings and sensations without immediately reacting."    | **Defusion** (`act_defusion_logs`), **Observing Self** (`act_observing_self_sessions`)                             | `/tools/meditation` practice **`observing-thoughts`** — _"Watch thoughts come and go without grabbing on to any."_                       | Fully covered, twice                                             |
| **Grounding & Presence** — "Reconnect with the body and present environment."                       | **Connection** (`act_connection_logs`), **Drop Anchor** (writes `act_connection_logs`, `technique = 'dropAnchor'`) | `/tools/grounding` — _"Quick techniques to anchor yourself in the present moment"_ — 3 techniques incl. **`feet-floor`** and **`54321`** | Fully covered, twice                                             |
| **Acceptance & Self-Compassion** — "Make room for difficult experiences without fighting yourself." | **Expansion**, already relabelled **"Acceptance log"** (`act_expansion_logs`); plus **Urge Surfing**               | `/tools/meditation` practice **`loving-kindness`** — _"Direct warm wishes towards yourself and gradually outward."_                      | Acceptance covered by ACT; self-compassion covered by meditation |

**The single most important line in the codebase for this map** is the comment at `src/features/meditation/practices.ts:11`:

> `// The 4 seated techniques carried over from the retired mindfulness tool.`

That is the "mindfulness relocation" in the code, not just in the docs. There _was_ a CBT mindfulness tool. It was retired and its contents were split across `/tools/meditation` and `/tools/grounding`.

### Gillihan's Strategy 5 library vs. what shipped

`cbt-gillihan-made-simple.md` Strategy 5 specifies a seven-exercise "minimum viable set" for CBT mindfulness. **Five of the seven already ship**, just not under the CBT module:

| Gillihan exercise                   | Where it lives now                         |
| ----------------------------------- | ------------------------------------------ |
| Mindful breathing                   | `/tools/meditation` → `breath-awareness`   |
| Body scan                           | `/tools/meditation` → `body-scan`          |
| 5-4-3-2-1 sensory grounding         | `/tools/grounding` → `54321`               |
| Observing thoughts without judgment | `/tools/meditation` → `observing-thoughts` |
| Loving-kindness meditation          | `/tools/meditation` → `loving-kindness`    |
| Mindful walking                     | **not shipped**                            |
| Mindful eating                      | **not shipped**                            |

So the honest size of the content gap in `Be` is **two exercises**, not three tools.

---

## 1. ACT inventory

Every ACT principle is represented in the ACT programme (`src/features/act/program-definition.ts`), so none of these are orphaned screens.

### Defusion

- **Routes:** `/modules/act/defusion` (list), `/[id]` (detail), `/new` (create form)
- **Table:** `act_defusion_logs` (encrypted `_data` + `security_invoker` view)
- **Flow:** log with a form. Not guided.
- **Captured:** `fusedThought`, `thoughtCategory` (6-value CHECK enum: `selfJudgment` / `worry` / `pastRegret` / `prediction` / `ruleStatement` / `other`), `fusionLevelBefore` (0–100, nullable), `techniqueUsed` (**7-value enum**: `havingTheThoughtThat`, `musicalThoughts`, `namingTheStory`, `thankingYourMind`, `sillyVoices`, `televisionScreen`, `subtitles`), `defusedVersion`, `fusionLevelAfter`, `notes`
- **Copy:** _"Defusion log — A record of thoughts you've stepped back from."_ / _"Use defusion when a sticky thought shows up."_
- **Programme:** yes (`program-definition.ts:143`, `:162`)

### Observing Self

- **Routes:** `/modules/act/observing-self` (list), `/[id]`, `/new`
- **Table:** `act_observing_self_sessions`
- **Flow:** log with a form.
- **Captured:** `techniqueUsed` (`tenDeepBreaths` / `skyAndWeather` / `bodyAwareness`), `whatWasObserved`, `durationMinutes`, `moodAfter`, `notes`
- **Copy:** _"Observing Self sessions — A record of moments you accessed the stable witness within."_
- **Programme:** yes (`:114`)

### Connection

- **Routes:** `/modules/act/connection` (list), `/[id]`, `/new`
- **Table:** `act_connection_logs`
- **Flow:** log with a form.
- **Captured:** `technique` (**5-value enum**: `noticeFiveThings`, `mindfulActivity`, `tenDeepBreaths`, `dropAnchor`, `bodyScan`), `activityContext`, `noticesFromSenses`, `durationMinutes`, `moodAfter`, `notes`
- **Copy:** _"Connection log — A record of times you came fully into the present moment."_ / _"Try 'Notice Five Things' the next time your mind drifts."_
- **Programme:** yes (`:124`, filtered to `technique !== 'dropAnchor'`)

### Drop Anchor

- **Route:** `/modules/act/connection/drop-anchor` — a **guided exercise**, not a log form. Writes `act_connection_logs` with `technique = 'dropAnchor'` and **displays no history** of its own.
- **Copy:** _"When you feel pulled off course, drop anchor to steady yourself."_ / _"Acknowledge your thoughts and feelings. Silently name what's here: 'I'm noticing anxiety.'"_ / _"Come back to your body. Press your feet into the floor, straighten your spine, and breathe."_
- **Programme:** yes (`:95`, filtered to `technique === 'dropAnchor'`)
- **Note:** this is the closest existing thing to the proposed _Grounding & Presence_, and it is nearly identical in wording to `/tools/grounding`'s `feet-floor` technique.

### Expansion (surfaced as "Acceptance")

- **Routes:** `/modules/act/expansion` (list), `/[id]`, `/new`
- **Table:** `act_expansion_logs`
- **Flow:** log with a form.
- **Captured:** `emotion`, `bodySensation`, `intensityBefore`, `struggleSwitchOn` (bool), `discomfortType` (`clean` | `dirty`), `techniqueUsed` (`fourStepExpansion` / `acceptanceSelfTalk` / `acceptanceImagery`), `intensityAfter`, `notes`
- **Copy:** _"Acceptance log — A record of times you made room for difficult feelings."_ / _"Use acceptance when a difficult emotion or sensation is present."_
- **Programme:** yes (`:152`, counted together with urge-surf logs)
- **Note:** the en strings were renamed Expansion → Acceptance and **have not yet reached Weblate**; `bg` still says Expansion.

### Urge Surfing

- **Route:** `/modules/act/expansion/urge-surfing` — guided exercise with an **inline recent-5 strip**; no list route.
- **Table:** `act_urge_surf_logs`
- **Captured:** `urgeDescription`, `trigger`, `peakIntensity`, `surfingNotes`, `urgeActedOn` (bool), `completedAt`

### Choice Point

- **Routes:** `/modules/act/choice-point` (list), `/[id]`, `/new`
- **Table:** `act_choice_points`
- **Programme:** yes (`:85`)
- **Relevance to `Be`:** low — it is a decision-framing tool, not a mindfulness practice.

---

## 2. The shared tools already in `Be`'s row

The owner's sketch keeps _"Breathing · Meditation · Grounding · Check-in · Sleep"_ below the new strategies. Three of those five overlap the proposals directly.

| Shared tool         | Overlap with the proposals                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/tools/grounding`  | **Direct collision with _Grounding & Presence_.** Copy: _"Quick techniques to anchor yourself in the present moment when anxiety or distress spikes."_ Ships 3 techniques: `54321` (5 sensory steps), `cold-water` (4 guided steps), `feet-floor` (4 guided steps — _the_ body-grounding exercise). Full flow: technique cards → stepped session runner → history. |
| `/tools/meditation` | **Direct collision with _Mindful Awareness_ and with the self-compassion half of the third tool.** Ships `observing-thoughts` and `loving-kindness` alongside `breath-awareness` and `body-scan`. Also a full ten-stage TMI programme — a much larger surface than a `Be` strategy would be.                                                                       |
| `/tools/breathing`  | Partial — breath as an attention anchor.                                                                                                                                                                                                                                                                                                                           |
| `/tools/check-in`   | No overlap; mood capture.                                                                                                                                                                                                                                                                                                                                          |
| `/tools/sleep`      | No overlap.                                                                                                                                                                                                                                                                                                                                                        |

Note that the hue tokens are **already named after the pillars** — `grounding.ts` tags a step `hue: "be"` and another `hue: "think"`, and meditation tags `loving-kindness` as `hue: "be"`. The shared tools are already colour-coded as `Be` content; they are simply not _listed_ as strategies.

---

## 3. What could a CBT-native version actually differ on?

The ticket asks for this explicitly, including the answer "nothing".

| Proposed tool                    | Plausible CBT-native difference                                                                                                                                                                                                                                                                                                                                                                  | Honest verdict                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mindful Awareness**            | ACT's Defusion is built on ACT's _metaphor_ vocabulary (`namingTheStory`, `thankingYourMind`, `sillyVoices`). A CBT framing would be plainer and would tie noticing to the thought record — "notice it, then decide whether to run a record on it".                                                                                                                                              | **Framing only, plus one genuine seam:** a hand-off into `/modules/cbt/new`. No new capture is justified — `observing-thoughts` already exists and the `noticing_logs` four-box capture was already tried and abandoned. |
| **Grounding & Presence**         | Nothing. `/tools/grounding` is a complete, CBT-agnostic implementation already sitting in the `Be` row, and ACT's Drop Anchor uses near-identical wording.                                                                                                                                                                                                                                       | **Nothing.** This is the strongest candidate for "no new tool" — see the recommendation below.                                                                                                                           |
| **Acceptance & Self-Compassion** | ACT's Expansion is explicitly ACT-theoretic (`struggleSwitchOn`, `clean`/`dirty` discomfort). Gillihan attaches self-compassion to _cognitive_ work — _"speak to yourself as you would a good friend; challenge self-criticism"_ (lines 154, 477) — which is a different intervention from ACT acceptance, and is not covered by `loving-kindness` (a meditation, not a restructuring exercise). | **The self-compassion half is a real gap**; the acceptance half is not. These two should probably not share a slot.                                                                                                      |

### The one genuinely uncovered thing

**Self-compassion as a cognitive exercise** — noticing self-critical talk and re-voicing it as you would to a friend. That is:

- specified in the Gillihan doc (twice),
- _not_ implemented anywhere: ACT has no self-compassion tool, and `loving-kindness` is a seated meditation rather than a restructuring exercise,
- and it sits naturally next to the existing `Think` tools (`beliefs` already handles recurring self-critical themes) — which is a boundary question for the tool-definition ticket, not this one.

Also uncovered: **mindful walking** and **mindful eating**, the two Gillihan exercises that never shipped. Both are instruction-only ("with a meal", "10/20 min") and would be additions to `/tools/meditation`'s practice list, not new `Be` strategies.

---

## 4. Cross-findings (outside this ticket's question, verified in passing)

- **The divergence from Gillihan's values model is explicit and destructive, not accidental drift.** `20260555_workbook_alignment.sql` is headed _"Values: replace domain-matrix model with personal-values jsonb"_. It `DELETE`s every existing row (_"no cross-model backfill possible"_), **drops** `life_domain`, `importance_rating`, `satisfaction_rating` and `domain_note`, adds `personal_values` jsonb, and swaps `unique (user_id, life_domain)` for **`UNIQUE (user_id)`**. So `values_profile` is a **true per-user singleton** and `repository.ts`'s `.maybeSingle()` is correct — there is no latent multi-row bug. This is the decisive record that CBT's values tool deliberately stopped being the importance-vs-satisfaction matrix that the Gillihan doc still specifies. Relevant to [Decide how a goal references a value](https://github.com/Selftend/selftend/issues/1203).
- **⚠️ The `#1176` inventory's `values_profile` row is stale, and the seed map's "values_profile is not a singleton" finding is wrong.** The inventory records _"`importance_rating` and `satisfaction_rating` **not null**, 1–5; `life_domain` free text; `unique (user_id, life_domain)`"_ and _"one per `life_domain`"_. Those columns and that constraint were **dropped by `20260555`**, which replaced them with `UNIQUE (user_id)`. Three independent confirmations that it _is_ a singleton:
  1. `20260555_workbook_alignment.sql:24` — _"Switch from composite key (user_id, life_domain) to single-row per user"_, adding `values_profile_user_id_key UNIQUE (user_id)`.
  2. `20260629_values_profile_encrypt.sql:10` — _"values_profile is a per-user singleton with **UNIQUE (user_id)**"_, and `:52` — _"The base table keeps its UNIQUE (user_id)"_.
  3. `20260630_values_profile_drop_plaintext.sql:4` — relies on _"the UNIQUE (user_id) constraint that backs the upsert merge"_.

  A seed written against the inventory's row would fail outright (those columns do not exist), and seeding more than one row per user would break the CBT values screen, whose `getValuesProfile` uses `.maybeSingle()`. **Flagged on the seed map.**

- `20260555` was itself **re-versioned** after colliding with `20260524_thought_records_multiple_nats` on the same version prefix — a live instance of the known migration-version trap.
- **ACT's `act_bulls_eye_snapshots` is the only unencrypted table** in the ACT set (per the `#1176` inventory).

---

## 5. What this implies for the next tickets

- [Decide how CBT-native Be tools coexist with ACT duplicates](https://github.com/Selftend/selftend/issues/1197) now has to price duplication against **two** existing surfaces per tool, not one — and one of those surfaces (`/tools/grounding`, `/tools/meditation`) is _already inside the `Be` card_. A CBT-native `Be` tool would sit directly above a shared tool that does the same thing.
- [Define Grounding and Presence…](https://github.com/Selftend/selftend/issues/1200) has a strong evidence-backed "no new tool — promote the existing Grounding tool into a strategy slot" answer available.
- [Define the Acceptance and Self-Compassion tool](https://github.com/Selftend/selftend/issues/1201) should probably split: acceptance is covered, self-compassion is the one real gap.
- [Decide how far the mindfulness relocation is reversed](https://github.com/Selftend/selftend/issues/1198) is now the load-bearing ticket. The relocation is not just a doc note — it is visible in `practices.ts:11` and in the pillar-named hue tokens. Deciding how far to reverse it largely determines what is left for the per-tool tickets to define.
