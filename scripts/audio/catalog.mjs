/**
 * The audio render catalog — every clip the map decided on, as data.
 *
 * This file is the executable form of the decisions made across the audio
 * replacement map (#1130). Nothing here is a fresh judgement; each field cites
 * the ticket that fixed it. If you disagree with a value, the argument belongs
 * on that ticket, not in this file.
 *
 *   #1133  everything comes from ElevenLabs, English only, one pass
 *   #1134  the palette, the must-not list, the per-clip prompts, candidate counts
 *   #1136  two voices, the cue wording
 *   #1137  five beds at 30s, three textures at 10s, textures never loop
 *   #1138  format and loudness targets
 *   #1139  bell loudness targets
 *   #1141  Creator plan, so 48kHz is the reachable lossless master
 *
 * Sound Effects is non-deterministic and has no seed: these prompts are the
 * only reproducible thing about the render. Treat them as the source.
 */

/** #1134 §2 — pasted verbatim into every Sound Effects prompt. */
export const PALETTE =
  "Close and dry, as if recorded in a small soft room. No reverb, no echo, no large or cathedral space. Dark and warm in tone, with no bright or glassy high end. Very low noise floor. No music and no melody.";

/** #1134 §3 — appended to every non-voice prompt. */
export const MUST_NOT =
  "No sudden or startling attack. No melody and no discernible pitch movement. No recognisable music. No speech, singing, or speech-like sounds. No sudden discrete events. No silence at the beginning or end. No wide stereo effects.";

/**
 * Compose a Sound Effects prompt the way #1134 §6 specifies: the per-clip text
 * "used as-is with §2 and §3 appended".
 */
export function composePrompt(clipText) {
  return [clipText, PALETTE, MUST_NOT].join(" ");
}

/**
 * ☠️ Textures render non-looping even though they are steady loops.
 *
 * #1134 §4 originally said `loop: true` for textures. Two later decisions
 * overtook it: #1137 established that textures never actually loop at runtime
 * (at 10s they outlast the longest phase they must cover — the 8s 4-7-8 exhale
 * — so they play once, start to finish), and #1138 made the non-looping render
 * the default path for everything because `loop: true` and the zero-silence
 * rule are mutually exclusive on this API.
 *
 * Beds are the only class where the seam matters at all, and they too render
 * non-looping and get folded by the post-processor.
 */
const LOOP = false;

/** #1141 — Creator's best lossless SFX master. `pcm_44100` would need Pro. */
export const SFX_OUTPUT_FORMAT = "pcm_48000";

/** #1134 §6 — the docs still recommend this for narration quality. */
export const TTS_MODEL = "eleven_multilingual_v2";
export const SFX_MODEL = "eleven_text_to_sound_v2";

/** 40 credits/second when duration is explicit (#1134 §4). */
export const CREDITS_PER_SECOND = 40;

export const BELLS = [
  {
    id: "meditation-bell",
    klass: "bells",
    round: "A",
    durationSeconds: 7,
    promptInfluence: 0.6,
    loop: LOOP,
    candidates: 5,
    // #1139: the shared start/end bell. Renders at 7s and is trimmed by ear at
    // the gate — final length is a listening judgement, not a fixed number.
    loudnessTarget: "-20 LUFS-I, <= -3 dBTP",
    text: "A single struck bronze meditation bowl, one strike only, with a soft padded mallet. A warm low fundamental with no bright metallic clang. The strike is gentle — the sound emerges rather than cracks. A long, smooth decay that fades continuously to silence over about six seconds and never swells, pulses, or blooms again after the initial strike. One strike and nothing else: no second strike, no handling noise, no room tone.",
  },
  {
    id: "interval-temple-block",
    klass: "bells",
    round: "A",
    durationSeconds: 2,
    promptInfluence: 0.6,
    loop: LOOP,
    candidates: 5,
    loudnessTarget: "-23 LUFS-I, <= -3 dBTP",
    text: "A single soft wooden temple block, struck once with a padded beater. A hollow, muted, woody knock with a short natural decay under one second. No pitch, no ring, no metallic character, no sharp click on the attack. Gentle — a quiet marker, not an alert. One strike only.",
  },
];

export const BEDS = [
  {
    id: "rain",
    text: "Steady, even rainfall on soft ground, heard from indoors through a closed window. Continuous and unchanging in intensity for the full thirty seconds. No thunder, no wind, no gusts, no dripping from a gutter, no individual loud drops, no traffic, no voices.",
  },
  {
    id: "forest",
    // #1134: forest loses its birds. A recurring call is the loudest possible
    // advertisement that the user is hearing a loop. Keeps its id and label
    // (#1137) so no preference is stranded and no new Weblate string is needed.
    text: "A quiet forest interior: a continuous soft rustle of leaves in a gentle, even breeze, unchanging for the full thirty seconds. No birdsong and no bird calls of any kind. No animals, no insects, no footsteps, no cracking branches, no wind gusts, no rain.",
  },
  {
    id: "night",
    text: "A warm summer night heard from indoors: a low continuous blended chorus of distant crickets over soft dark air, unchanging for the full thirty seconds. No single insect audible above the others, no owls, no dogs, no traffic, no wind, no voices.",
  },
  {
    id: "brown-noise",
    // ⚠️ #1134 flagged this as the one clip a generative model is a strictly
    // worse tool for — brown noise is deterministic, free and inherently
    // seamless in eight lines of the existing script. #1133 stands, but if any
    // bed fails the gate this is the obvious single-class reopen.
    text: "Smooth, deep brown noise. A continuous low rumble with no texture, no events, no modulation and no variation of any kind for the full thirty seconds. Not white noise and not pink noise — deep and dark, with the high frequencies rolled away.",
  },
  {
    id: "ocean",
    // ⚠️ DRAFT — NOT YET APPROVED BY THE OWNER.
    //
    // #1137 added this bed after #1134 had written the per-clip briefs, so it
    // is the one clip on the map with no prompt text decided for it. #1137 gave
    // direction only: the bed is "wide and distant, with no discrete breaking
    // events", deliberately separated *by distance in the prompt* from the
    // close, dry `ocean-swell` texture so the two can be selected together and
    // read as depth rather than as one ocean glitching over another.
    //
    // Written here in the house style so Round B is runnable; it must be
    // signed off before the render pass spends credits on it.
    draft: true,
    text: "A wide, distant expanse of open sea heard from far away, a continuous even wash of water held at one constant level for the full thirty seconds. No individual waves breaking, no surf on sand, no swell rising or falling, no gulls, no wind, no voices, no boats.",
  },
].map((bed) => ({
  ...bed,
  klass: "beds",
  round: "B",
  durationSeconds: 30, // the API maximum (#1134); 3.75x today's repeat period
  promptInfluence: 0.6,
  loop: LOOP,
  candidates: 3,
  loudnessTarget: "-20 LUFS-I, <= -3 dBTP",
}));

