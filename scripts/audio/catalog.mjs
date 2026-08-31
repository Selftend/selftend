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
 * with the body. What went was the pile-up: "Very low noise floor. No music, no
 * speech. No sudden events. No silence at start or end. No wide stereo."
 *
 * The zero-silence rule (#1134) is not dropped, only re-phrased positively as
 * "Begins immediately and holds to the very end." Two negations survive inside
 * the tone sentence on purpose — a couple are fine, and that exact sentence was
 * measured clean. It is the pile-up of six or eight that kills the output.
 *
 * ⚠️ Round A's bells were rendered under the OLD tail and are not re-rendered;
 * their manifest rows record what was actually sent.
 *
 * ☠️☠️ "Very low noise floor." WAS TRIED AGAIN ON 2026-08-30 AND MEASURED AGAIN.
 * IT SILENCES THE RENDER. DO NOT REACH FOR IT A THIRD TIME.
 *
 * The owner auditioned the rendered set and rejected `night` and `ocean` for
 * audible hiss while calling `rain` and `forest` good. Since #1316 had removed
 * the whole block, nothing was asking for a quiet background any more — and the
 * clause is the one in that block phrased POSITIVELY, so it looked like collateral
 * damage rather than a cause. It is a cause.
 *
 * Added to `night`'s clip text alone and preflighted: **-44.11 and -29.85 dBTP**,
 * against -3.98 for `forest` in the same run. #1316 had already measured this
 * exact clip at **-47.4 with the old tail and -4.7 without it** — so this is that
 * measurement reproduced, and the mechanism is not negation-specific. Reverted.
 *
 * 📌 The hiss is therefore NOT a prompting problem. It is what the model returns,
 * and the place to address it is post-processing (a denoise pass over a
 * stationary bed is cheap, deterministic and reversible) or acceptance — never
 * another wording attempt at this clause.
 *
 * ☠️ AND IF SOMETHING IS EVER ADDED HERE: `planSlot` keys the resume on PROMPT
 * EQUALITY, and this tail is appended to every clip, so editing it supersedes
 * every accepted take in the round at once. With `rain` c2 and `forest` c1
 * already chosen, a tail edit re-rolls both — spending credits to replace takes
 * already judged good, which a seedless API cannot give back. Per-clip text is
 * the only safe place to iterate once any take is chosen.
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
 * 0.75 exactly. `loopReturnedSeconds` in loop-probe.mjs is that arithmetic;
 * test/audio-native-loop.test.ts holds every looping clip's `durationSeconds` to a
 * length loop mode honours, and the two paths that ask for a duration of their own
 * — `preflight` and `loopprobe --seconds` — go through the same arithmetic rather
 * than assuming the catalog's number.
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
 * #1141: WAV output needs Pro, so the voice cues were costed as
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
 * comes back on the response — see `chargedCredits` in credits.mjs. Prefer the
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

/**
 * The peak the bed limiter works to, in linear amplitude (0.7 ~ -3.1 dBFS).
 *
 * Gentle on purpose. The job is to take the tops off the occasional crackle or
 * wave so the gain that follows can reach the target, NOT to compress the bed
 * into a flat wall — that would remove the very movement that makes ambience
 * sound alive, which is the whole reason the synthesised beds were rejected.
 */
export const BED_LIMITER_PEAK = 0.6;

const CLASS_OUTPUT = {
  // ☠️ 96k, not #1138's 128k. The 2026-08-29 bed request takes the set from five
  // beds to nine, and nine 30s beds at 128k are 4.12 MiB on their own — over the
  // 4 MiB ceiling before a single bell or voice cue is counted. 96k puts the whole
  // set at ~3.23 MiB with room left for the voice half.
  //
  // The quality cost is small for this class specifically: every bed is noise or
  // ambience, continuous by construction and with no transients — the material
  // AAC codes most efficiently and where a listener has least to miss. Owner
  // decision, 2026-08-29, made against the measured numbers rather than as a
  // default. ⚠️ Bells stay at 128k: a struck bowl IS a transient.
  // ☠️☠️ -28 AND LIMITED, NOT -20 WITH PURE GAIN. #1138 chose -20 under a -3 dBTP
  // ceiling and explicitly refused a limiter, so that normalisation stayed one
  // exact arithmetic gain. For a bell that is right. For ambience it is
  // unreachable, and this was established from three independent directions on
  // 2026-08-30 rather than argued:
  //
  //   · 36 ElevenLabs generations of `ocean`/`stream`/`fire` — every one rejected
  //     `ceiling-bound` or `clipped`, 13,530 credits.
  //   · SIX human-vetted sounds from the Explore library, one with 183 downloads
  //     — crest 17.9, 20.0, 20.3, 20.5, 33.7, 35.6 dB against a 17 dB budget.
  //     Every one over.
  //   · Synthesis, which met the spec and did not sound like the thing.
  //
  // Real ambience has a high crest factor: it is quiet on average with occasional
  // peaks, and that IS the sound. A target that forbids it forbids the material.
  // So beds move to -28 with a gentle limiter ahead of the gain — the one class
  // where a limiter is the correct tool rather than a compromise.
  //
  // ⚠️ Beds are now deliberately QUIETER than the other classes (bells -20/-23,
  // voice -16). That is the right order for a background layer under a spoken cue.
  // Owner approved 2026-08-30 after auditioning all six candidates.
  beds: { channels: 2, bitrate: "96k", lufs: -28, limit: true },
  textures: { channels: 1, bitrate: "96k", lufs: -20 },
  // ☠️ -18, NOT #1138's -16, and it is what the material can actually reach.
  // Measured across all eight rendered cues (2026-08-30), the loudest each could
  // be gained to under the -3 dBTP ceiling: -16.25, -15.97, -16.59, -16.00,
  // -17.16, -16.01. Speech has a high crest, so -16 left several capped and the
  // set spanning 1.2 LU for no reason anyone chose.
  //
  // ⚠️ A LIMITER IS NOT THE ANSWER HERE, unlike beds. Tried and measured: it
  // reintroduced 4.94ms of LEAD SILENCE on five of the eight, because alimiter's
  // lookahead pads the head — and #1134 makes zero leading silence a hard rule
  // precisely for these clips, since a cue fires on a phase boundary that is
  // already up to 250ms late. Harmless on a bed, disqualifying on a cue.
  voice: { channels: 1, bitrate: "64k", lufs: -18 },
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
    //
    // ☠️ "over soft dark air" REMOVED 2026-08-30, and it was asking for the very
    // thing the owner rejected. All three takes came back with audible hiss; an
    // "air tone" under the crickets IS broadband hiss, so the prompt was ordering
    // it. Asking for a low noise floor was tried first and SILENCED the clip
    // (-44 dBTP — see the SHARED_TAIL docblock), which is what sent the search
    // back to the clip's own words.
    //
    // The one exclusion this clip is allowed now spends itself on that air tone
    // rather than on insect behaviour, which "evenly blended" already covers.
    // ⚠️ Unverified by ear at the time of writing: it is a reasoned change, not a
    // measured one, and the audition is what settles it.
    text: "A warm summer night heard from indoors. A low, continuous, evenly blended chorus of distant crickets, one steady unbroken texture held at exactly the same level from beginning to end. Crickets only, with no air tone under them.",
  },
  {
    id: "brown-noise",
    // ☠️ SYNTHESISED SINCE 2026-08-29, and the comment below called it. #1134
    // flagged this as "the obvious single-class reopen" if any bed failed the
    // gate — and Round B returned all three takes HARD-CLIPPED at 0.0 dBTP with
    // thousands of samples pinned at full scale, which the old floor-only gate
    // graded `ok`. The reopen condition was met, so the class moved.
    //
    // White and pink joined it for the same reason plus a second one: SHARED_TAIL
    // opens "Dark and warm, no glassy highs", which a bright noise contradicts by
    // definition. There is no prompt that asks for white noise under that tail —
    // the same shape of conflict #1262 found between the `ocean` bed and its
    // distance, and unlike that one it cannot be resolved by rewording, because
    // brightness IS the spec. Deterministic DSP has no such problem: it is exact,
    // seamless, free, and costs no credits.
    source: "synth",
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
    // ☠️ SYNTHESISED SINCE 2026-08-30, AFTER 12 REJECTED TAKES.
    // `ocean` was rendered three candidates deep with the full four-attempt
    // re-roll and produced ZERO usable takes - every one `ceiling-bound` or
    // `clipped`. Across `ocean`, `stream` and `fire` that was 36 for 36 and
    // 13,530 credits. The fault is structural, not unlucky: breaking waves are DISCRETE
    // EVENTS, so the model returns peaks towering over the average, and no such
    // take can be gained to -20 LUFS under a -3 dBTP ceiling whatever the wording.
    //
    // `synth-noise.mjs` sets the event density as a number instead of asking for
    // it, which is the one lever the prompt route never had. ⚠️ The prompt below
    // is kept as the record of what was asked for and what came back; nothing
    // reads it any more.
    // ☠️ FROM THE ELEVENLABS **EXPLORE LIBRARY**, not generated and not computed.
    // Owner-approved 2026-08-30 after auditioning six candidates.
    //
    // Two earlier routes failed this slot. The API produced 12 takes and zero
    // usable ones (20.0 dB crest here is why — see CLASS_OUTPUT.beds), and
    // synthesis met the spec but the owner's verdict was "nothing like" the real
    // thing. 📌 Filtered noise imitates a SPECTRUM; it does not imitate a place.
    //
    // Chosen because the owner rejected every generated take with "the waves are too frequent", and this one's own description promises "wave intensity remains consistent with no sudden crashes or strong surges".
    //
    // ⚠️ Library downloads cost NO credits and arrive as 30s looping WAV at 48 kHz,
    // which is exactly SFX_MASTER_PCM — so the file drops into the same pipeline
    // with no special case. Browse: elevenlabs.io/app/sound-effects?loop=true&q=...
    source: "library",
    /** The file as downloaded, kept so the master can be traced to its origin. */
    libraryFile: "AMBSea-A_long,_uninterrupte-Elevenlabs.wav",
    libraryDescription:
      "A long, uninterrupted nighttime ocean waves ambience recorded from inside a quiet luxury hotel room near the shore",
    libraryDownloads: 115,
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
    // ☠️ THIS COMMENT USED TO SAY "SWELL IS STILL BARRED" AND THE PROMPT DID NOT
    // BAR IT. #1316 cut the exclusion list down to one and took the swell ban out
    // with it, leaving the claim behind — so the file asserted a constraint it had
    // stopped carrying. The owner then auditioned the result and reported exactly
    // the thing the vanished clause forbade: "the waves are too frequent".
    //
    // The reason swell must not be there is unchanged and worth keeping: the seam
    // gate measures short-time energy delta across the wrap, SFX is
    // non-deterministic so a swell cannot be phase-aligned to 30s, and a mid-cycle
    // swell at the wrap fails that check by construction.
    //
    // ⚠️ Open risk, deliberately deferred to the audition (#1262): stripped of
    // distance, breaking, swell and sand, this may be indistinguishable from
    // `brown-noise` — the very redundancy that got a warm drone rejected in
    // #1137. Three candidates cost ~297 credits, so the call is made by ear.
    // ⚠️ #1316 keeps ONE exclusion here, and 2026-08-30 MOVED WHICH ONE.
    //
    // It used to be the shoreline, because #1262 needed a fence between this bed
    // and the `ocean-swell` TEXTURE — "so it cannot be dropped", said the note
    // that stood here. That texture was retired the same day the owner asked for
    // background beds only, so the fence now guards nothing at all, while the
    // clause the set actually needed had been dropped two rounds earlier.
    //
    // So the single slot is spent on swell instead. Still one exclusion, still
    // positive-description-first — the rule is unchanged, only its target moved.
    // 📌 The general lesson: an exclusion that exists to separate two clips dies
    // with the clip it was separating from. Re-check the fences after a retirement.
    // ☠️ "Very low noise floor." added 2026-08-30: the owner rejected all three
    // takes as noisy — "none, all noisy". Per-clip rather than in SHARED_TAIL for
    // the resume reason in that docblock. ⚠️ This clip already carried an open
    // risk of being indistinguishable from `brown-noise`; if the quieter draw
    // lands there, `ocean` is the bed to reconsider rather than to re-roll again.
    text: "The deep body of open water heard as one smooth even wash of moving water, a steady unbroken texture held at exactly the same level from beginning to end. One unchanging wash only, with no swell rising or falling in it.",
  },
  {
    id: "stream",
    // ☠️ SYNTHESISED SINCE 2026-08-30, AFTER 12 REJECTED TAKES.
    // `stream` was rendered three candidates deep with the full four-attempt
    // re-roll and produced ZERO usable takes - every one `ceiling-bound` or
    // `clipped`. Across `ocean`, `stream` and `fire` that was 36 for 36 and
    // 13,530 credits. The fault is structural, not unlucky: splashes over stones are DISCRETE
    // EVENTS, so the model returns peaks towering over the average, and no such
    // take can be gained to -20 LUFS under a -3 dBTP ceiling whatever the wording.
    //
    // `synth-noise.mjs` sets the event density as a number instead of asking for
    // it, which is the one lever the prompt route never had. ⚠️ The prompt below
    // is kept as the record of what was asked for and what came back; nothing
    // reads it any more.
    // ☠️ FROM THE ELEVENLABS **EXPLORE LIBRARY**, not generated and not computed.
    // Owner-approved 2026-08-30 after auditioning six candidates.
    //
    // Two earlier routes failed this slot. The API produced 12 takes and zero
    // usable ones (17.9 dB crest here is why — see CLASS_OUTPUT.beds), and
    // synthesis met the spec but the owner's verdict was "nothing like" the real
    // thing. 📌 Filtered noise imitates a SPECTRUM; it does not imitate a place.
    //
    // Chosen because the cleanest measurement of the six candidates, and free of the birdsong that would put a recurring event in a 30-second loop.
    //
    // ⚠️ Library downloads cost NO credits and arrive as 30s looping WAV at 48 kHz,
    // which is exactly SFX_MASTER_PCM — so the file drops into the same pipeline
    // with no special case. Browse: elevenlabs.io/app/sound-effects?loop=true&q=...
    source: "library",
    /** The file as downloaded, kept so the master can be traced to its origin. */
    libraryFile: "AMBMisc-Natural_river_stream-Elevenlabs.wav",
    libraryDescription:
      "Natural river stream ambience, clear flowing water rushing over smooth stones and small boulders",
    libraryDownloads: 32,
    // Added on the owner's 2026-08-29 bed request, with `fire`. It has to be
    // fenced from both neighbours: from `rain` because both are water on a
    // surface, and from `ocean` because both are a continuous body of it. Moving
    // water over stones is what this one owns.
    //
    // ⚠️ Written against the #1130 crest finding rather than for flavour. `rain`
    // failed at spec because it rendered as sparse discrete events — a 24.6 dB
    // crest against `forest`'s 12.7 — and could not be gained to -20 LUFS under
    // the ceiling. Separate splashes are that same shape, so the one exclusion
    // this prompt is allowed spends itself there.
    text: "A small stream running over stones heard close, blended into one continuous even wash of moving water, a steady unbroken texture held at exactly the same level from beginning to end. Running water only, with no separate splashes in it.",
  },
  {
    id: "fire",
    // ☠️ SYNTHESISED SINCE 2026-08-30, AFTER 12 REJECTED TAKES.
    // `fire` was rendered three candidates deep with the full four-attempt
    // re-roll and produced ZERO usable takes - every one `ceiling-bound` or
    // `clipped`. Across `ocean`, `stream` and `fire` that was 36 for 36 and
    // 13,530 credits. The fault is structural, not unlucky: crackles are DISCRETE
    // EVENTS, so the model returns peaks towering over the average, and no such
    // take can be gained to -20 LUFS under a -3 dBTP ceiling whatever the wording.
    //
    // `synth-noise.mjs` sets the event density as a number instead of asking for
    // it, which is the one lever the prompt route never had. ⚠️ The prompt below
    // is kept as the record of what was asked for and what came back; nothing
    // reads it any more.
    // ☠️ FROM THE ELEVENLABS **EXPLORE LIBRARY**, not generated and not computed.
    // Owner-approved 2026-08-30 after auditioning six candidates.
    //
    // Two earlier routes failed this slot. The API produced 12 takes and zero
    // usable ones (35.6 dB crest here is why — see CLASS_OUTPUT.beds), and
    // synthesis met the spec but the owner's verdict was "nothing like" the real
    // thing. 📌 Filtered noise imitates a SPECTRUM; it does not imitate a place.
    //
    // Chosen because by far the most downloaded of any candidate, and "minimal crackle, very low volume" is what a bed under a meditation should be.
    //
    // ⚠️ Library downloads cost NO credits and arrive as 30s looping WAV at 48 kHz,
    // which is exactly SFX_MASTER_PCM — so the file drops into the same pipeline
    // with no special case. Browse: elevenlabs.io/app/sound-effects?loop=true&q=...
    source: "library",
    /** The file as downloaded, kept so the master can be traced to its origin. */
    output: { lufs: -36 },
    libraryFile: "FIRECrkl-Ultra-soft_small_fir-Elevenlabs.wav",
    libraryDescription:
      "Ultra-soft small fireplace fire, gentle warm crackling, very light and subtle embers",
    libraryDownloads: 183,
    // ☠️ THE RISKIEST BED IN THE SET, knowingly. A hearth fire IS crackle, and a
    // crackle is a discrete event — precisely the sparse shape that made `rain`
    // unusable at spec (#1130). So the prompt asks for the crackle to be dense
    // enough to blend into a wash, which is the same move that rescued `forest`
    // once it lost its birds (#1316).
    //
    // If it still returns `ceiling-bound` under the fixed gate, that is the gate
    // working. The answer would be a denser prompt, never a louder one — and if
    // a dense one cannot be had, fire is not a bed this palette can hold.
    text: "A hearth fire heard close, its crackle so dense that it blends into one continuous even wash, a steady unbroken texture held at exactly the same level from beginning to end. A settled fire only, with no separate pops in it.",
  },
  {
    id: "white-noise",
    source: "synth",
    text: null,
  },
  {
    id: "pink-noise",
    source: "synth",
    text: null,
  },
].map((bed) => ({
  // ☠️ THREE SOURCES NOW, and only one of them costs anything.
  //
  //   `elevenlabs` — generated by `render.mjs` against the prompt below. The
  //                 default, and the only one that spends credits.
  //   `synth`      — computed by `synth-noise.mjs`. Exact for noise whose
  //                 definition IS a spectrum: white, pink, brown.
  //   `library`    — downloaded from the ElevenLabs Explore library. Free, and
  //                 the only route that produced a convincing ocean, stream or
  //                 fire after the other two were tried and rejected.
  //
  // `SFX_CLIPS` is what keeps the non-`elevenlabs` beds out of a render; they
  // stay in `BEDS` and `SHIPPED_SFX_CLIPS` because they still ship.
  source: "elevenlabs",
  ...bed,
  klass: "beds",
  round: "B",
  durationSeconds: 30, // the API maximum (#1134); 3.75x today's repeat period
  promptInfluence: 0.6,
  loop: CLASS_LOOP.beds,
  candidates: 3,
  // ☠️ A bed MAY carry its own target, and one does. `fire` measures -34.7 LUFS
  // with a +0.88 dBTP peak — a 35.6 dB crest — so reaching the class -28 would
  // take limiting so heavy the crackle flattens into noise, which is exactly the
  // character the owner approved it for. Measured: un-limited it can only be
  // attenuated to -38.6; at the gentle 0.7 limiter it reaches -36.2; only at a
  // brutal 0.18 does it touch -28.4. So it ships at its own honest level.
  //
  // ⚠️ THE CONSEQUENCE IS AUDIBLE AND DELIBERATE: `fire` sits ~8 dB below the
  // other beds, so switching to it is a real drop in level. Accepted in exchange
  // for keeping the sound; the alternative is a squashed fire at matched level.
  output: { ...CLASS_OUTPUT.beds, ...(bed.output ?? {}) },
  loudnessTarget: loudnessLabel(bed.output?.lufs ?? CLASS_OUTPUT.beds.lufs),
  // The only class whose seam is gated, and the only one the fold can apply to.
  // ⚠️ Carrying a fold length is no longer the same as folding: since #1359 this
  // is the length available to the fallback, and `foldPlan` decides whether it
  // runs. A bed rendered `loop: true` ships unfolded unless its seam gate fails.
  foldSeconds: BED_FOLD_SECONDS,
}));

