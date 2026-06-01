# Breathing — Phase 3: Audio Engine + Sounds Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add coordinated breath + ambient audio to the breathing runner — a bundled sound catalog, a controller that plays breath clips per phase and a continuous ambient bed, and a "Sounds" bottom sheet with two volume sliders + sound pickers backed by global preferences.

**Architecture:** Four optional columns on `user_preferences` hold the global audio profile. A static `breathing-sounds.ts` catalog maps sound ids to bundled assets (breath = an `{inhale, exhale}` pair; ambient = one clip). A pure `breath-audio-plan.ts` decides which clip a phase should play (testable). A `useBreathingAudio` hook owns playback, mirroring the existing `timer-widget` dual path (`expo-av` native / `window.Audio` web): it starts the ambient loop while a session is active and swaps the looping breath clip on each phase change, with short volume ramps. A `VolumeSlider` (PanResponder) and a `SoundsSheet` Modal edit the global prefs live. The runner gains a speaker button that opens the sheet and feeds the current phase + prefs into the controller.

**Tech Stack:** React Native, Expo Router, `expo-av`, `react-native` `PanResponder`/`Modal`, Supabase, TanStack Query, Jest + Testing Library.

> **Plan scope note:** Plan 3 of 3 for spec `docs/superpowers/specs/2026-06-01-breathing-sounds-and-custom-exercises-design.md`. Phases 1 (cycle runner) and 2 (custom exercises) are implemented. This is the final phase.

> **Git rule (project standing rule):** Do NOT `git add`/`commit`/stage. Each task ends at a verification checkpoint; the user manages all git.

> **DB rule (project standing rule):** Do NOT run `supabase db reset`. The migration is idempotent (`add column if not exists`); the USER applies it. Jest mocks Supabase, so tests pass without the columns.

> **External dependency (spec §4):** real audio files are a content task. This plan ships the catalog wired to a placeholder asset (`assets/sounds/bell.wav`) and defaults BOTH lanes to `none` (silent) so the default experience is correct. Swapping in real loop assets + flipping the default breath sound is a later, code-light change.

## File Structure

| File                                                           | Responsibility                                      | C/M    |
| -------------------------------------------------------------- | --------------------------------------------------- | ------ |
| `supabase/migrations/20260573_breathing_audio_preferences.sql` | 4 optional audio columns on `user_preferences`      | Create |
| `src/features/modules/types.ts`                                | `UserPreferences` audio fields + defaults           | Modify |
| `src/features/settings/repository.ts`                          | Row type, map, payload, optional-column fallback    | Modify |
| `src/features/settings/audio-preferences.test.ts`              | get/update round-trip for the new fields            | Create |
| `src/constants/breathing-sounds.ts`                            | Catalog: breath `{inhale,exhale}` + ambient, `none` | Create |
| `src/features/breathing/breath-audio-plan.ts`                  | Pure: phase → clip decision                         | Create |
| `src/features/breathing/breath-audio-plan.test.ts`             | Planner unit tests                                  | Create |
| `src/features/breathing/use-breathing-audio.ts`                | Playback controller hook                            | Create |
| `src/features/breathing/use-breathing-audio.test.tsx`          | Hook test (mock expo-av)                            | Create |
| `src/components/app/volume-slider.tsx`                         | PanResponder volume slider (0–1)                    | Create |
| `src/components/app/volume-slider.test.tsx`                    | Slider render/accessibility test                    | Create |
| `src/features/breathing/sounds-sheet.tsx`                      | Modal: 2 sliders + 2 pickers, live prefs            | Create |
| `src/features/breathing/sounds-sheet.test.tsx`                 | Sheet component test                                | Create |
| `app/(app)/tools/breathing/[slug].tsx`                         | Speaker button + sheet + `useBreathingAudio`        | Modify |
| `src/i18n/locales/en/cbt.json`                                 | Audio/sounds i18n keys                              | Modify |

---

## Task 1: Migration — audio preference columns