/**
 * Inhale and exhale stay separate files. They differ in pitch today
 * (soft-breath is 196 Hz vs 147 Hz) and that step at the phase boundary is the
 * *only* audible signal of a phase change in the texture lane — #1134 keeps it
 * deliberately: inhale slightly higher and brighter, exhale lower and darker.
 */
const TEXTURE_FAMILIES = [
  {
    id: "soft-breath",
    inhale:
      "A steady, continuous stream of soft warm air, as through slightly parted lips, held at one constant intensity for the whole duration. This is a sustained texture, not a breath being taken — no rise, no fall, no swell, no beginning and no end. No voice, no vocal character, no sighing.",
    exhaleModifier: "Lower, darker and warmer in tone.",
  },
  {
    id: "ocean-swell",
    // Close and dry, at the ear — the near half of the pair whose far half is
    // the `ocean` bed above. Separation is by distance, not by name (#1137).
    inhale:
      "A continuous even wash of surf on sand, held at one constant level. No individual waves breaking, no swell rising or falling, no gulls, no wind, no voices. A sustained band of water noise, unchanging for the whole duration.",
    exhaleModifier: "Lower and darker.",
  },
  {
    id: "wind",
    // ⚠️ The shipped `wind` is gusty by design
    // (generate-breathing-sounds.py:122-124). Removing gusts is deliberate: any
    // recurring event is heard several times per phase.
    inhale:
      "Steady wind moving through open space at one constant intensity. No gusts, no whistling, no rattling, no leaves, no rain, no debris. A smooth continuous band of air, unchanging for the whole duration.",
    exhaleModifier: "Lower and darker.",
  },
];

export const TEXTURES = TEXTURE_FAMILIES.flatMap((family) => [
  { id: `${family.id}_inhale`, text: family.inhale },
  // #1134 writes the exhale as "as above, with <modifier>". The API needs
  // literal text, so the modifier is appended rather than left as a reference.
  { id: `${family.id}_exhale`, text: `${family.inhale} ${family.exhaleModifier}` },
]).map((texture) => ({
  ...texture,
  klass: "textures",
  round: "B",
  // #1137 lengthened textures from #1134's 3.4s to 10s — long enough to outlast
  // the longest phase they must cover (the 8s 4-7-8 exhale), which is why they
  // never loop and why seam quality stops mattering for this lane entirely.
  durationSeconds: 10,
  promptInfluence: 0.3, // the default; creative variety is fine for a texture
  loop: LOOP,
  candidates: 2,
  loudnessTarget: "-20 LUFS-I, <= -3 dBTP",
}));

/**
 * #1136 — two voices on a gender axis, 8 clips. The female voice keeps the id
 * `guided` because an unrecognised breath_sound_id fails twice over (silence,
 * *and* the sheet displays "None") and shipped store clients live forever, so
 * the male voice is purely additive and there is no migration.
 *
 * Voice ids are deliberately empty: #1136 routed the actual pick to the render
 * session on stated criteria — Voice Library only (defaults expire
 * 2026-12-31), a matched pair, auditioned on the shipping words rather than on
 * the library's demo reel. Fill these in at Round B.
 */
export const VOICES = [
  { id: "guided", axis: "female", voiceId: null },
  { id: "guided-male", axis: "male", voiceId: null },
];

/**
 * ⚠️ The intro wording is the second undecided piece of content on this map.
 * #1136 fixed the three cues and left the intro as "wording TBD at render".
 */
export const VOICE_CUES = [
  { id: "guide_inhale", text: "Breathe in" },
  { id: "guide_hold", text: "Hold" }, // holdOut reuses this — confirmed, not deferred
  { id: "guide_exhale", text: "Breathe out" },
  { id: "guide_intro", text: null, draft: true },
];

/** #1134 §6 — unhurried, low, warm; falling intonation; no performance. */
export const TTS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};

export const SFX_CLIPS = [...BELLS, ...BEDS, ...TEXTURES];

export function clipsForRound(round) {
  return SFX_CLIPS.filter((clip) => clip.round === round);
}

/** Total Sound Effects seconds, which is what the credit cost is priced on. */
export function creditEstimate(clips) {
  const seconds = clips.reduce((total, clip) => total + clip.durationSeconds * clip.candidates, 0);
  return { seconds, credits: seconds * CREDITS_PER_SECOND };
}