/**
 * ☠️ THE SIX BREATH TEXTURES ARE RETIRED (owner, 2026-08-30). This is where
 * `TEXTURE_FAMILIES` and `TEXTURES` used to be.
 *
 * They were the inhale/exhale-paced lane: `soft-breath`, `ocean-swell` and
 * `wind`, each split in two and swapped on the breath phase (#1134, #1137). The
 * owner auditioned the rendered set and asked for background beds ONLY — "no
 * inhale/exhale specific noises" — even though `ocean-swell_inhale` was judged
 * good on its own terms. The lane goes, not the takes' quality.
 *
 * ⚠️ IT IS ALSO LOAD-BEARING FOR THE BUNDLE. Nine beds put the set at ~3.99 MiB
 * of the 4 MiB ceiling with these six still counted; dropping them returns ~0.69
 * MiB. Re-adding a texture lane means re-checking the budget first, not after.
 *
 * `CLASS_OUTPUT.textures` and `CLASS_LOOP.textures` are deliberately KEPT: the
 * six files are still in `assets/sounds/breathing/` until the app change lands,
 * and `postprocess` must still be able to look up a spec for one.
 */
export const TEXTURES = [];

/**
 * #1136 — a gender axis per language: 2 voices x 4 cues in English, the same again
 * in Bulgarian, 16 clips. The female voice keeps the id `guided` because an
 * unrecognised breath_sound_id fails twice over (silence, *and* the sheet displays
 * "None") and shipped store clients live forever, so the male voice is purely
 * additive and there is no migration.
 *
 * ☠️ THE VOICES ARE CHOSEN (owner, 2026-08-30). #1136 routed the pick to the
 * render session on stated criteria — Voice Library only (defaults expire
 * 2026-12-31), a matched pair — and these are the two the owner picked.
 *
 * ☠️ `lang` IS LOAD-BEARING, NOT A LABEL. It is the join key {@link voiceSlotSpec}
 * pairs on, and it is the only thing standing between the render and sixteen takes
 * of a Bulgarian voice reading "Breathe in" — see that function's docblock.
 *
 * #1573 added the Bulgarian pair (#1578's spec). Both ids were confirmed live on
 * #1579 as `professional` Voice Library voices — NEITHER is a Default (defaults
 * expire 2026-12-31) — both on a 730-day notice period, and both verified for
 * Bulgarian on `eleven_multilingual_v2`, which is why one model still spans both
 * languages.
 *
 * ⚠️ These four ids are ids on the ACCOUNT'S side, not the app's. A stored
 * `user_preferences.breath_sound_id` is still only ever `guided` or `guided-male`:
 * #1573 swaps the assets underneath those two rows by app language and moves no
 * stored value. The `-bg` ids exist so the RENDER can name files apart.
 */