**Files:** Create `supabase/migrations/20260573_breathing_audio_preferences.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Global breathing audio preferences. Four optional columns on user_preferences holding the
-- one audio profile applied to every breathing exercise (spec: settings are global, not
-- per-exercise). Additive + idempotent (add column if not exists). The app degrades gracefully
-- if these are not yet deployed (see omitOptionalPreferenceColumns in settings/repository.ts).
-- Defaults are 'none' / 'none' so the out-of-the-box experience is silent until the user picks
-- a sound (placeholder audio assets ship until real loops are supplied).

alter table public.user_preferences
  add column if not exists breath_sound_id text not null default 'none',
  add column if not exists ambient_sound_id text not null default 'none',
  add column if not exists breath_volume numeric not null default 0.7,
  add column if not exists ambient_volume numeric not null default 0.5;
```

- [ ] **Step 2: Verify (no apply, no reset)**

CREATE the file only; do NOT apply to a DB (the user applies it). Sanity-check the SQL by eye. There is nothing to run in jest/tsc for the migration. Do NOT commit.

---

## Task 2: Preferences plumbing for the audio fields

**Files:** Modify `src/features/modules/types.ts`, `src/features/settings/repository.ts`

- [ ] **Step 1: Extend the `UserPreferences` type + defaults**

In `src/features/modules/types.ts`, add four fields to the `UserPreferences` interface (after `shownButtonTours`):

```ts
  shownButtonTours: ButtonTourKey[];
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
```

And to `defaultUserPreferences` (after `shownButtonTours: []`):

```ts
  shownButtonTours: [],
  breathSoundId: "none",
  ambientSoundId: "none",
  breathVolume: 0.7,
  ambientVolume: 0.5,
```

- [ ] **Step 2: Extend the row type + mapper + payload + fallback** in `src/features/settings/repository.ts`

(a) In `UserPreferenceRow` (after `shown_button_tours`):

```ts
  shown_button_tours: string[] | null;
  breath_sound_id: string | null;
  ambient_sound_id: string | null;
  breath_volume: number | null;
  ambient_volume: number | null;
```

(b) In `mapPreferences` return (after `shownButtonTours`):

```ts
    shownButtonTours: (row.shown_button_tours ?? []) as ButtonTourKey[],
    breathSoundId: row.breath_sound_id ?? defaultUserPreferences.breathSoundId,
    ambientSoundId: row.ambient_sound_id ?? defaultUserPreferences.ambientSoundId,
    breathVolume: row.breath_volume ?? defaultUserPreferences.breathVolume,
    ambientVolume: row.ambient_volume ?? defaultUserPreferences.ambientVolume,
```

(c) In `updateUserPreferences` `payload` (after `shown_button_tours`):

```ts
    shown_button_tours: preferences.shownButtonTours,
    breath_sound_id: preferences.breathSoundId,
    ambient_sound_id: preferences.ambientSoundId,
    breath_volume: preferences.breathVolume,
    ambient_volume: preferences.ambientVolume,
```

(d) In `isMissingOptionalPreferenceColumn`, broaden the message check:

```ts
maybeError.message.includes("act_") ||
  maybeError.message.includes("cbt_program_") ||
  maybeError.message.includes("shown_button_tours") ||
  maybeError.message.includes("breath_") ||
  maybeError.message.includes("ambient_");
```

(e) In `omitOptionalPreferenceColumns`, delete the four new keys (after `delete fallbackPayload.shown_button_tours;`):

```ts
delete fallbackPayload.shown_button_tours;
delete fallbackPayload.breath_sound_id;
delete fallbackPayload.ambient_sound_id;
delete fallbackPayload.breath_volume;
delete fallbackPayload.ambient_volume;
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (any code constructing a full `UserPreferences` literal already spreads `defaultUserPreferences` or uses `mergeUserPreferences`, so no other file breaks). If a literal somewhere errors, it must spread defaults — fix by spreading, not by re-adding fields. Do NOT commit.

- [ ] **Step 4: Round-trip test (TDD-after, since this is a mapping change)**

Create `src/features/settings/audio-preferences.test.ts`:

```ts
import { getUserPreferences, updateUserPreferences } from "@/src/features/settings/repository";
import { defaultUserPreferences } from "@/src/features/modules/types";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({ requireSupabase: jest.fn() }));
const mockRequireSupabase = jest.mocked(requireSupabase);

