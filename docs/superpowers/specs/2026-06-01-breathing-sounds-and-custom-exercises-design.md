# Breathing tool: sounds + custom exercises — design

**Date:** 2026-06-01
**Status:** Approved design, pending implementation plan

## 1. Summary

Add a coordinated audio experience and a custom-exercise builder to the breathing
tool. Today the tool has three static patterns (`box-breathing`, `4-7-8`,
`coherent-breathing`) defined in `src/constants/breathing.ts`, a runner at
`app/(app)/tools/breathing/[slug].tsx` that animates a circle and counts down in
minutes, and no audio at all.

This design adds:

- A bundled, curated **sound catalog** (breath sounds + ambient sounds).
- A single **audio controller** that coordinates two playback lanes (breath +
  ambient) with the runner's phase cycle.
- A **"Sounds" sheet** on the runner: two volume sliders, each with a settings
  (gear) icon that opens a sound picker. These are global preferences.
- A **cycle-based runner** that replaces minute-based selection for _all_
  exercises (built-in and custom), showing a cycles dial + quick chips + a live
  calculated total time.
- A **custom-exercise builder** saved to the user's database, matching the
  provided reference design.
- **Custom exercises in the breathing list** (as colored cards) with edit/delete.

## 2. Decisions captured during brainstorming

| Topic                                      | Decision                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice cues                                 | **No spoken voice / no TTS.** Sounds carry the cues; language-neutral, offline.                                                             |
| Sound source                               | **Bundled curated catalog.** No upload/storage/streaming infra; store only the chosen sound's id.                                           |
| Stretch a sound to a variable phase length | **Loop + fade.** Each breath sound is a short seamless loop played for the exact phase length with a brief fade in/out. No pitch artifacts. |
| Settings scope                             | **Global user preferences.** One audio profile (breath sound, ambient sound, two volumes) applied to every exercise.                        |
| Builder model                              | **Constrained single cycle**: Inhale → Hold → Exhale → Hold.                                                                                |
| Phase durations                            | **Decimal seconds** (e.g. `5.5`); `0` skips a phase.                                                                                        |
| Session length                             | **Cycles, not minutes**, with live calculated total time. Quick-pick cycle chips + a `−/+` dial.                                            |
| Built-in patterns                          | **Also adopt the cycle model** (unified runner).                                                                                            |
| Transition cue                             | **None.** Breath sounds alone mark transitions; holds are silent.                                                                           |
| Sounds panel placement                     | **Bottom sheet on the runner** (changes apply live and persist globally).                                                                   |
| Per-exercise extras                        | **Name** + **card color** per custom exercise.                                                                                              |

## 3. Out of scope

- Spoken voice cues / TTS (`expo-speech`).
- User-uploaded sounds, Supabase Storage buckets, remote/streamed audio.
- Transition chimes or hold-fill tones.
- Per-exercise sound/volume profiles (audio settings are global only).
- Background/lock-screen audio beyond what `expo-av`'s audio mode already gives.

## 4. External dependency: audio assets

The actual audio files cannot be generated as part of implementation. The design
ships a **catalog config** that maps sound ids to `require()`d asset paths, plus
placeholder/temporary assets, and integrates real royalty-free files when
supplied. Implementation can proceed end-to-end with placeholders; swapping in
final assets is a content task, not a code change.

## 5. Audio architecture

A single controller hook, `useBreathingAudio`, owns all playback. It mirrors the
existing dual-path pattern in `src/features/timer/timer-widget.tsx`:

- **Native:** `expo-av` — `Audio.Sound.createAsync`, `setIsLoopingAsync(true)`,
  `setVolumeAsync`, and `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })`
  configured once. (A future `expo-audio` migration is noted in the timer widget;
  we stay on `expo-av` for consistency.)
- **Web:** `window.Audio` elements (looping, per-lane volume).

### Lanes

- **Breath lane** — the chosen breath sound is an `{ inhale, exhale }` pair of
  loop-friendly clips:
  - `inhale` phase → fade in the inhale loop.
  - `exhale` phase → fade in the exhale loop.
  - both `hold` phases → fade out to silence.
  - "Fade" = a short (~150 ms) `setVolumeAsync` ramp at each boundary, since
    `expo-av` has no native fade.
  - Played at the breath-lane volume.
