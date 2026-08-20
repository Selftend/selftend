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

/**
 * ☠️ #1134 §2 (palette) and §3 (must-not) CANNOT be used as written.
 *
 * Sound Effects rejects any prompt over 450 characters, server-side — it binds
 * the API and the web UI identically. The two blocks together are 434
 * characters, 96% of the budget, leaving 16 for the sound itself. Every one of
 * the thirteen clips composed to 634-859 and was refused.
 *
 * The reasoning in §2 survives: sixteen independently-prompted clips from a
 * non-deterministic model really would arrive as a stock-library grab-bag. Only
 * the mechanism changes — the shared identity is carried in 176 characters
 * instead of 434. Most of what was cut was redundant either with itself ("no
 * reverb, no echo, no large or cathedral space" is one constraint stated three
 * times) or with the per-clip texts, which already list their own exclusions.
 *
 * Recorded on #1134.
 */
export const SHARED_TAIL =
  "Close, dry, small soft room. No reverb. Dark and warm, no glassy highs. Very low noise floor. No music, no speech. No sudden events. No silence at start or end. No wide stereo.";

/** The hard cap the API enforces. */
export const MAX_PROMPT_CHARS = 450;

/**
 * Compose a Sound Effects prompt. Throws rather than letting an over-long
 * prompt reach the API, so the cap is caught by `plan` and by tests instead of
 * by a failed generation.
 */
