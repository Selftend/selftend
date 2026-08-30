// Bundled breathing audio catalog. Two independent lanes:
//   - BREATH: fires with the inhale/hold/exhale phases. Only the "guided" voice cue remains
//     (loop: false — one clip per phase). `none` keeps the lane silent.
//   - AMBIENT: one seamless looping bed that plays underneath, unrelated to phase.
//
// ☠️ THE BREATH-TEXTURE LANE IS GONE (owner, 2026-08-30). `soft-breath`, `ocean-swell` and
// `wind` were looped textures swapped on each breath phase. The owner auditioned the
// replacement round and asked for background beds ONLY — "no inhale/exhale specific
// noises" — even though the rendered `ocean-swell` was judged good on its own terms. The
// LANE went, not the takes' quality. See RETIRED_BREATH_SOUND_IDS below for what happens
// to anyone who had one selected.
//
// The beds are `.m4a` and no longer synthesized by scripts/generate-breathing-sounds.py.
// They come from three sources, all catalogued in scripts/audio/catalog.mjs (#1130):
//   rain, forest, night        — ElevenLabs Sound Effects
//   ocean, stream, fire        — the ElevenLabs Explore library (free download)
//   brown/white/pink noise     — computed by scripts/audio/synth-noise.mjs
//
// ⚠️ guide_*.wav are still the ORIGINAL placeholders. The voice half of #1130 is blocked
// on choosing a Voice Library voice, so `guided` alone has not been replaced yet.
const rain = require("@/assets/sounds/breathing/rain.m4a") as number;
const forest = require("@/assets/sounds/breathing/forest.m4a") as number;
const night = require("@/assets/sounds/breathing/night.m4a") as number;
const ocean = require("@/assets/sounds/breathing/ocean.m4a") as number;
const stream = require("@/assets/sounds/breathing/stream.m4a") as number;
const fire = require("@/assets/sounds/breathing/fire.m4a") as number;
const brownNoise = require("@/assets/sounds/breathing/brown-noise.m4a") as number;
const whiteNoise = require("@/assets/sounds/breathing/white-noise.m4a") as number;
const pinkNoise = require("@/assets/sounds/breathing/pink-noise.m4a") as number;
// Guided voice cues (cut from a single recording) - one-shot per phase, not looped.
const guideInhale = require("@/assets/sounds/breathing/guide_inhale.wav") as number;
const guideHold = require("@/assets/sounds/breathing/guide_hold.wav") as number;
const guideExhale = require("@/assets/sounds/breathing/guide_exhale.wav") as number;
const guideIntro = require("@/assets/sounds/breathing/guide_intro.wav") as number;

export interface BreathSound {
  id: string;
  labelKey: string;
  inhaleAsset: number | null;
  exhaleAsset: number | null;
  // Played at the start of hold phases. Only set for one-shot "cue" sounds (voice guides).
  holdAsset?: number | null;
  // false = play the clip once at the start of each phase (a cue); default/true = loop the
  // clip to fill the whole phase (an ambient breath texture).
  loop?: boolean;
  // Optional spoken intro played once before the sequence starts (guided voice only).
  introAsset?: number | null;
  // How long to hold on the "get ready" preroll while the intro plays, in ms.
  introMs?: number;
}

interface AmbientSound {
  id: string;
  labelKey: string;
  asset: number | null;
}

/**
 * Breath ids that no longer exist, and what an account holding one now gets.
 *
 * ☠️ These are PERSISTED in `user_preferences.breath_sound_id`, so removing the lane does
 * not remove the stored value — anyone who picked one still has it in the database and
 * shipped store clients live forever. Without this map the id simply misses every lookup,
 * which fails twice over: the runner plays silence AND the sheet shows "None" while the
 * database says "wind", so the picker disagrees with the record behind it.
 *
 * `none` is the honest destination. The lane is gone, so there is no equivalent to migrate
 * to — a bed is not a breath texture — and silently reassigning someone to `guided` would
 * start talking to them, which is worse than going quiet.
 */
export const RETIRED_BREATH_SOUND_IDS = ["soft-breath", "ocean-swell", "wind"] as const;

/** Resolve a stored breath id, mapping retired ones to `none` rather than to nothing. */
export function resolveBreathSoundId(id: string): string {
  return (RETIRED_BREATH_SOUND_IDS as readonly string[]).includes(id) ? "none" : id;
}

export const BREATH_SOUNDS: BreathSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", inhaleAsset: null, exhaleAsset: null },
  {
    id: "guided",
    labelKey: "breathing.sounds.breath.guided",
    inhaleAsset: guideInhale,
    exhaleAsset: guideExhale,
    holdAsset: guideHold,
    loop: false,
    introAsset: guideIntro,
    introMs: 3300,
  },
];

/**
 * Nine beds, ordered water → land → noise so the picker reads as a list rather than a heap.
 *
 * ⚠️ `fire` is deliberately ~8 dB quieter than the rest. It measures a 35.6 dB crest, so
 * reaching the others' -28 LUFS target would take limiting heavy enough to flatten the
 * crackle into noise; it ships at its own honest -36 instead (#1130).
 */
export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", asset: null },
  { id: "rain", labelKey: "breathing.sounds.ambient.rain", asset: rain },
  { id: "ocean", labelKey: "breathing.sounds.ambient.ocean", asset: ocean },
  { id: "stream", labelKey: "breathing.sounds.ambient.stream", asset: stream },
  { id: "forest", labelKey: "breathing.sounds.ambient.forest", asset: forest },
  { id: "night", labelKey: "breathing.sounds.ambient.night", asset: night },
  { id: "fire", labelKey: "breathing.sounds.ambient.fire", asset: fire },
  { id: "brown-noise", labelKey: "breathing.sounds.ambient.brown", asset: brownNoise },
  { id: "pink-noise", labelKey: "breathing.sounds.ambient.pink", asset: pinkNoise },
  { id: "white-noise", labelKey: "breathing.sounds.ambient.white", asset: whiteNoise },
];

export const breathSoundLookup: Record<string, BreathSound> = Object.fromEntries(
  BREATH_SOUNDS.map((s) => [s.id, s]),
);
export const ambientSoundLookup: Record<string, AmbientSound> = Object.fromEntries(
  AMBIENT_SOUNDS.map((s) => [s.id, s]),
);
