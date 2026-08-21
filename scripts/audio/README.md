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
  the manifest per take so a crash never loses the record of what was paid for.

## ☠️ The second fact: the model has a silent tail

A fixed prompt varies **16–26 dB** run to run, measured on
[#1316](https://github.com/Selftend/selftend/issues/1316). That spread is larger
than the +15–22 dB that rewriting a prompt buys, so **good prompts still throw
unusable takes** — and being seedless, a good draw can never be reproduced after
the fact. Round B drew 27 times from that distribution with nothing inspecting
the bytes: 20 masters came back unusable for ~6,270 credits.

So `render` measures every take as it lands
([#1320](https://github.com/Selftend/selftend/issues/1320)):

- **Usable at ≥ −12 dBTP, silent below −30** — the same two thresholds
  `preflight` grades with, so a prompt faces one bar. Healthy takes measure −1
  to −6; duds measure −40 to −47. The gap between the thresholds is empty in
  every take measured so far.
- A take below the bar is **kept on disk and recorded**, and the slot is drawn
  again — up to **4 attempts**, `--attempts N` to change it. ⚠️ The bound is the
  safety property: an unbounded re-roll against a broken prompt is unbounded
  spend. `render` quotes both the best and the worst case before `--go`.
- **Every attempt goes in the manifest**, kept or rejected, with its measured
  `dbtp`/`lufs` and `rejectedFor`. A rejected take cost the same credits and is
  equally unreproducible, so omitting it would understate the spend — and a
  clip's rejection rate is what separates a broken prompt from an unlucky one.
- A slot that burns its whole bound **fails the run** (non-zero exit). That
  prompt is broken, not unlucky, and belongs back on #1316.

This is a **level** gate only. Whether a take is _good_ — the right character,
no stray events — stays a human audition call (#1210).

**Resume is keyed on the prompt, not the filename.** A slot is finished only
when an accepted take **of the prompt the catalog composes today** exists. Takes
from a superseded prompt are never reused and never deleted; they stay on disk
and the slot is rendered again. Without that, the 27 masters the failed pass left
behind — every one of their prompts since rewritten by #1316, two re-concepted
into a different sound entirely — would read as "already done" and a re-run would
render nothing at all.

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

# #1347. One bed prompt rendered twice — `loop: true` and a paired control —
# and every measurement that separates them. ~660 credits. Dry run without --go.
# It has RUN and ruled: beds loop natively (#1347). Kept for the tonal follow-up.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs loopprobe --clip brown-noise --go

# Grades every prompt at 4s before any real spend. Run after ANY prompt change.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs preflight --round A

# The real thing. Measures each take and re-rolls the ones below the gate.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render --round A --go

# The eight voice cues, which `render` does NOT cover. `--voice-id` renders a
# SHORTLISTED voice without writing it into catalog.mjs.
ELEVENLABS_API_KEY=... node scripts/audio/render.mjs render-voices \
  --voice-id guided=<voiceId> --voice-id guided-male=<voiceId> --go
```

☠️ **`--voice-id` exists because #1136's own criterion had a chicken-and-egg in
it.** The pick must be made _auditioned on the shipping words, not on demo reels_ —
but `render-voices` refuses to spend until a voiceId is in `catalog.mjs`, so
hearing a shortlisted voice say the shipping words meant editing the decisions file
for every trial, and every trial abandoned left a decision recorded that nobody had
taken. An override is safe precisely because the manifest records the voiceId a
take was rendered with: those takes supersede themselves the moment a different
voice is written in for real, so a shortlist can never leak into the winner's
candidates. It refuses an unknown id, a malformed pair, and the same id for both —
which is one voice twice, not the matched pair #1136 asks for.

Both `render` commands are resumable: re-running fills only the slots still
without an accepted take, and re-quotes the cost of exactly that.

To include the TTS format probe, also set `ELEVENLABS_PROBE_VOICE_ID` to any
Voice Library voice id.

## The two rounds

The pass splits once, at the known risk (#1134 §5).

|                                                                         | What                                              | Cost                     |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ------------------------ |
| **Round A** — [#1159](https://github.com/Selftend/selftend/issues/1159) | Two bells, 5 candidates each, plus the API probes | 45s ≈ **495 credits**    |
| **Round B** — [#1210](https://github.com/Selftend/selftend/issues/1210) | 5 beds, 6 texture files, 8 voice cues             | 570s ≈ **6,270 credits** |

≈**6,765 credits** if every slot passes on its first draw. ⚠️ The number that
matters before `--go` is the **worst** case — every slot re-rolling to the bound
of 4 attempts — which is ≈**25,080 credits** for Round B, about a third of the
81,168 remaining on the Creator plan. `render --round B` prints both.

> ☠️☠️ **The rate is 11 credits/second, and this file said 3.3 until
> [#1359](https://github.com/Selftend/selftend/issues/1359).** Measured twice on
> the live API from the `character-cost` response header: **330 credits for 30s,
> 22 for 2s**. The 3.3 was real but came from watching the **web composer** price
> a generation (7 credits for 2.0s, 23 for 7.0s), and the composer prices
> differently from the API. Nothing ever compared the two, so every quote this
> tooling printed was understated **3.3x**. #1134's ~17,500 estimate is wrong for
> its own separate reasons: it predates #1137's fifth bed and 10s textures, its
> bell row forgets the 2s temple block, and it prices at 40 credits/second.
>
> ☠️ **Read cost from the header, never from the balance.** `/user/subscription`
> **lags** — across a real 22-credit call it did not move at all, then reconciled
> later — so a delta taken around a call can report zero for a spend that cannot
> be repeated. `credits.mjs` holds both instruments and the preference between
> them; `render` records `character-cost` per take in the manifest
> (`creditsCharged`, beside the `creditsEstimate` quote) and prints the pass total
> as a floor when any call came back unpriced.

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

> ☠️ **KNOWN GAP, still open: the repo-side manifest has no writer, and nowhere
> records a Drive path.** #1210's definition of done asks for "the `scripts/`
> manifest written with each clip's prompt, parameters, TTS seed where one exists,
> chosen candidate, and the Drive path" — the repo-side half of the split this
> section describes. But `manifest.jsonl` and `choices.jsonl` both live _inside_
> `audio-masters/`, which is gitignored, so the artifact the split promises is not
> in the repo; and no row in either file has ever had a field for where a master
> was archived. `render` prints an instruction to archive every take and nothing
> records that it happened.
>
> It is deliberately not built yet. Unlike the audition — which has to exist
> _before_ `--go`, because a pass whose output cannot be heard is unrepeatable
> waste — this artifact can be authored after the render with nothing lost, since
> everything it needs is already recorded in the two JSONL files. Build it when the
> pass is done, from those.

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
# A bed ships unfolded at 30.0s, because it was rendered loop: true (#1347).
node scripts/audio/postprocess.mjs run audio-masters/rain-2.wav --clip rain --out assets/sounds/breathing/rain.m4a

# The seam-gate FALLBACK, for a bed that failed the gate above. Costs 0.4s of the
# master (30.0s -> 29.6s), so compare the two and keep whichever measures better.
# Refused on a bell or a texture rather than silently ignored.
node scripts/audio/postprocess.mjs run audio-masters/rain-2.wav --clip rain --fold --out /tmp/rain-folded.m4a

# Just the numbers.
node scripts/audio/postprocess.mjs measure assets/sounds/meditation-bell.wav
node scripts/audio/postprocess.mjs seamcheck assets/sounds/breathing/rain.wav
```

Requires **ffmpeg** on PATH. That is a deliberate `scripts/`-only dependency:
#1138 retired the post-processor's "pure stdlib" property because Python's
`wave` decodes no MP3 and encodes no AAC.

### ☠️ Leading silence is gated on the FINISHED file

#1134 calls zero leading silence a **hard rule** and it is #1210's first acceptance
check — and until #1210 nothing in this pipeline measured it. `edgeSilence` existed
(#1347) but only behind `postprocess edges <file>`, a separate command aimed at a
file by hand, so `run` could report PASS on a clip that starts late.

⚠️ It is in practice a **voice-clip rule**. #1138 measured the shipped set and only
the four `guide_*` files carry any lead at all — 36.2 / 34.1 / 15.0 / 3.2 ms — while
every bed, texture and bell measures 0.0. It matters because every trigger in the
app is _already_ up to 250 ms late (`TICK_MS` polling, #1134), so silence in the
file adds to a lateness the user can already hear.

The limit is **1.0 ms**, bracketed by two measurements rather than chosen by feel.
Above: #1138 round-tripped AAC at **+8 samples, 0.18 ms**, so anything tighter fails
every file this pipeline produces. Below: the smallest real lead in the shipped set
is `guide_hold`'s **3.2 ms**. It also has to catch the **25.06 ms** `start_time`
#1138 measured on MP3, which is #1210's "confirm ffmpeg strips the encoder delay"
case. Verified both ways against real ffmpeg: a natively looping bed measures
0.00 ms lead and 0.00 ms tail at 30.000s, and 20 ms injected into a voice clip comes
back **20.02 ms** through the full chain.

⚠️ The **tail** is measured and printed but never gated. A bell is a long smooth
decay "fading continuously to silence" by #1139's own brief, so gating it would fail
the two clips whose entire character is a tail, for having one.

⚠️ A result carrying **no** edges fails too. A rule that was not measured is not a
rule that passed, and reporting PASS there restores exactly the silence this check
removes.

The remedy is a **hint**, never a failure line (#1359), and it is class-specific:
Text to Speech takes a seed, so a late voice cue is genuinely re-drawable for
nothing, while Sound Effects has none — naming a seed there would point at a path
that does not exist.

The run also carries the finished file's **measured duration**, because #1136 sets
`introMs` from the chosen `guide_intro`'s own header and never from an estimate, and
this is the only place that number is produced.

### What measurement changed

⚠️ **The fold is the fallback now, not the path** (#1347, wired by
[#1359](https://github.com/Selftend/selftend/issues/1359)). Beds render
`loop: true` and ship **unfolded at the full 30.0s**; `postprocess run` only folds
when handed `--fold`, and refuses it on a bell or a texture rather than ignoring
it. The seam gate still runs on **every** bed however it was rendered, and a bed
that fails it is what `--fold` exists for — the run says so in its own failure
message. ☠️ On **tonal** material the fold makes the seam _worse_ (`night` scored
13.85x folded against 5.29x hard-cut), so it is an offer to measure, never an
instruction to ship. A bed that passes neither way needs a re-render toward
noise-like material.

☠️ **The fold trims, and it is equal-power, not linear.** `seamless()` in
`generate-breathing-sounds.py` folds `sig[n..n+cf]` into the head and the
generator makes `n + cf` samples on purpose. A rendered bed has no spare tail —
Sound Effects caps at 30s — so the last 0.4s is folded in and a 30s render
becomes a **29.6s** bed. That trim is why the fold stopped being automatic: it
costs 0.4s of an unrepeatable master. And the crossfade weights are `sqrt`, where
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

☠️ **A raw 30s render does NOT loop, and the failed pass's masters prove it.**
`brown-noise` was the one bed of Round B whose every take cleared the level gate,
and hard-cut its three takes score **19.09x / 8.63x / 13.13x** the median wrap
step — three to six times the 3.0x limit. The pipeline's fold rescues it, but
only to **2.85x**, inside the limit by 5%. That is the measured cost of the
non-looping path and the reason [#1347](https://github.com/Selftend/selftend/issues/1347)
re-opened the question.

☠️☠️ **It was re-opened and ANSWERED: beds render natively looping.** Probed live
over six generations, `brown-noise` at 30s came back with a **0.67x** wrap step
and **0.05x** head/tail, against its own paired `loop: false` control — same
prompt, same session — at **14.34x / 4.15x**. Both are scale-invariant ratios, so
the level gap between two seedless draws cannot explain it, and native looping
beats the folded path's best-ever 2.85x by four times. `loop: true` is accepted
with lossless `pcm_48000` on Creator, honours 30s exactly (5,760,000 bytes =
30.000s stereo), returns **zero lead and zero tail**, and costs no premium.

⚠️ **The tonal case is not cleared, which is why `fold()` still exists.** All
three `night` draws landed under the level gate, and of the two carrying signal
the join was fine while the **head/tail energy ratio failed** — loop mode gives a
clean join without guaranteeing one level end to end.

⚠️ **Loop mode rounds a returned duration up to the next 0.75s multiple** — 1s
came back 1.5s, 2s came back 2.25s, 30s came back 30.000s. Beds are untouched only
because 30 = 40 x 0.75 **exactly**; a 10s clip would come back 10.5s. That is a
property of the number, not of beds, so `loopReturnedSeconds` in `loop-probe.mjs`
is the arithmetic and `test/audio-native-loop.test.ts` holds every looping clip to
a length loop mode honours.

⚠️ That does not overturn the true negative below. The generated `brown-noise` is
deep and heavily band-limited (LRA 0.4 at 0.01 dBTP), so its median adjacent-sample
step is tiny and an unrelated wrap sample stands far out of it; the _shipped_
stdlib beds are broader-band and hide their own cut. The gate catches the wrap it
can see, and still cannot see every one.

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

☠️ **A take with no signal cannot be normalised, and used to fail obscurely.**
loudnorm prints `-inf` for it, `Number()` makes that NaN, and the NaN reached
ffmpeg as `volume=NaNdB` — dying behind a wall of filter-graph errors that named
neither the file nor the cause. `normalisationGain` now refuses it by name. Found
on `wind_exhale-c01.pcm`, a dud of the failed Round B: it measures -69.76 LUFS-I
as stereo and drops under loudnorm's -70 LUFS gate only once downmixed to the
mono a texture ships as — so measuring the raw master by hand shows a finite
number and suggests nothing is wrong.

## The audition

`render` writes headerless raw PCM, so nothing on disk after a pass can be
played. `audition.mjs` closes that gap
([#1346](https://github.com/Selftend/selftend/issues/1346)): it puts every
candidate through the real post-processing chain, tiles beds for the seam listen,
writes a page with the measurements beside each player, and records the pick.

```bash
# Every accepted take -> a playable .m4a, plus a 10x loop for each bed,
# plus index.html. Spends nothing; needs ffmpeg.
node scripts/audio/audition.mjs build --round B

# Also hear the takes below the level gate and the ones of superseded prompts.
node scripts/audio/audition.mjs build --round B --all

# Record the winner, and see what is still unpicked.
node scripts/audio/audition.mjs choose rain 2 --round B --note "least eventful"
node scripts/audio/audition.mjs choose guide_intro 1 --round B --voice guided-male
node scripts/audio/audition.mjs status --round B
```

☠️ **It covers BOTH halves of the round, and it did not.** `survey` built its clip
list from `clipsForRound`, which filters `SFX_CLIPS` — so Round B's eight voice
cues were never in it. `build` could not make one playable, `choose` threw on a
`guide_*` id, and `status` — this pass's own progress meter — would have printed
"Every clip in round B has a pick" and exited 0 with the whole voice half
untouched. Eleven units of nineteen, reported as the round. That is #1317's
`render --round B` producing 11 clips and saying nothing, one subsystem later, and
it landed on the class #1210 calls its FIRST task.

☠️ **A voice pick is per cue AND per voice.** Both voices ship — #1136 makes the
male one purely additive, so nothing migrates and each cue is owed two picks — and
`--voice` is therefore required on a `guide_*` id and refused on a sound effect.
Keyed on the clip alone, choosing the female take would mark the male one settled
and half the voice set would ship unheard. The two voices sit in one section of
the page on purpose: #1136 asks for a **matched pair auditioned on the shipping
words**, and the two halves of that comparison have to be adjacent to be one.

⚠️ **A voice take is not graded by level.** #1320's usable/silent thresholds exist
for the seedless Sound Effects tail, where a fixed prompt varies 16-26 dB run to
run and a dud can never be re-drawn. Text to Speech takes a seed and is
re-renderable, so a level gate here would import a rule no ticket decided onto the
one class that does not need it. What supersedes a voice take is the pair
**(voiceId, text)** — the analogue of the composed prompt, and what lets a
shortlist be auditioned and then swapped without a stale pick surviving the swap.

Output lands in `audio-masters/audition/round-<R>/` — `index.html` to open from
disk, `audition.json` for the same data machine-readable.

☠️ **The bed loop is tiled on decoded PCM, not by looping the `.m4a`.** Splicing
AAC frames would put the codec's priming gap at every join — inventing precisely
the artifact the listen exists to detect, and failing a bed for a defect the app
would never play. #1138 established that no platform loops by buffer wrap anyway
(iOS duplicates an `AVPlayerItem`, Android sets `REPEAT_MODE_ONE`, web sets
`HTMLAudioElement.loop`), so what goes in front of an ear is the file's own seam,
sample-exact and encoded once — the same join `seamMetrics` measures. Only beds
are tiled: textures never loop (#1137) and bells are one-shots.

☠️ **Choices go in `choices.jsonl`, never in `manifest.jsonl`.** `planSlot`
classifies any row without an `attempt` and a `dbtp` as a superseded take, so a
`chosen` row appended to the manifest would be counted against the slot and
quietly corrupt the survey that quotes the cost of an unrepeatable spend. The
record that decides how much money a run costs takes no new row shapes from a
tool that spends nothing.

☠️ **A pick is recorded against the prompt its take was generated from.** That is
what lets `status` re-open a clip whose prompt changed after the pick — a choice
made against a rewritten prompt names a sound nobody is asking for, and treating
it as settled is how an old take's decision silently ships.

⚠️ **Only the ear decides.** The level and the seam ratio sit beside the player
to say where to be suspicious. Measurement can reject a bad clip and can never
confirm a good one (#1159), and #1316's `forest` and `wind` re-concepts make the
listen more load-bearing, not less. Listen on a phone speaker at low volume as
well as headphones (#1134).