export function composePrompt(clipText) {
  const composed = `${clipText} ${SHARED_TAIL}`;
  if (composed.length > MAX_PROMPT_CHARS) {
    throw new Error(
      `prompt is ${composed.length} chars, over the ${MAX_PROMPT_CHARS} limit: ${clipText.slice(0, 60)}...`,
    );
  }
  return composed;
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

/**
 * ☠️ MEASURED at ~3.3 credits/second, not the 40/sec #1134 costed everything at.
 * The composer prices 2.0s at 7 credits and 7.0s at 23. That makes the whole
 * pass ~2,000 credits rather than ~24,600. Recorded on #1159.
 */
export const CREDITS_PER_SECOND = 3.3;

/**
 * The finished-file spec, fixed by #1138 and amended for the bells by #1139.
 *
 * The post-processor (`postprocess.mjs`) is the only consumer. `loudnessTarget`
 * on each clip is *derived* from this via `loudnessLabel()`, so the human-readable
 * string in `plan` output and the number the pipeline actually normalises to can
 * never drift apart.
 *
 * ☠️ A downmix is a REQUIRED step, not an option: #1159 found Sound Effects
 * returns STEREO, while #1138 planned mono for bells, textures and voice and
 * sized the whole bundle on mono sources.
 */
export const TRUE_PEAK_CEILING_DBTP = -3;
export const OUTPUT_SAMPLE_RATE = 44100; // #1138: 44.1k throughout — TTS cannot exceed it
export const AAC_ENCODER = "aac"; // pinned: ffmpeg's native encoder, what #1138 measured with

/**
 * ☠️ The fold TRIMS. `seamless(sig, n, cf)` in generate-breathing-sounds.py folds
 * `sig[n..n+cf]` into the head, and the generator makes `n + cf` samples on purpose
 * (8.4s kept as 8.0s). A rendered bed has no spare tail — Sound Effects caps at 30s
 * — so the fold takes the last `cf` from inside the clip and the loop comes out
 * `cf` shorter: a 30s render becomes a 29.6s bed. Nothing requires exactly 30s.
 */
export const BED_FOLD_SECONDS = 0.4; // CF in generate-breathing-sounds.py:154

const CLASS_OUTPUT = {
  beds: { channels: 2, bitrate: "128k", lufs: -20 },
  textures: { channels: 1, bitrate: "96k", lufs: -20 },
  voice: { channels: 1, bitrate: "64k", lufs: -16 },
};

/** The `-20 LUFS-I, <= -3 dBTP` string `plan` prints, built from the numbers. */
export function loudnessLabel(lufs) {
  return `${lufs} LUFS-I, <= ${TRUE_PEAK_CEILING_DBTP} dBTP`;
}

/** Bells are per-clip, not per-class: #1139 split the shared bell from the interval one. */
const BELL_OUTPUT = {
  "meditation-bell": { channels: 1, bitrate: "128k", lufs: -20 },
  "interval-temple-block": { channels: 1, bitrate: "128k", lufs: -23 },
};

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
    text: "A single struck bronze meditation bowl, one gentle strike with a soft padded mallet. Warm low fundamental, no bright metallic clang. A long smooth decay fading continuously to silence over about six seconds, never swelling again. No second strike, no handling noise.",
  },
  {
    id: "interval-temple-block",
    klass: "bells",
    round: "A",
    durationSeconds: 2,
    promptInfluence: 0.6,
    loop: LOOP,
    candidates: 5,
    text: "A single soft wooden temple block, struck once with a padded beater. A hollow, muted, woody knock with a short natural decay under one second. No pitch, no ring, no metallic character, no sharp click on the attack. Gentle — a quiet marker, not an alert. One strike only.",
  },
].map((bell) => ({
  ...bell,
  output: BELL_OUTPUT[bell.id],
  loudnessTarget: loudnessLabel(BELL_OUTPUT[bell.id].lufs),
}));

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
    // ☠️ #1137 separated this bed from the `ocean-swell` texture "by distance in
    // the prompt" — bed wide and distant, texture close. That mechanism does not
    // exist: SHARED_TAIL is appended to *every* SFX prompt, beds included, and it
    // opens "Close, dry, small soft room. No reverb." A distant bed contradicts
    // its own tail. #1137 checked the texture side of the palette and not the bed
    // side; the other four beds are all framed as interiors ("through a closed
    // window", "forest interior", "indoors") precisely because they were written
    // under that palette. Settled on #1262.
    //
    // So the two ocean clips separate by CONTENT, both inside the same close, dry
    // room: this bed is open water with no shoreline at all, while the texture is
    // surf on sand at the ear. The shoreline ban is the fence — "no surf on sand"
    // alone let the model drift into the texture's territory.
    //
    // ⚠️ Swell is still barred, and not only for #1137's loop-tell reason: the
    // seam gate measures short-time energy delta across the wrap, SFX is
    // non-deterministic so a swell cannot be phase-aligned to 30s, and a
    // mid-cycle swell at the wrap fails that check by construction.
    //
    // ⚠️ Open risk, deliberately deferred to the audition (#1262): stripped of
    // distance, breaking, swell and sand, this may be indistinguishable from
    // `brown-noise` — the very redundancy that got a warm drone rejected in
    // #1137. Three candidates cost ~297 credits, so the call is made by ear.
    text: "A deep, continuous body of open water, a smooth even wash held at one constant level for the full thirty seconds. No shoreline, no sand, no surf, no waves breaking, no swell rising or falling, no gulls, no wind, no voices, no boats.",
  },
].map((bed) => ({
  ...bed,
  klass: "beds",
  round: "B",
  durationSeconds: 30, // the API maximum (#1134); 3.75x today's repeat period
  promptInfluence: 0.6,
  loop: LOOP,
  candidates: 3,
  output: CLASS_OUTPUT.beds,
  loudnessTarget: loudnessLabel(CLASS_OUTPUT.beds.lufs),
  // The only class the fold applies to — and the only one whose seam is gated.
  foldSeconds: BED_FOLD_SECONDS,
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
      "A steady continuous stream of soft warm air, as through slightly parted lips, held at one constant intensity throughout. A sustained texture, not a breath being taken: no rise, no fall. No voice, no sighing.",
    exhaleModifier: "Lower, darker and warmer.",
  },
  {
    id: "ocean-swell",
    // The shoreline half of the ocean pair whose open-water half is the `ocean`
    // bed above. ☠️ #1137 said the separation was by distance; #1262 found that
    // distance is unavailable (SHARED_TAIL forces every clip close and dry) and
    // moved it to content. Surf on sand is what this clip owns, and what the bed
    // is now explicitly forbidden. Still not by name (#1137) — renaming costs a
    // Weblate string in en and bg and disguises the pairing rather than fixing it.
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
  output: CLASS_OUTPUT.textures,
  loudnessTarget: loudnessLabel(CLASS_OUTPUT.textures.lufs),
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
 * #1136 fixed the three phase cues; #1264 fixed the intro, the last undecided
 * piece of copy on the map.
 *
 * ☠️ The intro must not say "get ready": the preroll screen is ALREADY showing
 * `breathing.getReady` ("Get ready…") in 28px in a polite live region while this
 * clip plays. And ☠️ that preroll exists ONLY because this clip exists —
 * `handleStart` (app/(app)/tools/breathing/session.tsx) enters the preroll solely
 * when `introAsset` is set, so every other breath sound starts instantly and
 * `breathing.getReady` is reachable no other way.
 *
 * So the intro earns its ~3s by doing what the screen cannot: people breathe with
 * their eyes closed, which makes audio the only live channel. It stays
 * pattern-agnostic (one clip serves 4-7-8, box and coherent alike) and carries no
 * coach framing — no "I", no "we", no claimed outcome.
 *
 * ⚠️ Both voices say the SAME script. Different wording would give a user a
 * *content* reason to prefer one voice, contradicting #1136's framing of the pair
 * as a pure gender axis.
 *
 * ⚠️ `introMs` is then set from the RENDERED clip's own header, never from this
 * text (#1136 corrected #1134 on exactly this). Today's clip measures 3.08s
 * against `introMs: 3300` — that 220ms of slop goes; the 1000ms
 * POST_INTRO_PAUSE_MS settling beat after it stays, deliberately.
 */
export const VOICE_CUES = [
  { id: "guide_inhale", text: "Breathe in" },
  { id: "guide_hold", text: "Hold" }, // holdOut reuses this — confirmed, not deferred
  { id: "guide_exhale", text: "Breathe out" },
  { id: "guide_intro", text: "Find a comfortable position, and let your shoulders soften." },
];

/** #1134 §6 — unhurried, low, warm; falling intonation; no performance. */
export const TTS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};

export const SFX_CLIPS = [...BELLS, ...BEDS, ...TEXTURES];

/**
 * Every clip the post-processor can be asked about, keyed by id — the thirteen
 * sound effects plus the four voice cues. Voice cues carry no prompt-side fields
 * (no duration, no candidates); they exist here only so `postprocess` can look up
 * the channels, bitrate and loudness target a `guide_*` file has to hit.
 */
export const OUTPUT_CLIPS = new Map([
  ...SFX_CLIPS.map((clip) => [clip.id, clip]),
  ...VOICE_CUES.map((cue) => [
    cue.id,
    {
      ...cue,
      klass: "voice",
      output: CLASS_OUTPUT.voice,
      loudnessTarget: loudnessLabel(CLASS_OUTPUT.voice.lufs),
    },
  ]),
]);

/**
 * The finished-file spec for one clip id. Throws on an unknown id rather than
 * quietly defaulting — encoding a bed at the voice bitrate would be silent damage
 * to an unrepeatable master.
 */
export function outputSpecFor(clipId) {
  const clip = OUTPUT_CLIPS.get(clipId);
  if (!clip) {
    throw new Error(
      `unknown clip id "${clipId}" — expected one of: ${[...OUTPUT_CLIPS.keys()].join(", ")}`,
    );
  }
  return { ...clip.output, klass: clip.klass, foldSeconds: clip.foldSeconds ?? null };
}

export function clipsForRound(round) {
  return SFX_CLIPS.filter((clip) => clip.round === round);
}

/** Total Sound Effects seconds, which is what the credit cost is priced on. */
export function creditEstimate(clips) {
  const seconds = clips.reduce((total, clip) => total + clip.durationSeconds * clip.candidates, 0);
  return { seconds, credits: seconds * CREDITS_PER_SECOND };
}