- **Ambient lane** — a single looping clip, started at session start, runs
  continuously for the whole session at the ambient-lane volume, independent of
  phases.

`None` is a valid selection for either lane (the lane stays silent). The
controller's only input is the runner's existing per-second phase signal — when
the active phase changes, the controller re-coordinates the breath lane.

Lifecycle: sounds are created on session start, kept loaded for the session, and
unloaded on finish/unmount (mirroring the timer widget's `unloadAsync` cleanup).

## 6. Sound catalog

`src/constants/breathing-sounds.ts`:

```ts
export interface BreathSound {
  id: string; // stored in preferences
  labelKey: string; // i18n
  inhaleAsset: number; // require(...)
  exhaleAsset: number;
}
export interface AmbientSound {
  id: string;
  labelKey: string;
  asset: number;
}
```

Starter set (placeholder assets until real ones are supplied):

- **Breath:** `none`, `soft-breath`, `ocean-swell`, `wind`.
- **Ambient:** `none`, `rain`, `forest`, `night`, `brown-noise`.

The picker lists these entries with tap-to-preview. Only the selected **id** is
persisted.

## 7. Data model

### 7.1 New table `breathing_exercises`

Migration `supabase/migrations/20260572_breathing_exercises.sql` (8-digit version
format per repo convention; next free after `20260571`). RLS scoped to the
authenticated owner, matching the pattern in recent migrations
(`20260564_rls_scope_to_authenticated.sql`).

| Column             | Type                                  | Notes                                                 |
| ------------------ | ------------------------------------- | ----------------------------------------------------- |
| `id`               | `uuid` pk default `gen_random_uuid()` |                                                       |
| `user_id`          | `uuid` references `auth.users`        | owner                                                 |
| `name`             | `text` not null                       | with a freetext length check per `20260570` precedent |
| `inhale_seconds`   | `numeric` not null                    | decimals allowed; `0` = skip                          |
| `hold_in_seconds`  | `numeric` not null                    | `0` = skip                                            |
| `exhale_seconds`   | `numeric` not null                    | `0` = skip                                            |
| `hold_out_seconds` | `numeric` not null                    | `0` = skip                                            |
| `cycles`           | `int` not null                        | `>= 1`                                                |
| `color`            | `text` not null                       | accent token / hex from a small palette               |
| `created_at`       | `timestamptz` default `now()`         |                                                       |
| `updated_at`       | `timestamptz` default `now()`         |                                                       |

RLS: select/insert/update/delete restricted to `auth.uid() = user_id`, scoped to
`authenticated`. Consider including this table in the user-data export RPC
(see `20260568_export_user_data_act_plan_widget.sql`) — noted for the plan.

### 7.2 Audio preferences on `user_preferences`

Four new **optional** columns, added via the same migration or a sibling:
`breath_sound_id text`, `ambient_sound_id text`, `breath_volume numeric`,
`ambient_volume numeric`. Surface them through the `UserPreferences` type
(`src/features/modules/types.ts`), `defaultUserPreferences`,
`getUserPreferences`/`updateUserPreferences`
(`src/features/settings/repository.ts`), and the existing
`omitOptionalPreferenceColumns` fallback so writes degrade gracefully if the
columns are not yet deployed.

Defaults: `breath_sound_id = 'soft-breath'`, `ambient_sound_id = 'none'`,
`breath_volume = 0.7`, `ambient_volume = 0.5` (final defaults confirmable during
implementation).

## 8. Cycle-based runner (unified)

Both built-in and custom exercises resolve to one runtime shape:

```ts
interface ResolvedExercise {
  phases: { label: "inhale" | "hold" | "exhale" | "holdOut"; seconds: number }[];
  cycles: number;
}
```

- `src/constants/breathing.ts` built-ins are re-expressed in the four-phase shape
  (Inhale, Hold, Exhale, Hold) and gain a **default cycle count** plus
  quick-pick cycle options; the `durations` (minutes) field is removed.
- The runner **intro** replaces minute chips with: a **cycles `−/+` dial**,
  **quick-pick chips** (e.g. 2 / 6 / 10), and a **live calculated total time**
  = `cycles × Σ(phase seconds)`.
- The **active** screen keeps the existing circle animation (grow on inhale,
  steady on hold, shrink on exhale, steady on hold-out), runs `cycles`
  repetitions and then finishes, and displays cycle `X / N` plus remaining time.
- Phases with `0` seconds are skipped in the cycle.
- Session logging is unchanged in storage: it still writes to
  `mindfulness_sessions` with `durationMinutes` computed from **elapsed** cycles
  (so "Finish early" records partial time), preserving history continuity.

## 9. Custom-exercise builder

New route `app/(app)/tools/breathing/new.tsx` plus an edit variant
(`edit/[id].tsx` or `[id]` param). Layout mirrors the reference screenshot:

- **Name** field.
- **Four phase steppers** — Inhale / Hold / Exhale / Hold — each adjusting a
  decimal-second value via up/down controls.
- **Suggested Patterns** quick-fill chips (e.g. `5.5-0-5.5-0`, `6-0-2-0`,
  `4-4-4-4`) that populate the four steppers.
- **Breath cycles & duration**: the cycles `−/+` dial + quick-pick chips + the
  live calculated total time.
- **Exercise card color** picker from a small palette tied to the app's accent
  tokens (`src/features/home/tool-accent.ts` as reference).
- **Save**.

Validation: name required (within length check); at least `inhale > 0` and
`exhale > 0`; `cycles >= 1`. Persisted via a new `breathing-exercises`
query/repository module (React Query), invalidating the breathing list on
save/delete.

## 10. List integration & session logging

- The breathing index (`app/(app)/tools/breathing/index.tsx`) renders the three
  built-in pattern rows **plus** custom-exercise cards (each in its chosen
  `color`) and a **"New exercise" +** entry.
- Custom cards support **edit** and **delete**.
- Tapping a custom card routes to the runner with the custom exercise resolved
  from the DB (built-ins continue to resolve from constants by slug).
- **Custom session logging:** a custom session writes `exercise_name = <custom
exercise id>`. The breathing sessions query (`src/features/breathing/queries.ts`,
  `listMindfulnessSessionsByNames`) passes `[...breathingSlugs,
...usersCustomExerciseIds]` so custom sessions appear in "Recent sessions".
  Display names resolve from slug i18n (built-ins) or the custom record (custom).
  A deleted custom exercise's past sessions still resolve to a stored/fallback
  name — store enough to render history, or fall back to a generic label.

## 11. Sounds sheet

A speaker icon on the runner opens a bottom sheet:

- **Breath** row: volume slider + ⚙︎ gear → opens the breath-sound picker.
- **Ambient** row: volume slider + ⚙︎ gear → opens the ambient-sound picker.
- Pickers list catalog entries with **tap-to-preview**; selecting writes the id,
  and slider changes write the volume, to global `user_preferences`. Changes
  apply **live** to the running session.

## 12. Testing

- **Unit:** cycle ↔ total-time math; phase resolution (including `0`-skip);
  builder validation; catalog lookups; `UserPreferences` merge with the new
  audio fields.
- **Component (RTL):** builder save flow; runner cycle progression and finish
  (early + complete); Sounds sheet selection and volume wiring. Audio modules are
  mocked (no real playback), consistent with the existing
  `breathing-screen.test.tsx` mocking approach.
- Edge-function/Deno code is not involved here, so `npm run verify` covers the
  changed surface.

## 13. Suggested build phasing

1. **Cycle refactor** — runner + built-ins move to cycles + calculated time.
   Independently shippable; no new tables.
2. **Custom exercises** — `breathing_exercises` table, builder screen, list
   cards + edit/delete, custom session logging.
3. **Audio** — catalog, `useBreathingAudio` controller, Sounds sheet, preference
   columns. Last, and gated on real audio assets (works with placeholders until
   then).

## 14. Open items for the implementation plan

- Final default values for the audio preferences.
- Exact route shape for the edit screen (`edit/[id]` vs param).
- Whether `breathing_exercises` is added to the user-data export RPC now or later.
- Color palette source for the card color picker.
- Sourcing the real audio asset files (content task, parallel to code).