describe("audio preferences plumbing", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps the audio columns from a row", async () => {
    const row = {
      user_id: "user-1",
      breath_sound_id: "ocean-swell",
      ambient_sound_id: "rain",
      breath_volume: 0.4,
      ambient_volume: 0.9,
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: row, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("user-1");
    expect(prefs.breathSoundId).toBe("ocean-swell");
    expect(prefs.ambientSoundId).toBe("rain");
    expect(prefs.breathVolume).toBe(0.4);
    expect(prefs.ambientVolume).toBe(0.9);
  });

  it("falls back to defaults when the columns are null", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { user_id: "u" }, error: null });
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const prefs = await getUserPreferences("u");
    expect(prefs.breathSoundId).toBe(defaultUserPreferences.breathSoundId);
    expect(prefs.breathVolume).toBe(defaultUserPreferences.breathVolume);
  });

  it("includes the audio columns in the update payload", async () => {
    const single = jest.fn().mockResolvedValue({ data: { user_id: "u" }, error: null });
    const selectAfter = jest.fn(() => ({ single }));
    const upsert = jest.fn(() => ({ select: selectAfter }));
    const from = jest.fn(() => ({ upsert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateUserPreferences("u", {
      ...defaultUserPreferences,
      breathSoundId: "soft-breath",
      ambientVolume: 0.25,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ breath_sound_id: "soft-breath", ambient_volume: 0.25 }),
      { onConflict: "user_id" },
    );
  });
});
```

- [ ] **Step 5: Run** → `npx jest src/features/settings/audio-preferences.test.ts` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 3: Sound catalog + pure planner (TDD)

**Files:** Create `src/constants/breathing-sounds.ts`, `src/features/breathing/breath-audio-plan.ts`, `src/features/breathing/breath-audio-plan.test.ts`

- [ ] **Step 1: Catalog**

`src/constants/breathing-sounds.ts`:

```ts
// Bundled breathing audio catalog. Each breath sound is an { inhale, exhale } pair of loop-
// friendly clips; ambient is a single looping clip. `none` keeps a lane silent. Assets are
// PLACEHOLDERS (bell.wav) until real loop files are supplied — see spec §4. The picker shows
// these; only the selected id is persisted in user_preferences.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const placeholder = require("@/assets/sounds/bell.wav") as number;

export interface BreathSound {
  id: string;
  labelKey: string;
  inhaleAsset: number | null;
  exhaleAsset: number | null;
}

export interface AmbientSound {
  id: string;
  labelKey: string;
  asset: number | null;
}

export const BREATH_SOUNDS: BreathSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", inhaleAsset: null, exhaleAsset: null },
  {
    id: "soft-breath",
    labelKey: "breathing.sounds.breath.soft",
    inhaleAsset: placeholder,
    exhaleAsset: placeholder,
  },
  {
    id: "ocean-swell",
    labelKey: "breathing.sounds.breath.ocean",
    inhaleAsset: placeholder,
    exhaleAsset: placeholder,
  },
  {
    id: "wind",
    labelKey: "breathing.sounds.breath.wind",
    inhaleAsset: placeholder,
    exhaleAsset: placeholder,
  },
];

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", asset: null },
  { id: "rain", labelKey: "breathing.sounds.ambient.rain", asset: placeholder },
  { id: "forest", labelKey: "breathing.sounds.ambient.forest", asset: placeholder },
  { id: "night", labelKey: "breathing.sounds.ambient.night", asset: placeholder },
  { id: "brown-noise", labelKey: "breathing.sounds.ambient.brown", asset: placeholder },
];

export const breathSoundLookup: Record<string, BreathSound> = Object.fromEntries(
  BREATH_SOUNDS.map((s) => [s.id, s]),
);
export const ambientSoundLookup: Record<string, AmbientSound> = Object.fromEntries(
  AMBIENT_SOUNDS.map((s) => [s.id, s]),
);
```

- [ ] **Step 2: Write the failing planner test**

`src/features/breathing/breath-audio-plan.test.ts`:

```ts
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";

describe("breathClipFor", () => {
  const soft = breathSoundLookup["soft-breath"];
  const none = breathSoundLookup["none"];

  it("returns the inhale clip on inhale", () => {
    expect(breathClipFor("inhale", soft)).toBe(soft.inhaleAsset);
  });

  it("returns the exhale clip on exhale", () => {
    expect(breathClipFor("exhale", soft)).toBe(soft.exhaleAsset);
  });

  it("returns null on holds", () => {
    expect(breathClipFor("hold", soft)).toBeNull();
    expect(breathClipFor("holdOut", soft)).toBeNull();
  });

  it("returns null when the sound is 'none'", () => {
    expect(breathClipFor("inhale", none)).toBeNull();
  });

  it("returns null when the phase label is null", () => {
    expect(breathClipFor(null, soft)).toBeNull();
  });
});
```

- [ ] **Step 3: Implement the planner**

`src/features/breathing/breath-audio-plan.ts`:

```ts
import type { PhaseLabel } from "@/src/constants/breathing";
import type { BreathSound } from "@/src/constants/breathing-sounds";

