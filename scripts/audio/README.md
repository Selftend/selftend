# Audio render pass

Tooling for replacing the app's placeholder meditation and breathing clips with
a production set, decided across [map #1130](https://github.com/Selftend/selftend/issues/1130).

**These scripts decide nothing.** Every prompt, duration, candidate count and
loudness target in `catalog.mjs` cites the ticket that fixed it. If a value
looks wrong, the argument belongs on that ticket.

## The one fact that shapes everything

**ElevenLabs Sound Effects is non-deterministic and has no `seed`.** The same
prompt returns different audio every time, and there is no re-render path. So:

- The masters **are** the source. Losing them means the set can never be
  extended in a matching style.
- Every candidate is archived, winners and rejects alike — a rejected take is
  exactly as unreproducible as a chosen one, and the judgement that rejected it
  may not survive contact with the finished set.
- The script refuses to overwrite an existing file, refuses to spend without an
  explicit `--go`, refuses to render a prompt still marked draft, and appends to
  the manifest per clip so a crash never loses the record of what was paid for.

Text to Speech _does_ have a seed, so the eight voice cues are semi-reproducible
where the thirteen sound effects permanently are not. The manifest records it.

## Running it

The key lives in the password manager (#1141) and is passed in for the run. It
is deliberately **not** a GitHub Actions or EAS secret — this is an owner-run
local script, the same shape as `DISCORD_BOT_TOKEN`.

```bash
# No credits. Confirms the plan tier and live balance, and answers the
# capability probes that #1159 needs before any real spend.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs probe

# Prints every composed prompt and the credit cost. Spends nothing.
node scripts/audio/render.mjs plan --round A

# The real thing.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render --round A --go
```

To include the TTS format probe, also set `ELEVENLABS_PROBE_VOICE_ID` to any
Voice Library voice id.

## The two rounds

The pass splits once, at the known risk (#1134 §5).

|                                                                         | What                                              | Cost                     |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| **Round A** — [#1159](https://github.com/Selftend/selftend/issues/1159) | Two bells, 5 candidates each, plus the API probes | 45s ≈ **150 credits**    |
| **Round B** — [#1210](https://github.com/Selftend/selftend/issues/1210) | 5 beds, 6 texture files, 8 voice cues             | 570s ≈ **1,880 credits** |

≈**2,030 credits** total, against 93,179 remaining on the Creator plan.

> ☠️ The map carries #1134's ~17,500 estimate, which is wrong three times over:
> it predates #1137's fifth bed and 10s textures, its bell row forgets the 2s
> temple block, and above all it prices Sound Effects at **40 credits/second**.
> The composer actually charges 7 credits for 2.0s and 23 for 7.0s — about
> **3.3/sec**. Cost was never a constraint and is an order of magnitude less of
> one than the map assumed.

**Round A is a gate, not just the first batch.** Generative FX models reliably
nail an attack and muddy the long tail, which is the entire character of a
meditation bell. If no candidate has a clean, smooth, monotonic decay, the bells
fall back to a non-ElevenLabs source and #1133 reopens for that one class —
before the beds are committed to an unrepeatable render.

## ☠️ The 450-character cap

Sound Effects **rejects any prompt over 450 characters**, server-side — the API
and the web UI enforce it identically.

#1134's §2 palette (204 chars) plus its §3 must-not list (228) come to **434 of
that 450 budget on their own**, leaving 16 characters for the sound. Every one
of the thirteen clips composed to 634–859 and was refused. The mechanism could
not work; it was not merely tight.

`SHARED_TAIL` now carries the same identity in **176** characters, and
`composePrompt()` **throws** rather than letting an over-long prompt reach the
API, so the cap is caught by `plan` instead of by a failed generation. Composed
lengths currently run 377–447.

## ☠️ Two composer defaults that corrupt the pass

If you generate through the web UI rather than the script, both must be changed:

1. **"Automatically improves short or unclear prompts" defaults ON.** It
   rewrites the prompt before generating — so on a seedless pass whose only
   reproducible artifact is the prompt text, the manifest would record a prompt
   that was never sent.
2. **"Generations may be shared to Explore page for other users to download"
   defaults ON**, publishing the app's audio publicly. Disabled 2026-08-20.

## Both content gaps are now closed

`plan --round B` used to warn about two undecided pieces of content and `render`
refused to spend on one of them. Both are settled:

- **The `ocean` bed prompt** — settled on
  [#1262](https://github.com/Selftend/selftend/issues/1262). ☠️ #1137 said the
  bed and the `ocean-swell` texture separate _by distance in the prompt_. That
  mechanism never existed: `composePrompt()` appends `SHARED_TAIL` to every
  Sound Effects prompt, beds included, and it opens "Close, dry, small soft
  room." No bed can be distant. They separate by **content** instead — the bed
  is open water with no shoreline at all, the texture keeps surf on sand.
- **The `guide_intro` wording** — settled on
  [#1264](https://github.com/Selftend/selftend/issues/1264): _"Find a
  comfortable position, and let your shoulders soften."_, the same script for
  both voices. ☠️ It cannot say "get ready" — the preroll screen is already
  showing `breathing.getReady` while the clip plays.

`plan --round B` now warns only that no voice has been chosen, which is Round
B's own first task (#1136 routed the pick there deliberately, not to a ticket).

## Output

Raw output lands in `audio-masters/` at the repo root, which is **gitignored**.
Masters go to Drive `Selftend/app-audio-masters/` (#1141); the repo keeps the
prompts and `manifest.jsonl`. Only the finished `.m4a` clips under
`assets/sounds/` are ever committed.

Post-processing — the fold, loudness normalisation, true-peak limiting and AAC
encode fixed by [#1138](https://github.com/Selftend/selftend/issues/1138) — runs
in the **same session** as the render, deliberately. #1137's seam gate is an
automated wrap check plus a 10x listen on web and native, and both run on the
_post-processed_ loop. Defer post-processing and a bed failing its seam gate
would need a re-render that is no longer possible in matching style.

## Post-processing

`postprocess.mjs` turns one raw master into the finished clip, in the order
#1138 fixed. It was built and calibrated **before** the render pass
([#1296](https://github.com/Selftend/selftend/issues/1296)) — running it in the
same session as the render is required, but _authoring_ it there would mean an
untested pipeline meeting non-reproducible masters.

```bash
# One clip. --clip picks the channels, bitrate and loudness target from catalog.mjs.
node scripts/audio/postprocess.mjs run audio-masters/rain-2.wav --clip rain --out assets/sounds/breathing/rain.m4a

# Just the numbers.
node scripts/audio/postprocess.mjs measure assets/sounds/meditation-bell.wav
node scripts/audio/postprocess.mjs seamcheck assets/sounds/breathing/rain.wav
```

Requires **ffmpeg** on PATH. That is a deliberate `scripts/`-only dependency:
#1138 retired the post-processor's "pure stdlib" property because Python's
`wave` decodes no MP3 and encodes no AAC.

### Three things measurement changed

☠️ **The fold trims, and it is equal-power, not linear.** `seamless()` in
`generate-breathing-sounds.py` folds `sig[n..n+cf]` into the head and the
generator makes `n + cf` samples on purpose. A rendered bed has no spare tail —
Sound Effects caps at 30s — so the last 0.4s is folded in and a 30s render
becomes a **29.6s** bed. And the crossfade weights are `sqrt`, where
`seamless()` is linear: the two halves of a fold are decorrelated noise, so
linear weights sum to ~0.707x mid-fold, a level dip that recurs at **every loop
point** — exactly the recurring audible event #1137's eventless-bed rule exists
to remove. Measured against untouched material in the same clip:

| bed         | linear   | equal-power |
| ----------- | -------- | ----------- |
| rain        | -3.29 dB | -0.20 dB    |
| forest      | -3.57 dB | -0.53 dB    |
| brown-noise | -7.92 dB | -4.87 dB    |

☠️ **Loudness is one computed gain, not ffmpeg's `loudnorm`.** `linear=true` is
a request, not a guarantee: when the source LRA exceeds the target LRA,
`loudnorm` silently falls back to _dynamic_ mode and compresses. On the shipped
meditation bell (LRA 12.8) that landed the file **2.61 LU** from target while
reporting success — and compressing a bell would flatten the attack #1139 relies
on. A single gain is exactly predictable, because scaling by G dB moves both
integrated loudness and true peak by G, so the -3 dBTP ceiling is arithmetic
rather than a limiter.

☠️ **The seam gate's limits are calibrated, and one gap is a true negative.**
`calibrate-seam.mjs` scores the shipped beds three ways — as they ship, hard-cut,
and folded by the pipeline — and fails if the pipeline's own output does not
clear the gate, if a tonal splice is not caught, or if equal-power folding stops
beating the shipped linear fold. Run it after touching a threshold, a window
length or the fold.

A hard cut of **stochastic** material is not caught (it scores 1.08-1.22x) and
that is deliberate: splicing two independent stretches of dense noise produces a
step whose broadband energy is indistinguishable from the material's own. #1137
reached the same conclusion from the other direction — `brown-noise`'s 8s loop is
_already_ undetectable, and the loop tell is event-driven, not seam-driven. What
the gate catches is the case that is actually audible: a **tonal** bed whose loop
phase jumps, which scores 5.29x.

⚠️ **If a rendered bed comes back tonal, the fold will make it worse, not
better.** Crossfading two different phases of the same tone beats and cancels;
`night` — a phase-locked drone — scores 13.85x folded against 5.29x hard-cut. The
gate catches this, which is the point, but the fix is a re-render toward
noise-like material, not a longer fold.
