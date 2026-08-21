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
 *
 * ☠️ REWRITTEN AGAIN on #1316, because the compressed version silenced the
 * render. Negation suppresses output level in Sound Effects and it compounds:
 * the `night` prompt measured -47.4 dBTP peak with the old tail and -4.7 with no
 * tail, and "No sudden events." alone cost ~17 dB. Twenty of Round B's 27
 * masters were unusable.
 *
 * What survives is the half that measured HARMLESS — the tone sentence, at -5.4
 * with the body. What goes is the pile-up: "Very low noise floor. No music, no
 * speech. No sudden events. No silence at start or end. No wide stereo."
 *
 * The zero-silence rule (#1134) is not dropped, only re-phrased positively as
 * "Begins immediately and holds to the very end." Two negations survive inside
 * the tone sentence on purpose — a couple are fine, and that exact sentence was
 * measured clean. It is the pile-up of six or eight that kills the output.
 *
 * ⚠️ Round A's bells were rendered under the OLD tail and are not re-rendered;
 * their manifest rows record what was actually sent.
 */
export const SHARED_TAIL =
  "Close, dry, small soft room. No reverb. Dark and warm, no glassy highs. Begins immediately and holds to the very end.";

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
 * ☠️ WHETHER A CLIP RENDERS `loop: true` IS PER-CLASS. It used to be one module
 * constant shared by all thirteen, which made #1347's ruling look like a
 * one-character edit that would in fact have flipped two classes nobody asked
 * about.
 *
 * **Beds loop (#1347, wired by #1359).** #1138 made the non-looping render the
 * default for everything on the belief — inherited from #1131 — that `loop: true`
 * forces MP3 and so collides with #1134's zero-leading-silence rule. That belief
 * is false: probed live, loop mode is accepted with lossless `pcm_48000` on
 * Creator, honours 30s exactly, returns zero lead and zero tail, and costs no
 * premium. And it genuinely loops. `brown-noise` at 30s scored a **0.67x** wrap
 * step against its own paired `loop: false` control's **14.34x** — both
 * scale-invariant ratios, so the level gap between two seedless draws cannot
 * explain it — and beat the folded path's best-ever 2.85x by four times.
 *
 * **Bells do not.** They are one-shots: a struck bowl and a struck block, each
 * rendered to decay into silence. Looping one is meaningless.
 *
 * **Textures do not.** #1134 §4 originally said `loop: true` for textures and
 * #1137 overtook it: at 10s a texture outlasts the longest phase it must cover
 * (the 8s 4-7-8 exhale), so it plays once, start to finish, and never loops at
 * runtime at all. ⚠️ It would also be actively wrong here — loop mode rounds a
 * returned duration UP to the next 0.75s multiple (1s -> 1.5s, 2s -> 2.25s), so a
 * 10s texture would come back 10.5s. Beds are untouched only because 30 = 40 x
 * 0.75 exactly. `loopReturnedSeconds` in loop-probe.mjs is that arithmetic, and
 * test/audio-native-loop.test.ts holds every looping clip to a length loop mode
 * honours.
 */
export const CLASS_LOOP = {
  bells: false,
  beds: true,
  textures: false,
};

/**
 * Creator's lossless SFX master.
 *
 * ☠️ #1141 said `pcm_44100` "would need Pro". It does not — probed live on
 * 2026-08-21, it returns 176,400 bytes for 1s (44100 x 2ch x 16-bit) on this
 * Creator key. 48k is kept regardless: a higher-rate master is the better
 * archive, the ship rate is 44.1k either way (#1138), and `postprocess.mjs`
 * already resamples. Recording it so the Pro question stays closed.
 */
export const SFX_OUTPUT_FORMAT = "pcm_48000";

/**
 * ☠️ `pcm_*` output is RAW — no RIFF header, no container, nothing telling a
 * decoder how to read it. `render` writes it straight to `.pcm`, so `ffmpeg -i`
 * fails with "Invalid data found when processing input" and every downstream
 * tool needs these parameters supplied by hand.
 *
 * 16-bit little-endian at the format's rate, and STEREO — #1159 found Sound
 * Effects returns two channels whatever the prompt asks for, re-confirmed by
 * live probe on 2026-08-21 (192,000 bytes for 1s at 48k = 48000 x 2 x 2).
 */
export const SFX_MASTER_PCM = { codec: "s16le", sampleRate: 48000, channels: 2 };

/** #1134 §6 — the docs still recommend this for narration quality. */
export const TTS_MODEL = "eleven_multilingual_v2";

/**
 * #1141: WAV output needs Pro, so the eight voice cues were costed as
 * `mp3_44100_192` on Creator. #1210 left it conditional on #1159's probe. Rather
 * than hard-code the pessimistic answer, `render-voices` ASKS: it tries the
 * lossless format first and falls back on rejection, recording which one each
 * clip actually used in the manifest.
 *
 * A lossy voice master is the one place that is tolerable, and only because TTS
 * is RE-RENDERABLE — it takes a seed and the Voice Library voice persists — where
 * a lossy Sound Effects master would be a permanent defect.
 */
export const TTS_OUTPUT_FORMATS = ["wav_44100", "mp3_44100_192"];

/**
 * Two candidates per cue per voice (#1210). TTS honours a seed, so each candidate
 * gets a fixed one: the pass becomes reproducible, which is exactly what the
 * thirteen Sound Effects clips can never be.
 */
export const TTS_CANDIDATE_SEEDS = [1130, 1210];
export const SFX_MODEL = "eleven_text_to_sound_v2";

/**
 * ☠️☠️ 11 CREDITS/SECOND ON THE API — NOT the 3.3 this file carried, and not the
 * 40/sec #1134 costed everything at.
 *
 * Measured twice against the live `character-cost` response header, which is
 * exact and immediate: **330 credits for 30s, 22 for 2s**. The 3.3 was real but
 * came from watching the WEB COMPOSER price a generation (#1159: 7 credits for
 * 2.0s, 23 for 7.0s) — and the composer prices differently from the API. Nothing
 * ever checked the two against each other, so every quote this tooling printed
 * was understated 3.3x: Round B's pre-`--go` message said 1,881 best / 7,524
 * worst where the truth is ~6,270 / ~25,080. #1320's whole point is that the
 * worst case must be on screen BEFORE the irreversible spend, and a third of the
 * real number is not that. Corrected on #1347, wired by #1359.
 *
 * ⚠️ This constant is a QUOTE, used before a call. What a call actually cost
 * comes back on the response — see `chargedCredits` in loop-probe.mjs. Prefer the
 * header wherever cost is reported after the fact; never the balance delta, which
 * lags (it did not move at all across a 22-credit call).
 */
export const CREDITS_PER_SECOND = 11;

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
 * How long a fold is WHEN ONE RUNS. ⚠️ Since #1359 a fold is no longer the bed
 * path — it is the seam-gate fallback, reached by `postprocess run --fold`.
 *
 * ☠️ The fold TRIMS, which is why it is not free and why it stopped being
 * automatic. `seamless(sig, n, cf)` in generate-breathing-sounds.py folds
 * `sig[n..n+cf]` into the head, and the generator makes `n + cf` samples on purpose
 * (8.4s kept as 8.0s). A rendered bed has no spare tail — Sound Effects caps at 30s
 * — so the fold takes the last `cf` from inside the clip and the loop comes out
 * `cf` shorter: a 30s render becomes a 29.6s bed, and dips -0.20 to -4.87 dB at
 * every loop point. A natively looping bed ships the full **30.0s** with neither.
 *
 * ⚠️ It is NOT deleted. #1347 could not clear the TONAL case — all three `night`
 * draws landed under #1320's usable gate, and of the two carrying signal the join
 * was fine but the head/tail energy ratio failed. Loop mode gives a clean join
 * without guaranteeing one level end to end. So the seam gate runs on every bed
 * however it was rendered, and a bed that fails it can still be folded.
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
    loop: CLASS_LOOP.bells,
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
    loop: CLASS_LOOP.bells,
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
    // #1316: positive rewrite. "blended into one smooth texture" is what the old
    // "no individual loud drops, no dripping from a gutter" was reaching for.
    text: "Steady, even rainfall on soft ground, heard from indoors through a closed window. A dense continuous wash of countless fine drops blended into one smooth texture, held at exactly the same level from beginning to end.",
  },
  {
    id: "forest",
    // #1134: forest loses its birds. A recurring call is the loudest possible
    // advertisement that the user is hearing a loop. Keeps its id and label
    // (#1137) so no preference is stranded and no new Weblate string is needed.
    // ☠️ #1316 RE-CONCEPTED this one, not just re-worded it. Measured over three
    // takes each, positive phrasing moved `night` +22.6 dB and `wind` +15.6 dB
    // but `forest` not at all (-22.0 -> -23.0), and its eventfulness stayed near
    // 10 in every take — sparse discrete rustles with gaps, never a continuous
    // bed. "Leaves rustling in a breeze" is an EVENT the model renders sparsely.
    // So the same feeling is asked for as a texture it can sustain: many leaves
    // at once, close and dense, none individually distinguishable. That phrasing
    // also retires the birds without naming them.
    text: "A dense continuous wash of many leaves moving at once in a steady breeze, heard close. Countless leaves blended into one smooth unbroken texture in which no single leaf is distinguishable, held at exactly the same level from beginning to end.",
  },
  {
    id: "night",
    // #1316: +22.6 dB median over three takes against the old wording. "Evenly
    // blended" carries what "no single insect audible above the others" meant.
    text: "A warm summer night heard from indoors. A low, continuous, evenly blended chorus of distant crickets over soft dark air, one steady unbroken texture held at exactly the same level from beginning to end.",
  },
  {
    id: "brown-noise",
    // ⚠️ #1134 flagged this as the one clip a generative model is a strictly
    // worse tool for — brown noise is deterministic, free and inherently
    // seamless in eight lines of the existing script. #1133 stands, but if any
    // bed fails the gate this is the obvious single-class reopen.
    // #1316: this one always rendered (0.0 dBFS, full scale) — its concept is
    // strong enough that the negations never mattered. Rewritten anyway so the
    // set is prompted one consistent way.
    text: "Smooth, deep brown noise: a continuous low rumble, dark and heavy, with the high frequencies rolled away. One steady unbroken texture held at exactly the same level from beginning to end.",
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
    // ⚠️ #1316 keeps ONE exclusion here on purpose. #1262's separation from the
    // `ocean-swell` texture IS the shoreline, so it cannot be dropped — but the
    // rest of the old list goes, since the pile-up is what silences. Positive
    // description plus at most one essential exclusion is the rule.
    text: "The deep body of open water heard as one smooth even wash of moving water, a steady unbroken texture held at exactly the same level from beginning to end. Open sea only, with no shoreline in it.",
  },
].map((bed) => ({
  ...bed,
  klass: "beds",
  round: "B",
  durationSeconds: 30, // the API maximum (#1134); 3.75x today's repeat period
  promptInfluence: 0.6,
  loop: CLASS_LOOP.beds,
  candidates: 3,
  output: CLASS_OUTPUT.beds,
  loudnessTarget: loudnessLabel(CLASS_OUTPUT.beds.lufs),
  // The only class whose seam is gated, and the only one the fold can apply to.
  // ⚠️ Carrying a fold length is no longer the same as folding: since #1359 this
  // is the length available to the fallback, and `foldPlan` decides whether it
  // runs. A bed rendered `loop: true` ships unfolded unless its seam gate fails.
  foldSeconds: BED_FOLD_SECONDS,
}));