/** Which breath clip (if any) should play for a phase. Holds + 'none' are silent. */
export function breathClipFor(
  label: PhaseLabel | null,
  sound: BreathSound | undefined,
): number | null {
  if (!label || !sound) return null;
  if (label === "inhale") return sound.inhaleAsset;
  if (label === "exhale") return sound.exhaleAsset;
  return null;
}
```

- [ ] **Step 4: Run** → `npx jest src/features/breathing/breath-audio-plan.test.ts` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 4: Audio controller hook

**Files:** Create `src/features/breathing/use-breathing-audio.ts`, `src/features/breathing/use-breathing-audio.test.tsx`

Mirrors the `timer-widget` dual path: web uses `window.Audio`, native lazy-requires `expo-av`. The hook owns two sounds (breath, ambient), reacts to `active`, `phaseLabel`, sound ids, and volumes.

- [ ] **Step 1: Implement the hook**

`src/features/breathing/use-breathing-audio.ts`:

```ts
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import type { PhaseLabel } from "@/src/constants/breathing";
import { ambientSoundLookup, breathSoundLookup } from "@/src/constants/breathing-sounds";
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";

type ExpoAvModule = typeof import("expo-av");
type LoadedSound = {
  setVolumeAsync: (v: number) => Promise<unknown>;
  stopAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
  playAsync: () => Promise<unknown>;
};

let nativeAudioModeConfigured = false;

export interface BreathingAudioOptions {
  active: boolean;
  phaseLabel: PhaseLabel | null;
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
}

// A tiny platform-abstracted player so the controller logic stays readable.
interface LanePlayer {
  play: (asset: number, volume: number, loop: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
}

function createLanePlayer(): LanePlayer {
  if (Platform.OS === "web") {
    let el: HTMLAudioElement | null = null;
    return {
      async play(asset, volume, loop) {
        el?.pause();
        el = new window.Audio(asset as unknown as string);
        el.loop = loop;
        el.volume = volume;
        await el.play().catch(() => {});
      },
      async setVolume(volume) {
        if (el) el.volume = volume;
      },
      async stop() {
        el?.pause();
        el = null;
      },
    };
  }

  let sound: LoadedSound | null = null;
  return {
    async play(asset, volume, loop) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Audio } = require("expo-av") as ExpoAvModule;
        if (!nativeAudioModeConfigured) {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
          nativeAudioModeConfigured = true;
        }
        if (sound) {
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
          sound = null;
        }
        const created = await Audio.Sound.createAsync(asset, { isLooping: loop, volume });
        sound = created.sound as unknown as LoadedSound;
        await sound.playAsync();
      } catch {
        // Audio is best-effort; never crash a breathing session.
      }
    },
    async setVolume(volume) {
      await sound?.setVolumeAsync(volume).catch(() => {});
    },
    async stop() {
      try {
        await sound?.stopAsync();
        await sound?.unloadAsync();
      } catch {
        // ignore
      }
      sound = null;
    },
  };
}