export const VOICES = [
  { id: "guided", axis: "female", lang: "en", voiceId: "s3TPKV1kjDlVtZbl4Ksh" },
  { id: "guided-male", axis: "male", lang: "en", voiceId: "l32B8XDoylOsZKiSdfhE" },
  // "Moonglow — Mediative and Polished" (5,414 clones, 11.8M chars/yr).
  { id: "guided-bg", axis: "female", lang: "bg", voiceId: "vnewfQdVVk9Y9DZWVRNm" },
  // ⚠️ "Yakim Petrov" — published 2026-08-27, `cloned_by_count: 0`, zero usage.
  // NO crowd signal at all, so the audition's ear is the only check this one gets.
  { id: "guided-male-bg", axis: "male", lang: "bg", voiceId: "NG3DzyUGmLkog1AFB5iv" },
];

/**
 * Swap in shortlisted voice ids for one run, without writing them here.
 *
 * ☠️ #1136's criterion contains a chicken-and-egg. The pick must be made
 * "auditioned on the shipping words, not on demo reels" — but `render-voices`
 * refuses to spend until a voiceId is in this file, so hearing a shortlisted voice
 * say the shipping words meant editing the decisions file for every trial. Each
 * abandoned trial then left a decision recorded that nobody had taken, in the one
 * file whose whole job is to hold decisions somebody did.
 *
 * An override is safe precisely because the manifest records the voiceId a take
 * was actually rendered with: `statusOfVoice` supersedes every trial take the
 * moment a different voice is written in for real, so a shortlist can never leak
 * into the winner's candidates.
 *
 * @param {{id: string, axis: string, lang: string, voiceId: string|null}[]} voices the catalog voices
 * @param {string[]} pairs `id=voiceId` strings, as passed on the command line
 * @returns {{id: string, axis: string, lang: string, voiceId: string|null}[]}
 */
