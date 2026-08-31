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

Text to Speech _does_ have a seed, so the voice cues are semi-reproducible where
the sound effects permanently are not. The manifest records it.

## Running it

The key lives in the password manager (#1141). It is deliberately **not** a GitHub
Actions or EAS secret — this is an owner-run local script, the same shape as
`DISCORD_BOT_TOKEN`.

☠️☠️ **Never put the key on the command line. Two keys have been burned that way.**
`ELEVENLABS_API_KEY=... node ...` is an inline prefix: it goes into shell history,
into any terminal transcript, and — when an agent is driving the terminal — straight
into a conversation log that outlives the run. An agent's `!` prefix does **not**
hide it either; the command text is recorded verbatim. This file used to show that
form in five places, which is why it is called out here rather than assumed.

Set it once, in your **own** terminal, then open a **new** one (`setx` only affects
future sessions) and run with no key on the command line at all:

```powershell
setx ELEVENLABS_API_KEY "<paste it here>"     # Windows; then open a new terminal
```

```bash
export ELEVENLABS_API_KEY='<paste it here>'   # macOS/Linux, in your shell rc
```

```bash
# No credits. Confirms the plan tier and live balance, and answers the
# capability probes that #1159 needs before any real spend.
node scripts/audio/render.mjs probe

# Prints every composed prompt and the credit cost. Spends nothing.
node scripts/audio/render.mjs plan --round A

# #1347. One bed prompt rendered twice — `loop: true` and a paired control —
# and every measurement that separates them. ~660 credits. Dry run without --go.
# It has RUN and ruled: beds loop natively (#1347). Kept for the tonal follow-up.
node scripts/audio/render.mjs loopprobe --clip brown-noise --go

# Grades every prompt at 4s before any real spend. Run after ANY prompt change.
node scripts/audio/render.mjs preflight --round A

# The real thing. Measures each take and re-rolls the ones below the gate.
node scripts/audio/render.mjs render --round A --go

# The sixteen voice slots — 4 cues x 2 voices, in English and Bulgarian — which
# `render` does NOT cover. Renders every slot from the catalog's four voices:
node scripts/audio/render.mjs render-voices --go

# `--voice-id` renders a SHORTLISTED voice without writing it into catalog.mjs.
# ⚠️ Name only the voices you are trialling; the others keep their catalog id, and
# ALL sixteen slots still render. The ids are guided | guided-male (en) and
# guided-bg | guided-male-bg (bg) — run with no --go to see the quote first.
node scripts/audio/render.mjs render-voices \
  --voice-id guided-bg=<voiceId> --go
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
| **Round B** — [#1210](https://github.com/Selftend/selftend/issues/1210) | 5 beds, 6 texture files, 16 voice slots           | 570s ≈ **6,270 credits** |

⚠️ **The voice half is not in those credit figures.** Sound Effects are priced per
second (11 credits/sec, #1347); Text to Speech is priced per **character**, so all
sixteen voice slots at two candidates each come to a few hundred characters —
cents, not credits. Adding Bulgarian roughly doubled the slot count and did not
move the number below.

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

### The repo-side manifest

`manifest.jsonl`, `choices.jsonl` and `archive.jsonl` all live _inside_
`audio-masters/`, which is gitignored — so on their own they are not the repo half
of anything. `manifest.mjs` is what makes the split real:

```bash
node scripts/audio/manifest.mjs write   --round B [--out <path>] [--check]
node scripts/audio/manifest.mjs archive --round B --all [--note "..."]
node scripts/audio/manifest.mjs archive --round B --file <name> [--note "..."]
```

`write` rebuilds `scripts/audio/round-<R>.manifest.json` — committed, and holding
#1210's definition of done for every unit: the prompt asked for today, each take's
parameters and its TTS seed where one exists, the chosen candidate, and the Drive
path. It **exits 1 while any unit is unpicked or any take unarchived**, so a
half-finished pass cannot read as a finished one. Each take also carries a
`measured` block joined from the audition's `audition.json` — the finished file's
duration and lead silence, which `postprocess run` alone produces and which #1136
requires for `introMs`; without this they lived only on a page `build` overwrites.

`archive` records that masters reached Drive. ⚠️ It **attests, it does not
upload** — nothing in this repo talks to Drive, so the row is a person's claim
that they did it, and the record says so in its own `archivedMeans` field. A take
whose master is not on this disk is refused rather than attested, because an
attestation given for free is worth nothing.

The logic lives in `manifest-plan.mjs` and the disk and exit codes in
`manifest.mjs`, the same split `audition-plan.mjs`/`audition.mjs` and
`take-gate.mjs`/`render.mjs` already use, and for the same reason: the record has
to be drivable from jest without ffmpeg, a key, or a rendered byte.

> ☠️ **`--check` gates on BOTH currency and completeness**, and dropping the second
> was a real bug: it exited 0 against 65 gaps on a pass nobody had started. It is
> the obvious way to assert the gate without dirtying the tree, so a mode of
> `write` that keeps half `write`'s contract is the same green light on a half-done
> pass this record exists to refuse. "Current" and "finished" are reported as the
> separate facts they are.

> ☠️ **`--check` is local-only and no CI gate can replace it.** Everything the
> record derives from is gitignored and lives on whichever machine ran the pass, so
> nothing on a clean checkout can notice a stale manifest. That is the price of the
> split #1141 chose, and it is worth stating rather than implying a guard exists.

> ⚠️ **Round A's masters are not on this machine.** `write --round A` reports two
> units and **zero takes**: #1159's bell gate passed and spent 120 credits, but
> `audio-masters/` is gitignored and per-worktree, and the worktree that rendered
> them is gone. Whether those two bells still exist depends entirely on whether
> someone uploaded them to Drive — and nothing recorded it, which is exactly the
> hole `archive` closes for Round B.

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
node scripts/audio/postprocess.mjs measure assets/sounds/meditation-bell.m4a
# ⚠️ Point seamcheck at a MASTER. On an encoded file the head/tail half reads high
# for a reason that is not in the audio (#1571) — it warns, but the number is still
# not the one `run` gates on.
node scripts/audio/postprocess.mjs seamcheck audio-masters/rain-2.wav

# The set, not one clip: #1210's size acceptance check. Runs before the render too.
node scripts/audio/postprocess.mjs budget
```

Requires **ffmpeg** on PATH. That is a deliberate `scripts/`-only dependency:
#1138 retired the post-processor's "pure stdlib" property because Python's
`wave` decodes no MP3 and encodes no AAC.

### Two languages, and why pairing lives in one function

The voice half is **cues ⋈ voices joined ON `lang`** — 8 cues (4 English, 4
Bulgarian) against 4 voices (2 per language) giving **16 slots**, not the 32 a
cartesian product gives. `voiceSlotSpec` performs that join and returns the paired
slots; `render`, `ship-plan`, `manifest` and the audition all map what it hands
them (#1581).

☠️ **The reason it is one function is that the wrong version fails silently and
expensively.** Each of those consumers used to build `cues × voices` itself — one
line, three copies, correct by luck while there was one language, because every
voice really did say every cue. With two, the product is **right in count and wrong
in content**: half of the 32 pair a Bulgarian voice with English words. Every one of
them renders, bills, and lands under a unique `shipFileName`, so the budget gate
passes a set that is half nonsense. A correct measurement of an incorrect render is
the failure mode this pipeline has hit most often (#1317, #1393) and is worst at
seeing.

☠️ **A join fails silently by returning fewer rows, so both empty sides throw.**
Misspell a cue's `lang` and it simply matches no voice; the slot list quietly loses
two entries and every downstream count still agrees with every other count, because
they all read the same list. `pairByLanguage` therefore refuses a cue no voice can
say and a voice with nothing to say.

☠️ **`resolveVoices`' duplicate check is PER-LANGUAGE, deliberately.** Language is a
property of the **request**, not of the voice, so if a Bulgarian voice fails its ear
test the documented fallback is to hand Bulgarian text to the English pair — which
makes `guided` and `guided-bg` share a `voiceId` legitimately. A global uniqueness
check would kill that fallback with a message about a matched pair. What must stay
unique is the female/male pair **within** one language.

⚠️ The app-side ids never move. A stored `user_preferences.breath_sound_id` is only
ever `guided` or `guided-male`; language swaps the assets underneath those two
picker rows. The `-bg` voice ids exist so the render can name files apart
(`guide_inhale_bg.guided-bg.m4a`).

### The size budget, and why a voice cue's filename carries its voice

☠️ **Three file counts appear on this page and only one is the target.** `21` is
#1210's original acceptance check, quoted below as history. `19` is what ships
**today**, measured. `27` is the target — `SHIP_FILE_COUNT`, the set once #1573's
eight Bulgarian cues are rendered. The set is not complete until the survey says
27; if a number here disagrees with `SHIP_FILE_COUNT`, `SHIP_FILE_COUNT` is right
and this prose is stale.

#1210's fifth acceptance check is "**Budget**: 21 files, ~3.21 MB, under the 4.0 MB
ceiling", and it was the last item on that list with no instrument behind it —
loudness and true peak are gated by `run`, leading silence by `edgeSilence` on the
finished file, the seam by `seamcheck`, and the budget was a number in a ticket body.
`postprocess.mjs budget` is that instrument. It prints two facts and keeps them apart:

- **PREDICTED** — what the set weighs on paper, from `catalog.mjs`'s own durations
  and bitrates. It needs no rendered byte and no ffmpeg, which is the only time the
  answer can still change anything: the pass is unrepeatable. It lands at **3.196
  MiB** against the **3.21 MB** #1138 published — agreeing to about 14 KB, which is
  the container overhead neither number counts. That agreement is what says the model
  behind the ceiling and the model behind the check are the same one; it is not a
  reproduction to the byte, and the command does not claim one.
- **MEASURED** — what is actually in `audio-masters/finished/`. Only this can fail
  the command, and it fails on a **missing unit**, on a file **too small to be** its
  unit, and on a **stray file**, as readily as on the total.

☠️ **Quote the ACTUAL survey, never PREDICTED, for the voice half.** The prediction
estimates a cue's length from `assets/sounds/breathing/<clip>.wav`, and no `.wav`
exists anywhere in this repo — the masters live in the separate `app-audio-masters`
repo and `audio-masters/` is gitignored. So every voice unit probes to nothing, is
counted _unknown_ rather than zero, and the command labels its total a **FLOOR**.
Measured on 2026-08-31, the ACTUAL set is **19 files / 3,578,571 B / 3.413 MiB**,
leaving **601 KiB** under the 4.000 MiB ceiling. The eight English cues are 117,126
B of that, so #1573's Bulgarian eight cost about **19% of the headroom**.

☠️ **A set that fits because four of its files were never written is not a set that
fits.** By byte count, twenty of twenty-one is the healthiest set the pass could
possibly hand over.

☠️ **Nor is a set of twenty-one empty files.** `/code-review` found this by running
the command: twenty-one correctly named ZERO-BYTE files printed `21/21 files · the set
is complete and fits` and exited **0**, because presence was only "a name matched".
A present file must now also be big enough to be its unit — at least half its
predicted size for the sound effects, whose lengths the catalog fixes, and
simply non-empty for the voice cues, whose length TTS decides and where no honest
floor exists yet. The floor is loose on purpose: it catches a truncated or failed
encode, it does not grade one. ⚠️ `bytes === 0` is its own clause rather than a case
of `bytes < floor` — a cue's floor is 0, `0 < 0` is false, and an empty cue slipped
through the check written to stop empty files, in the half of the set that has been
invisible to a subsystem twice before.

☠️ **Every file in the directory is weighed, not just `*.m4a`.** Filtering by
extension first made a 5 MB stray `.wav` weigh nothing and go unreported while the set
still read "fits" — on a ceiling #1138 justifies by exactly that case, a single
uncompressed bed blowing it instantly. It also made an uppercase `.M4A` vanish from
the total while its own unit reported missing. ⚠️ A directory entry that is not a
file is skipped: a _directory_ named `rain.m4a` used to survey as a present unit.

☠️ **The ceiling is MEBIbytes.** #1138 reports today's set as "2.854 MB" and the
sixteen shipped `.wav` files total 2,992,420 bytes — 2.854 MiB, 2.992 MB. Read as
decimal the set would have 194 KB less headroom than it has, on a set already at
~80% of its limit.

☠️ **A voice cue's finished filename carries its voice** (`guide_inhale.guided.m4a`,
`guide_inhale.guided-male.m4a`), and `run --voice` is required on a `guide_*` id and
refused on a sound effect. Before this, `run --clip guide_inhale` defaulted its
output to `guide_inhale.m4a` whichever voice the master came from — so
post-processing the male take **wrote over the female's finished file**, and the pass
ended with twenty files where it needs twenty-one, silently, because nothing counted
them. Same shape as `render` producing eleven clips of nineteen (#1317) and the
audition's own `status` reporting a settled set with the voice half untouched
(#1393), one subsystem further along. Both voices carry the suffix: an asymmetric
scheme is how "the default voice" quietly becomes "the only voice".

⚠️ **`budget` is not a CI gate, and #1210 is why.** #1138 asked for the ceiling to be
enforced "in `npm run verify`", but #1210 routes `scripts/check-audio-budget.js` — the
guard over the assets the app actually ships — to `/to-tickets` along with the
extension swap and `.gitattributes`. Those are different artifacts at different
times: this measures the finished set in `audio-masters/finished/` during the pass,
while the render can still be acted on. Wiring it into `verify` today would also fail
every build until the pass has run. Said out loud here rather than leaving a later
session to assume a guard exists, the same way `manifest --check` says it is
local-only.

⚠️ The predicted total is **payload only** — the `.m4a` container adds a few KB of
`moov` per file, and #1138's figure was computed the same way. A prediction landing
within a hair of the ceiling should be read as "too close", never as "it fits". And
the voice lengths are **estimated** from the clips shipping today, which say the
same words; TTS decides the real ones, and they do not exist until the pass runs.

☠️ **In a clean checkout the estimate is not even available, so PREDICTED is always
a FLOOR for the voice half — quote the ACTUAL survey.** The estimate is read off
`assets/sounds/breathing/<clip>.wav`, and no `.wav` exists anywhere in this repo:
the masters live in the separate `app-audio-masters` repo and `audio-masters/` is
gitignored. Every voice unit therefore counts as _unknown_ rather than as zero, and
`budget` says so in as many words.

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

☠️ **The seam gate measures the MASTER, not the finished `.m4a` (#1571).** AAC's
MDCT has no wrap-around context at a file's two ends, so the decoded head and
tail differ from the master at exactly the two windows the head/tail check
samples. On synth white noise — periodic by circular filtering, so its seam is
zero by construction — encoding moves the verdict from **0.98x to 19.93x**. This
is the same rule the tiled listen already followed and the automated half did
not. `seamcheck <file>` still measures whatever you point it at, and now says so
when that is not a WAV.

☠️ **Both halves of `energyDeltaRatio` must be the same statistic.** Until #1571
the numerator was the difference between two windows and the denominator the
median deviation of _one_ window from the clip's centre, which inflates the ratio
~1.4x before any defect exists — and much further on material whose level wanders
slowly. Brown noise scored **2.68x against a 2.0 limit with no seam in it**. The
denominator is now the step between adjacent interior windows: the wrap joins two
windows, so the null distribution is built from pairs too.

☠️ **The limits are calibrated against material whose seam is KNOWN.**
`calibrate-seam.mjs` no longer reads a shipped asset — it synthesises the three
`synth-noise.mjs` beds, which cannot have a seam, and scores them clean, level-
drifted, hard-cut and AAC-encoded. It fails if a provably seamless bed does not
clear the gate, if a 3 dB drift is not caught, or if the two populations overlap.
Current gap: clean ≤ **2.54x**, drift ≥ **3.24x**, limit **3.0x**. It costs no
credits and needs no asset on disk, so run it after touching a threshold, a
window length, the fold or `seamMetrics`. ⚠️ It was dead from #1569 until #1571 —
it still read the `assets/sounds/breathing/*.wav` placeholders that release had
replaced with `.m4a`, so it threw on its first ffmpeg call.

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
list from `clipsForRound`, which filters `SFX_CLIPS` — so Round B's voice cues were
never in it. `build` could not make one playable, `choose` threw on a
`guide_*` id, and `status` — this pass's own progress meter — would have printed
"Every clip in round B has a pick" and exited 0 with the whole voice half
untouched. Eleven units of nineteen, reported as the round. That is #1317's
`render --round B` producing 11 clips and saying nothing, one subsystem later, and
it landed on the class #1210 calls its FIRST task.

☠️ **A voice pick is per cue AND per voice — of that cue's language.** Both voices
ship — #1136 makes the male one purely additive, so nothing migrates and each cue is
owed two picks — so `--voice` is required on a `guide_*` id and refused on a sound
effect. Keyed on the clip alone, choosing the female take would mark the male one
settled and half the voice set would ship unheard. The two voices sit in one section
of the page on purpose: #1136 asks for a **matched pair auditioned on the shipping
words**, and the two halves of that comparison have to be adjacent to be one.

`--voice` is validated against the **slot list**, not against `VOICES`, so
`choose guide_inhale 1 --voice guided-bg` is refused: a Bulgarian voice does not say
an English cue. That check was the **fourth** pairing site and #1581 missed it — the
other three (render, ship, manifest) were centralised while this one still asked "is
that a real voice?" instead of "is that a real pairing?".

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
sample-exact and encoded once. Only beds are tiled: textures never loop (#1137)
and bells are one-shots. ⚠️ Since #1571 the ear and the ratio no longer see the
identical join — the listen crosses the decoded file's boundary, the gate
measures the master's — because the encoder's two end frames are an artifact of
the encode and not a seam. The wrap-step half is what would catch an audible
click there, and it is unchanged.

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