export function useBreathingAudio(opts: BreathingAudioOptions): void {
  const { active, phaseLabel, breathSoundId, ambientSoundId, breathVolume, ambientVolume } = opts;
  const breathLane = useRef<LanePlayer | null>(null);
  const ambientLane = useRef<LanePlayer | null>(null);
  const breathClipRef = useRef<number | null>(null);

  if (!breathLane.current) breathLane.current = createLanePlayer();
  if (!ambientLane.current) ambientLane.current = createLanePlayer();

  // Ambient: start/stop with the session; restart when the chosen sound changes.
  useEffect(() => {
    const lane = ambientLane.current!;
    if (!active) {
      void lane.stop();
      return;
    }
    const asset = ambientSoundLookup[ambientSoundId]?.asset ?? null;
    if (asset !== null) void lane.play(asset, ambientVolume, true);
    else void lane.stop();
    return () => {
      void lane.stop();
    };
    // Volume changes are handled in the volume effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ambientSoundId]);

  // Breath: swap the looping clip whenever the phase (or chosen sound) changes.
  useEffect(() => {
    const lane = breathLane.current!;
    if (!active) {
      breathClipRef.current = null;
      void lane.stop();
      return;
    }
    const clip = breathClipFor(phaseLabel, breathSoundLookup[breathSoundId]);
    if (clip === breathClipRef.current) return;
    breathClipRef.current = clip;
    if (clip !== null) void lane.play(clip, breathVolume, true);
    else void lane.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phaseLabel, breathSoundId]);

  // Live volume changes without restarting playback.
  useEffect(() => {
    void breathLane.current?.setVolume(breathVolume);
  }, [breathVolume]);
  useEffect(() => {
    void ambientLane.current?.setVolume(ambientVolume);
  }, [ambientVolume]);

  // Stop everything on unmount.
  useEffect(() => {
    return () => {
      void breathLane.current?.stop();
      void ambientLane.current?.stop();
    };
  }, []);
}
```

- [ ] **Step 2: Hook test (mock expo-av)**

`src/features/breathing/use-breathing-audio.test.tsx`:

```tsx
import { renderHook } from "@testing-library/react-native";

import { useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";

const createAsync = jest.fn().mockResolvedValue({
  sound: {
    playAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  },
});

jest.mock("expo-av", () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: { createAsync: (...args: unknown[]) => createAsync(...args) },
  },
}));

describe("useBreathingAudio", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does nothing while inactive", () => {
    renderHook(() =>
      useBreathingAudio({
        active: false,
        phaseLabel: "inhale",
        breathSoundId: "soft-breath",
        ambientSoundId: "rain",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    expect(createAsync).not.toHaveBeenCalled();
  });

  it("plays a breath clip on an active inhale", async () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "soft-breath",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    // microtask flush
    await Promise.resolve();
    expect(createAsync).toHaveBeenCalled();
  });

  it("stays silent when both lanes are 'none'", () => {
    renderHook(() =>
      useBreathingAudio({
        active: true,
        phaseLabel: "inhale",
        breathSoundId: "none",
        ambientSoundId: "none",
        breathVolume: 0.7,
        ambientVolume: 0.5,
      }),
    );
    expect(createAsync).not.toHaveBeenCalled();
  });
});
```

> Note: the breathing jest preset sets `Platform.OS` to a native value, so the hook takes the expo-av path (mocked above). If the preset reports web, the test would use `window.Audio`; in that case adapt by spying on `window.Audio`. Verify which path runs and keep the test asserting the active path.

- [ ] **Step 3: Run** → `npx jest src/features/breathing/use-breathing-audio.test.tsx` → PASS; `npx tsc --noEmit` clean. Do NOT commit.

---

## Task 5: VolumeSlider component

**Files:** Create `src/components/app/volume-slider.tsx`, `src/components/app/volume-slider.test.tsx`

A horizontal 0–1 slider built on `PanResponder` + `onLayout` (no new dependency), with an accessible role/value.

- [ ] **Step 1: Implement the slider**

`src/components/app/volume-slider.tsx`:

```tsx
import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";

interface VolumeSliderProps {
  value: number; // 0..1
  onChange: (value: number) => void;
  accessibilityLabel: string;
}

const TRACK_HEIGHT = 6;
const THUMB = 18;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function VolumeSlider({ value, onChange, accessibilityLabel }: VolumeSliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const setFromX = (x: number) => {
    if (widthRef.current <= 0) return;
    onChange(clamp01(x / widthRef.current));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const pct = clamp01(value);

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        widthRef.current = w;
        setWidth(w);
      }}
      style={{
        height: THUMB + 12,
        justifyContent: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <View className="rounded-full bg-muted" style={{ height: TRACK_HEIGHT, width: "100%" }}>
        <View
          className="rounded-full bg-aqua"
          style={{ height: TRACK_HEIGHT, width: `${pct * 100}%` }}
        />
      </View>
      {width > 0 ? (
        <View
          className="rounded-full bg-aqua"
          style={{
            position: "absolute",
            left: Math.max(0, Math.min(width - THUMB, pct * width - THUMB / 2)),
            width: THUMB,
            height: THUMB,
          }}
        />
      ) : null}
    </View>
  );
}
```

- [ ] **Step 2: Render/accessibility test**

`src/components/app/volume-slider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";

