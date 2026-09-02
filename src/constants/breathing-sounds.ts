// Bundled breathing audio catalog. Two independent lanes:
//   - BREATH: fires with the inhale/hold/exhale phases. Two guided voices on a gender
//     axis (#1136), each one clip per phase, fired once. `none` keeps the lane silent.
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
// ✅ Nothing here is a placeholder any more. The voice cues were the last, and they are
// ElevenLabs TTS as of 2026-08-30 — so every sound the app plays is the replacement set.
// ⚠️ Voice masters are mp3, not WAV: lossless TTS output is rejected on the Creator plan.
// Tolerable only because TTS is re-renderable from a seed, unlike a Sound Effects bed.
const rain = require("@/assets/sounds/breathing/rain.m4a") as number;
const forest = require("@/assets/sounds/breathing/forest.m4a") as number;
const night = require("@/assets/sounds/breathing/night.m4a") as number;
const ocean = require("@/assets/sounds/breathing/ocean.m4a") as number;
const stream = require("@/assets/sounds/breathing/stream.m4a") as number;
const fire = require("@/assets/sounds/breathing/fire.m4a") as number;
const brownNoise = require("@/assets/sounds/breathing/brown-noise.m4a") as number;
const whiteNoise = require("@/assets/sounds/breathing/white-noise.m4a") as number;
const pinkNoise = require("@/assets/sounds/breathing/pink-noise.m4a") as number;
// Guided voice cues — ElevenLabs TTS, one clip per phase, fired once (not looped).
// Two voices on a gender axis (#1136); the female keeps the bare `guided` id because
// an unrecognised breath_sound_id fails twice over and shipped clients live forever.
//
// ☠️☠️ #1580: THESE TWO VOICES WERE TRANSPOSED AND SHIPPED THAT WAY. Until
// 2026-08-31 `guide_*.guided.m4a` held "Adam" (male) while the picker row above it
// reads "Водещ глас (жена)" / the female label, and `guide_*.guided-male.m4a` held
// "Carla" (female). Anyone who picked the female voice heard a man. Confirmed twice
// — by ear on the audition, and by ElevenLabs' own `gender` label on each voice —
// then fixed by swapping the FILE CONTENTS, so no stored `breath_sound_id` moved and
// no require path changed.
//
// ⚠️ WHICH MEANS THE FILENAMES ARE UNCHANGED AND THE AUDIO IS NOT. A diff of that
// commit shows eight binary files touched and nothing else explaining it; the
// provenance lives in `scripts/audio/catalog.mjs`'s VOICES table, which was swapped
// in the same change so the ids still say truthfully who speaks each file.
const guidedInhale = require("@/assets/sounds/breathing/guide_inhale.guided.m4a") as number;
const guidedHold = require("@/assets/sounds/breathing/guide_hold.guided.m4a") as number;
const guidedExhale = require("@/assets/sounds/breathing/guide_exhale.guided.m4a") as number;
const guidedIntro = require("@/assets/sounds/breathing/guide_intro.guided.m4a") as number;
const maleInhale = require("@/assets/sounds/breathing/guide_inhale.guided-male.m4a") as number;
const maleHold = require("@/assets/sounds/breathing/guide_hold.guided-male.m4a") as number;
const maleExhale = require("@/assets/sounds/breathing/guide_exhale.guided-male.m4a") as number;
const maleIntro = require("@/assets/sounds/breathing/guide_intro.guided-male.m4a") as number;

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
 *
 * ⚠️ Documentation, not the mechanism. `resolveBreathSoundId` below is keyed on the
 * CATALOG, so these resolve to `none` because they are absent from it, not because they
 * are listed here — the next retirement needs no entry added to keep working (#1745).
 */
export const RETIRED_BREATH_SOUND_IDS = ["soft-breath", "ocean-swell", "wind"] as const;

export const BREATH_SOUNDS: BreathSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", inhaleAsset: null, exhaleAsset: null },
  {
    id: "guided",
    labelKey: "breathing.sounds.breath.guided",
    inhaleAsset: guidedInhale,
    exhaleAsset: guidedExhale,
    holdAsset: guidedHold,
    loop: false,
    introAsset: guidedIntro,
    // ☠️ MEASURED, never estimated (#1136). A hardcoded 3300 once cut an intro off
    // more than a second early. Each voice carries its own, read off the SHIPPED
    // file with ffprobe.
    //
    // ☠️ #1580 SWAPPED THE TWO VOICES ON 2026-08-31 AND THESE TWO NUMBERS SWAPPED
    // WITH THEM. `guided` used to be 2662 because it used to hold Adam's take; it
    // now holds Carla's, measured at 4557. If either voice is ever re-rendered or
    // reassigned, re-measure — do not carry a number across a voice change.
    introMs: 4557,
  },
  {
    // ⚠️ ADDED 2026-08-30, and it was already paid for. #1136 decided two voices
    // and `shippingUnits()` has always counted EIGHT voice files, but the app
    // wired only four — the male half was rendered, budgeted and never reachable.
    // Purely additive: no stored preference has to move.
    id: "guided-male",
    labelKey: "breathing.sounds.breath.guidedMale",
    inhaleAsset: maleInhale,
    exhaleAsset: maleExhale,
    holdAsset: maleHold,
    loop: false,
    introAsset: maleIntro,
    // Measured off the shipped file after #1580's swap (was 4557 when this row
    // held Carla's take).
    introMs: 2662,
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

/**
 * Resolve a stored breath id to one the catalog has: anything absent lands on `none`.
 *
 * Applied ONCE, where the preferences row is mapped (`settings/repository.ts`), so every
 * consumer holds a lookup-able id and none re-handles the miss on its own (#1745). Before
 * that, the runner and the sheet each resolved and the session screen did not, so the
 * next retirement re-opened the gap on whichever surface had been skipped.
 *
 * ☠️ Membership is tested against the catalog list, never with `in` or an index read on
 * the lookup: `"constructor"` is a hit on any plain object, and a stored id is free text.
 */
export function resolveBreathSoundId(id: string): string {
  return BREATH_SOUNDS.some((s) => s.id === id) ? id : "none";
}

/** The ambient-lane twin of `resolveBreathSoundId`: a bed the catalog lacks is `none`. */
export function resolveAmbientSoundId(id: string): string {
  return AMBIENT_SOUNDS.some((s) => s.id === id) ? id : "none";
}