export function resolveVoices(voices, pairs = []) {
  const overrides = new Map();
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    if (at < 1 || at === pair.length - 1) {
      throw new Error(`--voice-id expects id=voiceId, got "${pair}"`);
    }
    const id = pair.slice(0, at);
    if (!voices.some((voice) => voice.id === id)) {
      throw new Error(
        `unknown voice "${id}" — expected one of: ${voices.map((v) => v.id).join(", ")}`,
      );
    }
    overrides.set(id, pair.slice(at + 1));
  }

  const resolved = voices.map((voice) =>
    overrides.has(voice.id) ? { ...voice, voiceId: overrides.get(voice.id) } : voice,
  );

  // ☠️ #1136 frames the pair as a PURE GENDER AXIS. Two identical ids would render
  // eight takes of one voice and turn the matched-pair comparison into a clip
  // compared against itself — a silent way to waste a whole audition.
  //
  // ☠️☠️ THE CHECK IS PER-LANGUAGE, AND THAT IS NOT A DETAIL. A global uniqueness
  // check across all of `VOICES` would fire on #1578's own documented escape hatch:
  // language is a property of the REQUEST, not of the voice, so if a Bulgarian
  // voice fails the ear test the fallback is to hand Bulgarian text to the ENGLISH
  // pair — which makes `guided` and `guided-bg` share a voiceId legitimately. A
  // global check turns that fallback into a dead render with a message about a
  // matched pair, which is the opposite of what went wrong.
  //
  // What must stay unique is the pair WITHIN one language: that is the comparison
  // #1136 asks for, and it is still nonsense to audition a voice against itself.
  for (const lang of new Set(resolved.map((voice) => voice.lang))) {
    const ids = resolved
      .filter((voice) => voice.lang === lang)
      .map((voice) => voice.voiceId)
      .filter(Boolean);
    const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
    if (duplicate) {
      throw new Error(
        `both ${lang} voices resolve to "${duplicate}" — #1136 asks for a matched PAIR`,
      );
    }
  }
  return resolved;
}

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
 * ⚠️ Both voices OF A LANGUAGE say the SAME script. Different wording would give a
 * user a *content* reason to prefer one voice, contradicting #1136's framing of the
 * pair as a pure gender axis.
 *
 * ☠️ ACROSS languages they deliberately do NOT say the same thing — see the
 * Bulgarian block below. `lang` is what keeps the two scripts apart: it is the key
 * {@link voiceSlotSpec} joins on, and without it every voice would meet every cue
 * and a Bulgarian voice would be billed for reading "Breathe in".
 *
 * ☠️ ONE CUE ENTRY PER LANGUAGE, not a `text: {en, bg}` map. {@link OUTPUT_CLIPS} is
 * keyed by `cue.id`, so a distinct id is exactly what lets `guide_intro_bg` carry
 * its OWN loudness target instead of inheriting the English one (#1581).
 *
 * ⚠️ `introMs` is then set from the RENDERED clip's own header, never from this
 * text (#1136 corrected #1134 on exactly this). Today's clip measures 3.08s
 * against `introMs: 3300` — that 220ms of slop goes; the 1000ms
 * POST_INTRO_PAUSE_MS settling beat after it stays, deliberately. Bulgarian adds
 * two more numbers, each read off its own render and neither guessable from here.
 */
export const VOICE_CUES = [
  { id: "guide_inhale", lang: "en", text: "Breathe in" },
  // holdOut reuses this — confirmed, not deferred
  { id: "guide_hold", lang: "en", text: "Hold" },
  { id: "guide_exhale", lang: "en", text: "Breathe out" },
  {
    id: "guide_intro",
    lang: "en",
    text: "Find a comfortable position, and let your shoulders soften.",
    // ☠️ -21, three below the other cues, and that is to make it MATCH them by
    // ear rather than to make it quieter. LUFS-I integrates the whole clip, and
    // this one is a sentence with a natural pause at the comma while the others
    // are single words with none — so the pause dilutes the measurement and the
    // intro reads quieter than it sounds. Held at the same LUFS it would come
    // out audibly LOUDER than "Breathe in".
    //
    // It is also the only target both intros can reach: measured, the loudest
    // they can be gained to is -20.74 (guided) and -19.39 (guided-male).
    // ⚠️ The 3 dB is reasoned and reachable, not verified by ear.
    output: { lufs: -21 },
  },

  // -------------------------------------------------------------------------
  // Bulgarian (#1573, wording settled on #1577, render spec on #1578)
  // -------------------------------------------------------------------------
  //
  // ☠️ THE PRINCIPLE IS "THE VOICE SAYS EXACTLY WHAT THE SCREEN SAYS", and it is a
  // DELIBERATE divergence from English, which shows `Inhale` and speaks "Breathe
  // in". These four words already ship on screen — `src/i18n/locales/bg/cbt.json`
  // renders Вдишай/Задръж/Издишай in the same 28px polite live region the preroll
  // uses — so a cue plays WHILE the screen shows its word and a screen reader
  // speaks it. Do not "fix" the mismatch by reaching for a phrasal form.
  //
  // ☠️ A CUE WORD MUST BE GREPPED AGAINST THE SHIPPED `bg` STRINGS FOR ITS OWN
  // SCREEN. `Пауза` was the wording survey's joint-best hold word and is
  // disqualified: it is the Pause button's label on this very screen. A corpus
  // says a word is idiomatic; only the repo says it collides.
  { id: "guide_inhale_bg", lang: "bg", text: "Вдишай" },
  // ☠️ Same word for BOTH holds, exactly as English "Hold" is — `holdOut` reuses
  // the clip (`src/features/breathing/breath-audio-plan.ts`). The wording survey
  // found the friction attaches to the OBJECT (`дъха`/`въздуха`), not the verb, so
  // a bare imperative serves a lungs-full and a lungs-empty hold alike.
  { id: "guide_hold_bg", lang: "bg", text: "Задръж" },
  // ☠️☠️ `Вдишай` and `Издишай` STRESS THE SAME SYLLABLE and differ only in the
  // UNSTRESSED prefix `в-`/`из-`, where English puts the whole distinction on a
  // stressed word. This was accepted for screen coherence, not resolved — which
  // makes it the audition's problem: judge the pair BY EAR, back to back, under a
  // bed, at the app's loudness target, never on a clean solo render. Confusing
  // inhale for exhale is the worst failure this lane has.
  { id: "guide_exhale_bg", lang: "bg", text: "Издишай" },
  {
    id: "guide_intro_bg",
    lang: "bg",
    text: "Настани се удобно. Отпусни раменете си.",
    // ☠️☠️ NO `output.lufs` HERE YET, AND THAT IS ON PURPOSE — DO NOT INHERIT -21.
    //
    // `guide_intro`'s -21 exists to make it MATCH the single-word cues by ear:
    // LUFS-I integrates its comma pause, so at the class target it would come out
    // audibly LOUDER. For Bulgarian both inputs to that reasoning moved AT ONCE
    // and in OPPOSITE directions — this is two sentences (a full stop, a stronger
    // pause than a comma) but also shorter (38 chars against 57). The net effect
    // cannot be reasoned into place; it has to be measured off the rendered clip.
    //
    // Until then it takes the class target. `outputSpecFor` honours a per-cue
    // override with no code change (`cue.output?.lufs ?? CLASS_OUTPUT.voice.lufs`),
    // so the render session sets `output: { lufs: … }` here from its measurement.
  },
];

/** #1134 §6 — unhurried, low, warm; falling intonation; no performance. */
export const TTS_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};

/**
 * Every clip the API is asked to generate.
 *
 * ☠️ SYNTH BEDS ARE EXCLUDED HERE, and this line is the only thing that keeps
 * them out. `render`, `preflight`, `clipsForRound` and every credit estimate read
 * this list, so a synth bed that leaked in would be quoted, generated and paid
 * for — spending credits on a sound the repo can compute exactly for free. They
 * remain in {@link BEDS} and in {@link OUTPUT_CLIPS} because they still ship and
 * still need a post-processing spec; they are simply not *rendered*.
 */
export const SFX_CLIPS = [
  ...BELLS,
  ...BEDS.filter((bed) => bed.source === "elevenlabs"),
  ...TEXTURES,
];

/**
 * Every non-voice clip the app SHIPS — the superset `SFX_CLIPS` used to be.
 *
 * ☠️ THESE TWO LISTS ARE NOT THE SAME AND THE DIFFERENCE COSTS MONEY OR TRUTH.
 * `SFX_CLIPS` is what the API generates; this is what ends up in `assets/`. The
 * six non-generated beds — three computed, three from the library — sit in this
 * list only. Read the wrong one and you either quote
 * credits for a sound that is computed for free (`SFX_CLIPS` too wide) or under-
 * count the bundle by three 30s beds (this one too narrow) — the second is what
 * `shippingUnits` did the moment the synth beds appeared, reporting 2.88 MiB for
 * a set that actually weighs more.
 */
export const SHIPPED_SFX_CLIPS = [...BELLS, ...BEDS, ...TEXTURES];

/** The beds `synth-noise.mjs` owns — the complement of `SFX_CLIPS`'s filter. */
export const SYNTH_BEDS = BEDS.filter((bed) => bed.source === "synth");

/**
 * The beds downloaded from the ElevenLabs Explore library.
 *
 * ⚠️ These have no prompt and no seed, so unlike every other clip they cannot be
 * remade from anything in this repo — the WAV IS the source. Archive them with
 * the masters; a lost library file is as unrecoverable as a lost generation.
 */
export const LIBRARY_BEDS = BEDS.filter((bed) => bed.source === "library");

/**
 * Every clip the post-processor can be asked about, keyed by id — the thirteen
 * sound effects plus the eight voice cues — four English, four Bulgarian. Keying by
 * cue id alone is what keeps this list right by construction as languages are
 * added: eight cues give eight entries with no edit here, and each one can carry
 * its own loudness target. Voice cues carry no prompt-side fields
 * (no duration, no candidates); they exist here only so `postprocess` can look up
 * the channels, bitrate and loudness target a `guide_*` file has to hit.
 */
export const OUTPUT_CLIPS = new Map([
  // ☠️ BELLS + BEDS + TEXTURES, deliberately NOT `SFX_CLIPS`. Since the synth
  // beds left the render list, `SFX_CLIPS` is "what the API generates" while this
  // is "what the app ships" — and the three noise beds are in the second set but
  // not the first. Building this from `SFX_CLIPS` made `outputSpecFor` throw for
  // `white-noise`, which would have stopped the post-processor dead on a file it
  // is perfectly able to encode.
  ...SHIPPED_SFX_CLIPS.map((clip) => [clip.id, clip]),
  ...VOICE_CUES.map((cue) => [
    cue.id,
    {
      ...cue,
      klass: "voice",
      // A cue may carry its own target, and `guide_intro` does — see its entry.
      output: { ...CLASS_OUTPUT.voice, ...(cue.output ?? {}) },
      loudnessTarget: loudnessLabel(cue.output?.lufs ?? CLASS_OUTPUT.voice.lufs),
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

/**
 * The VOICE half of a round: the ALREADY-PAIRED slot list, one entry per cue per
 * voice that speaks the cue's language.
 *
 * ☠️ THIS CONDITIONAL IS WHY THE FUNCTION EXISTS. "A round is `clipsForRound`
 * plus, if it is B, the voice cues" has been re-derived by every subsystem that
 * needed it and got it wrong twice — `render` produced eleven clips of nineteen
 * and said nothing (#1317), and the audition's own `status` meter would have
 * printed "every clip has a pick" with the whole voice half untouched (#1393).
 * There is now one place that answers it, and a third consumer cannot disagree
 * with the first two.
 *
 * ☠️☠️ IT RETURNS PAIRED SLOTS, NOT TWO LISTS, AND THAT CHANGE IS THE WHOLE POINT
 * OF #1581. It used to hand back `{voices, cues}` and every consumer built the
 * cartesian product itself — `render`, `ship-plan` and `audition-plan`, three
 * copies of one line. With one language that product is correct by luck: every
 * voice does say every cue. With two it is CORRECT IN COUNT AND WRONG IN CONTENT —
 * 4 voices x 8 cues is 32 slots where 16 ship, and half of the extras are a
 * Bulgarian voice reading "Breathe in", each with a plausible unique filename that
 * sails through the budget gate. A measurement of the right size taken of the
 * wrong render is the failure this repo is worst at seeing. Pairing lives here so
 * no consumer CAN mis-pair.
 *
 * ☠️ CUE-MAJOR ORDER IS LOAD-BEARING and must survive any edit here: #1136's
 * matched female/male pair has to be heard back to back on the same words, and
 * grouping by voice puts the two halves of that comparison four players apart.
 *
 * Round A is the two bells and their gate (#1159); the cues are Round B's, which
 * is where #1136 routed the voice pick itself. An empty spec yields no slots, so
 * callers need no conditional of their own.
 *
 * ⚠️ `voiceId` is nullable in the parameter type on purpose: that is what
 * `resolveVoices` returns (the catalog can legitimately carry a voice whose id has
 * not been picked yet), and narrowing it here would make the shortlist path fail to
 * typecheck at the one call site this parameter exists for.
 *
 * @param {string} round
 * @param {{id: string, axis: string, lang: string, voiceId: string|null}[]} [voices]
 *   the voices to pair against, so `render-voices` can pair a `--voice-id`
 *   shortlist through this same join rather than beside it
 * @returns {{slots: {cue: {id: string, lang: string, text: string},
 *                    voice: {id: string, axis: string, lang: string, voiceId: string|null}}[],
 *            candidates: number}}
 */
export function voiceSlotSpec(round, voices = VOICES) {
  if (round !== "B") return { slots: [], candidates: 0 };
  return { slots: pairByLanguage(VOICE_CUES, voices), candidates: TTS_CANDIDATE_SEEDS.length };
}

/**
 * The join itself: cues ⋈ voices ON `lang`, cue-major.
 *
 * ☠️ IT THROWS ON AN EMPTY SIDE RATHER THAN RETURNING FEWER SLOTS. A join is the
 * one shape where a typo does not raise anything — misspell a cue's `lang` and it
 * simply matches no voice, the slot list quietly loses two entries, and every
 * count downstream agrees with every other count because they all read this. The
 * set would ship a language short and `SHIP_FILE_COUNT` would be the only witness,
 * on a map whose whole history is counts that agreed with each other and not with
 * reality (#1317, #1393). So an unpaired cue or an unused voice is an error here,
 * where the language is still on screen, and not a discrepancy three files away.
 *
 * @param {{id: string, lang: string, text: string}[]} cues
 * @param {{id: string, axis: string, lang: string, voiceId: string|null}[]} voices
 */
export function pairByLanguage(cues, voices) {
  const slots = cues.flatMap((cue) => {
    const speakers = voices.filter((voice) => voice.lang === cue.lang);
    if (!speakers.length) {
      throw new Error(
        `cue "${cue.id}" is ${cue.lang} and no voice speaks ${cue.lang} — ` +
          `voices are ${voices.map((v) => `${v.id} (${v.lang})`).join(", ")}`,
      );
    }
    return speakers.map((voice) => ({ cue, voice }));
  });

  const spoken = new Set(slots.map((slot) => slot.voice.id));
  const idle = voices.filter((voice) => !spoken.has(voice.id));
  if (idle.length) {
    throw new Error(
      `no ${idle[0].lang} cue for voice "${idle[0].id}" — a voice with nothing to ` +
        `say renders nothing and costs nothing, so only this check notices`,
    );
  }
  return slots;
}

/** Total Sound Effects seconds, which is what the credit cost is priced on. */
export function creditEstimate(clips) {
  const seconds = clips.reduce((total, clip) => total + clip.durationSeconds * clip.candidates, 0);
  return { seconds, credits: seconds * CREDITS_PER_SECOND };
}