import { VolumeSlider } from "@/src/components/app/volume-slider";

describe("VolumeSlider", () => {
  it("exposes the current value as an adjustable accessibility node", () => {
    render(<VolumeSlider value={0.4} onChange={() => {}} accessibilityLabel="Breath volume" />);
    const node = screen.getByLabelText("Breath volume");
    expect(node.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 40 });
  });
});
```

- [ ] **Step 3: Run** → `npx jest src/components/app/volume-slider.test.tsx` → PASS; `npx tsc --noEmit` clean; `npx eslint src/components/app/volume-slider.tsx` clean. Do NOT commit.

---

## Task 6: Sounds sheet

**Files:** Create `src/features/breathing/sounds-sheet.tsx`, `src/features/breathing/sounds-sheet.test.tsx`

A `Modal` sheet (mirroring `help-sheet.tsx`) with two lanes; each lane has a `VolumeSlider` and a picker (inline list, toggled by a gear). Reads/writes global prefs via `useUserPreferences` + `useUpdateUserPreferences`, applying changes optimistically through `mergeUserPreferences`.

- [ ] **Step 1: Implement the sheet**

`src/features/breathing/sounds-sheet.tsx`:

```tsx
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { VolumeSlider } from "@/src/components/app/volume-slider";
import { AMBIENT_SOUNDS, BREATH_SOUNDS } from "@/src/constants/breathing-sounds";
import { mergeUserPreferences, type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface SoundsSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

export function SoundsSheet({ visible, onDismiss }: SoundsSheetProps) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: prefs } = useUserPreferences(userId);
  const updateMutation = useUpdateUserPreferences(userId);
  const [openPicker, setOpenPicker] = useState<"breath" | "ambient" | null>(null);

  const effective = mergeUserPreferences(prefs, {});

  const patch = (p: Partial<UserPreferences>) => {
    if (!userId) return;
    void updateMutation.mutateAsync(mergeUserPreferences(prefs, p));
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onDismiss} transparent>
      <View className="flex-1 justify-end bg-black/40">
        <SafeAreaView edges={["bottom"]} className="rounded-t-2xl bg-background">
          <ScrollView contentContainerClassName="gap-6 p-6">
            <View className="flex-row items-center justify-between">
              <Text variant="h2">{t("breathing.sounds.title")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("breathing.sounds.close")}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={onDismiss}
              >
                <Icon name="close" className="size-6 text-muted-foreground" />
              </Pressable>
            </View>

            <Lane
              label={t("breathing.sounds.breathLabel")}
              soundName={t(BREATH_SOUNDS.find((s) => s.id === effective.breathSoundId)!.labelKey)}
              volume={effective.breathVolume}
              onVolume={(v) => patch({ breathVolume: v })}
              onGear={() => setOpenPicker(openPicker === "breath" ? null : "breath")}
              volumeLabel={t("breathing.sounds.breathVolume")}
              gearLabel={t("breathing.sounds.pickBreath")}
            />
            {openPicker === "breath" ? (
              <Picker
                items={BREATH_SOUNDS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
                selectedId={effective.breathSoundId}
                onSelect={(id) => patch({ breathSoundId: id })}
              />
            ) : null}

            <Lane
              label={t("breathing.sounds.ambientLabel")}
              soundName={t(AMBIENT_SOUNDS.find((s) => s.id === effective.ambientSoundId)!.labelKey)}
              volume={effective.ambientVolume}
              onVolume={(v) => patch({ ambientVolume: v })}
              onGear={() => setOpenPicker(openPicker === "ambient" ? null : "ambient")}
              volumeLabel={t("breathing.sounds.ambientVolume")}
              gearLabel={t("breathing.sounds.pickAmbient")}
            />
            {openPicker === "ambient" ? (
              <Picker
                items={AMBIENT_SOUNDS.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
                selectedId={effective.ambientSoundId}
                onSelect={(id) => patch({ ambientSoundId: id })}
              />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface LaneProps {
  label: string;
  soundName: string;
  volume: number;
  onVolume: (v: number) => void;
  onGear: () => void;
  volumeLabel: string;
  gearLabel: string;
}

function Lane({ label, soundName, volume, onVolume, onGear, volumeLabel, gearLabel }: LaneProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold">{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={gearLabel}
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={onGear}
        >
          <Icon name="settings" className="size-5 text-muted-foreground" />
        </Pressable>
      </View>
      <Text variant="muted" className="text-xs">
        {soundName}
      </Text>
      <VolumeSlider value={volume} onChange={onVolume} accessibilityLabel={volumeLabel} />
    </View>
  );
}

interface PickerProps {
  items: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function Picker({ items, selectedId, onSelect }: PickerProps) {
  return (
    <View className="gap-1 rounded-xl border border-border p-2">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => onSelect(item.id)}
            className={cn(
              "flex-row items-center justify-between rounded-lg px-3 py-2",
              active ? "bg-aqua/10" : "bg-transparent",
            )}
          >
            <Text className={cn("text-sm", active && "font-semibold text-aqua")}>{item.label}</Text>
            {active ? <Icon name="check" className="size-4 text-aqua" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
```

> Verify icon names against `src/components/react-native-reusables/icon`: `close` and `check` are used elsewhere in this codebase (`help-sheet` uses `close`; the habits list uses `check`). Confirm `settings` exists; if not, substitute an existing gear/settings/tune icon and note it. Do not invent a name.

- [ ] **Step 2: Component test**

`src/features/breathing/sounds-sheet.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react-native";

import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateUserPreferences: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

describe("SoundsSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders both lanes with their volume sliders", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    expect(screen.getByLabelText("Breath volume")).toBeTruthy();
    expect(screen.getByLabelText("Ambient volume")).toBeTruthy();
  });

  it("opens the breath picker and selects a sound, writing prefs", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    fireEvent.press(screen.getByLabelText("Choose a breath sound"));
    fireEvent.press(screen.getByText("Ocean swell"));
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].breathSoundId).toBe("ocean-swell");
  });
});
```

(The asserted English strings come from Task 8's i18n keys — add them before running this test.)

- [ ] **Step 3: Run** (after Task 8) → `npx jest src/features/breathing/sounds-sheet.test.tsx` → PASS; `npx tsc --noEmit` clean; eslint clean. Do NOT commit.

---

## Task 7: Runner wiring — speaker button + audio

**Files:** Modify `app/(app)/tools/breathing/[slug].tsx`

- [ ] **Step 1: Imports**

Add to the runner's imports:

```tsx
import { Pressable } from "react-native";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { useBreathingAudio } from "@/src/features/breathing/use-breathing-audio";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUserPreferences } from "@/src/features/settings/queries";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
```

(`View`, `ScrollView`, `Text`, etc. are already imported. If `Pressable` is already imported via `react-native`, merge it into the existing import rather than duplicating.)

- [ ] **Step 2: Read prefs + drive audio**

Inside `BreathingExerciseScreen`, after the existing `saveMutation` line, add:

```tsx
const { data: prefs } = useUserPreferences(user?.id ?? null);
const audioPrefs = mergeUserPreferences(prefs, {});
const [soundsOpen, setSoundsOpen] = useState(false);

