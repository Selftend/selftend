// Bundled breathing audio catalog. Breath sounds come in two flavours:
//   - "guided" voice cues - short clips (inhale/hold/exhale) cut from one recording, fired
//     ONCE at the start of each phase (loop: false).
//   - looped textures (soft-breath/ocean/wind) - seamless clips the runner loops to fill the
//     whole inhale/exhale; their holds are silent (no holdAsset).
// Ambient is a single seamless looping clip. `none` keeps a lane silent. The picker shows
// these; only the selected id is persisted in user_preferences.
//
// The textured .wav files are synthesized by scripts/generate-breathing-sounds.py; the
// guide_*.wav cues were cut from a provided recording. Swap in your own files with the same
// filenames (no change needed here).
const softBreathInhale = require("@/assets/sounds/breathing/soft-breath_inhale.wav") as number;
const softBreathExhale = require("@/assets/sounds/breathing/soft-breath_exhale.wav") as number;
const oceanInhale = require("@/assets/sounds/breathing/ocean-swell_inhale.wav") as number;
const oceanExhale = require("@/assets/sounds/breathing/ocean-swell_exhale.wav") as number;
const windInhale = require("@/assets/sounds/breathing/wind_inhale.wav") as number;
const windExhale = require("@/assets/sounds/breathing/wind_exhale.wav") as number;
const rain = require("@/assets/sounds/breathing/rain.wav") as number;
const forest = require("@/assets/sounds/breathing/forest.wav") as number;
const night = require("@/assets/sounds/breathing/night.wav") as number;
const brownNoise = require("@/assets/sounds/breathing/brown-noise.wav") as number;
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

export interface AmbientSound {
  id: string;
  labelKey: string;
  asset: number | null;
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
  {
    id: "soft-breath",
    labelKey: "breathing.sounds.breath.soft",
    inhaleAsset: softBreathInhale,
    exhaleAsset: softBreathExhale,
  },
  {
    id: "ocean-swell",
    labelKey: "breathing.sounds.breath.ocean",
    inhaleAsset: oceanInhale,
    exhaleAsset: oceanExhale,
  },
  {
    id: "wind",
    labelKey: "breathing.sounds.breath.wind",
    inhaleAsset: windInhale,
    exhaleAsset: windExhale,
  },
];

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "none", labelKey: "breathing.sounds.none", asset: null },
  { id: "rain", labelKey: "breathing.sounds.ambient.rain", asset: rain },
  { id: "forest", labelKey: "breathing.sounds.ambient.forest", asset: forest },
  { id: "night", labelKey: "breathing.sounds.ambient.night", asset: night },
  { id: "brown-noise", labelKey: "breathing.sounds.ambient.brown", asset: brownNoise },
];

export const breathSoundLookup: Record<string, BreathSound> = Object.fromEntries(
  BREATH_SOUNDS.map((s) => [s.id, s]),
);
export const ambientSoundLookup: Record<string, AmbientSound> = Object.fromEntries(
  AMBIENT_SOUNDS.map((s) => [s.id, s]),
);