/**
 * ☠️ #1316: the exhale modifier says "pitched ... in tone, at exactly the same
 * level" rather than the old bare "Lower and darker." #1134 meant that as PITCH
 * and TIMBRE - the only audible signal of a phase change in the texture lane -
 * but a generative model can read "lower" as lower VOLUME, and `wind_exhale` was
 * the last clip in the set still measuring BROKEN after everything else had been
 * fixed. Saying which axis is meant costs nothing.
 *
 * Inhale and exhale stay separate files. They differ in pitch today
 * (soft-breath is 196 Hz vs 147 Hz) and that step at the phase boundary is the
 * *only* audible signal of a phase change in the texture lane — #1134 keeps it
 * deliberately: inhale slightly higher and brighter, exhale lower and darker.
 */
const TEXTURE_FAMILIES = [
  {
    id: "soft-breath",
    inhale:
      "A steady continuous stream of soft warm air, as through slightly parted lips, one even unbroken texture held at exactly the same intensity from beginning to end. A sustained sound rather than a breath being taken.",
    exhaleModifier: "Pitched a little lower, darker and warmer in tone, at exactly the same level.",
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
      "A continuous even wash of surf on sand, close at the ear, one steady unbroken band of water noise held at exactly the same level from beginning to end.",
    exhaleModifier: "Pitched a little lower and darker in tone, at exactly the same level.",
  },
  {
    id: "wind",
    // ⚠️ The shipped `wind` is gusty by design
    // (generate-breathing-sounds.py:122-124). Removing gusts is deliberate: any
    // recurring event is heard several times per phase.
    // ☠️ #1316 RE-CONCEPTED, like `forest`. Positive rewriting alone was not
    // enough: six takes of the reworded version still measured -22 to -28 dBTP,
    // BROKEN on every one. "Wind" is rendered as sparse gusts however it is
    // phrased. What the preflight shows working across the whole set is DENSE,
    // CONTINUOUS, CLOSE material - brown noise, the water washes, forest once it
    // became a wash of many leaves - and `soft-breath_inhale`, which is already
    // wind at close range and renders fine. So this asks for that instead.
    inhale:
      "A broad, dense rush of moving air heard close, like a steady draught through a doorway, blended into one smooth unbroken texture held at exactly the same level from beginning to end.",
    exhaleModifier: "Pitched a little lower and darker in tone, at exactly the same level.",
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
  loop: CLASS_LOOP.textures,
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
  return {
    ...clip.output,
    klass: clip.klass,
    foldSeconds: clip.foldSeconds ?? null,
    // ⚠️ How the master was RENDERED, which since #1359 is what decides whether the
    // post-processor folds it. Voice cues carry no prompt-side fields at all, so
    // the absent flag means the same thing as a false one: this was not looped.
    loop: clip.loop ?? false,
  };
}

export function clipsForRound(round) {
  return SFX_CLIPS.filter((clip) => clip.round === round);
}

/** Total Sound Effects seconds, which is what the credit cost is priced on. */
export function creditEstimate(clips) {
  const seconds = clips.reduce((total, clip) => total + clip.durationSeconds * clip.candidates, 0);
  return { seconds, credits: seconds * CREDITS_PER_SECOND };
}