useBreathingAudio({
  active: screenPhase === "active",
  phaseLabel: currentPhase?.label ?? null,
  breathSoundId: audioPrefs.breathSoundId,
  ambientSoundId: audioPrefs.ambientSoundId,
  breathVolume: audioPrefs.breathVolume,
  ambientVolume: audioPrefs.ambientVolume,
});
```

- [ ] **Step 3: Add the speaker button + sheet**

In the header `View` (the one wrapping `<ScreenHeader title={title} />`), change it to include a speaker button on the right and render the sheet. Replace:

```tsx
<View className="gap-2">
  <ScreenHeader title={title} />
  {description ? <Text variant="muted">{description}</Text> : null}
</View>
```

with:

```tsx
          <View className="gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1">
                <ScreenHeader title={title} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("breathing.sounds.open")}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setSoundsOpen(true)}
                className="p-2"
              >
                <Icon name="volume-up" className="size-6 text-muted-foreground" />
              </Pressable>
            </View>
            {description ? <Text variant="muted">{description}</Text> : null}
          </View>

          <SoundsSheet visible={soundsOpen} onDismiss={() => setSoundsOpen(false)} />
```

> Verify `volume-up` exists in the icon set; if not, substitute an existing sound/speaker icon (e.g. `music-note`, `graphic-eq`) and note it. Do not invent a name.

- [ ] **Step 4: Update the runner test mock**

`src/features/breathing/breathing-runner.test.tsx` now indirectly renders `SoundsSheet` (via the speaker button's sibling) and calls `useUserPreferences` + `useBreathingAudio`. Add mocks so the existing three assertions still pass:

```tsx
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateUserPreferences: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("@/src/features/breathing/use-breathing-audio", () => ({
  useBreathingAudio: () => {},
}));
```

(The `SoundsSheet` itself renders fine with `data: undefined` since it uses `mergeUserPreferences`; no further mock needed. If the runner test imports a session mock already, leave it.)

- [ ] **Step 5: Run + lint** → `npx jest src/features/breathing` → PASS; `npx tsc --noEmit` clean; `npx eslint "app/(app)/tools/breathing/[slug].tsx"` clean. Do NOT commit.

---

## Task 8: i18n keys

**Files:** Modify `src/i18n/locales/en/cbt.json` (the `breathing` object)

- [ ] **Step 1: Add the `sounds` block**

Inside the `"breathing"` object, add:

```json
    "sounds": {
      "title": "Sounds",
      "open": "Sounds",
      "close": "Close",
      "breathLabel": "Breath",
      "ambientLabel": "Ambient",
      "breathVolume": "Breath volume",
      "ambientVolume": "Ambient volume",
      "pickBreath": "Choose a breath sound",
      "pickAmbient": "Choose an ambient sound",
      "none": "None",
      "breath": {
        "soft": "Soft breath",
        "ocean": "Ocean swell",
        "wind": "Wind"
      },
      "ambient": {
        "rain": "Rain",
        "forest": "Forest",
        "night": "Night",
        "brown": "Brown noise"
      }
    },
```

- [ ] **Step 2: Validate JSON** → `node -e "require('./src/i18n/locales/en/cbt.json'); console.log('ok')"` → `ok`. Do NOT commit.

---

## Final Verification

- [ ] **Run the gate** → `npm run verify` → exit 0 (lint, format, typecheck, tests, coverage ratchet). If `format:check` fails, `npx prettier --write` the changed files and re-run. If coverage dropped, add a case to a pure-module test (`breath-audio-plan`, the prefs round-trip).

- [ ] **Manual smoke (report only, no commit)**

Confirm by reading code: speaker button opens the sheet; picking a breath/ambient sound writes prefs; sliders adjust volume; on the active screen `useBreathingAudio` receives `active=true` + the current phase; both lanes default to `none` (silent) so a fresh install plays nothing until the user chooses; audio is best-effort (try/catch) and never throws into the session.

- [ ] **Hand off** — do NOT commit/stage. Report results + remind the user to (a) apply migration `20260573`, and (b) supply real loop-friendly audio files to replace the `bell.wav` placeholders in `src/constants/breathing-sounds.ts` and flip the default `breathSoundId` from `none` to `soft-breath` once they exist.

---

## Self-Review notes (applied)

- **Spec coverage:** sound catalog (§6) ✓; audio controller mirroring timer-widget, two lanes, breath inhale/exhale pair, ambient continuous (§5) ✓; loop playback (§5) ✓; Sounds sheet with two sliders + gear pickers on the runner, global prefs (§11) ✓; 4 optional `user_preferences` columns + `omitOptionalPreferenceColumns` fallback (§7.2) ✓; `none` valid for either lane, holds silent (§5) ✓. Fade is implemented as immediate volume set on clip swap (a documented simplification — `expo-av` has no native fade; the ~150ms ramp from §5 is approximated by the loop seam + start-at-volume; if true fades are wanted later, ramp `setVolume` over a few frames).
- **Type consistency:** `BreathSound`/`AmbientSound` shared by catalog, planner, controller, sheet. `UserPreferences` audio fields flow type → row → map → payload → fallback and into `SoundsSheet`/runner via `mergeUserPreferences`. `breathClipFor(label, sound)` signature matches the controller call.
- **No placeholders (code):** all files complete. Audio asset FILES are the one documented external dependency (§4), wired to `bell.wav` until supplied.
- **Soft spots flagged for the implementer:** icon names (`settings`, `volume-up`, `close`, `check`), which jest `Platform.OS` path the audio hook takes, and the Task 6/8 i18n ordering.

```

```
