# Sound - the bed, the lane, and changing the bed from inside a session

Origin: map [#2428](https://github.com/Selftend/selftend/issues/2428), charted
2026-09-15 and assembled on [#2443](https://github.com/Selftend/selftend/issues/2443)
2026-09-16. The reversal it records is [ADR-0011](adr/0011-the-web-bed-loops-on-a-buffer-and-a-lane-holds-two-players.md).
How the bed files are _made_ is a different document: `scripts/audio/README.md`.

## 0. What this spec is, and how to read it

Two complaints started this, both from the owner on the web sit screen: _"I want
to be able to modify the background sound from within a meditation sitting"_, and
_"the transition when the bg sound ends and it starts anew is not seamless -
there is a short pause and fade in."_

They turned out to be one subject. A control that changes the bed mid-sit makes
every chip tap audible, so what a swap _sounds_ like stopped being an
implementation detail; and the pause at the loop point turned out to be the web
player, not the file, not the app's fades, and not a defect on the phones at all.

This document is the decided answer to both, and it is also the standing home of
the in-app playback rules - the lanes, their invariants, the per-platform looper,
the sound door and the sound panel. §10 is the build, in dependency order, and
**items 1-5 have shipped** (#2504, #2505, #2506, #2507, #2508): the catalogue's nominal
lengths, the two lifted controls, the two-player lane with the web buffer loop,
the sound door and panel on the sit, and the `:latency=1` master re-run that took
the limiter's 4.97 ms head hole out of all nine beds. What is left is **item 6
alone**, the owner's post-build listen on web - the one thing here nobody reading
this can supply for themselves. Every ruling below was made on its own ticket and
is linked at its heading; the ticket's resolution comment holds the reasoning and
the numbers, and this file holds what was decided.

**Terms** are `CONTEXT.md` § Sound: **bed**, **swap**, **sound door**, **sound
panel**. Used here exactly as defined there.

## 1. The sound door and the sound panel ([#2436](https://github.com/Selftend/selftend/issues/2436), [#2442](https://github.com/Selftend/selftend/issues/2442))

**Scope: the bed and its volume only. The bell volume does not join.** The bell
is a cue whose level is a setup decision; `bellVolumeRef` on the sit screen is
untouched.

### 1.1 The door

A **ghost** button - `music-note` icon plus the visible one-word label `Sound` /
`Звук` - **on its own row beneath** `Pause` / `Finish early`, centred, `gap-2`.
`Pause` and `Finish early` stay exactly as shipped.

The door is **always shown and always plain**: no bed name on it, no dot, no
marker, whether the bed is playing or `None`. A marker when a bed is on reads as
a suggestion when it is off, which is the [#1742](https://github.com/Selftend/selftend/issues/1742)
guardrail.

> ⚠️ The door's own row is a **measurement**, not a preference, and it supersedes
> #2436's ruling 3. That ruling put the door in the same row as the pair and
> chose a one-word label so it would fit. It does not fit: the prototype measured
> the row of three at **324 px in `en` and 359 px in `bg`** against the **312 px**
> content column at 360 dp. Two rows is the only arrangement that holds in both
> locales (217 px / 264 px).

### 1.2 The panel

A bottom sheet over the lower surface - `PressShieldModal` with
`surface="sheet"`, the shape breathing's Sounds sheet already uses - holding
exactly three things and nothing else:

1. A header row: the heading `timer:ambient.label` (`Background sound` / `Фонов
звук`) with **`Done` (`common:done`) as a ghost text button on the same row**.
2. The chip radiogroup over `AMBIENT_SOUNDS`, **`None` first**.
3. The volume as breathing's rail - `graphic-eq` icon, a short visible label, the
   track, the `%` read-out - **rendered only while a bed is chosen**.

No full-width `Done`, no list rows, no empty state, no hint copy.

> ⚠️ This layout is also a measurement. At 360 × 780 with a bed chosen in `bg`,
> the three layouts prototyped measured **393 px** (chips + full-width `Done`,
> the home card's shape), **673 px** (list rows) and **315 px** (this one). Only
> this one leaves the ring _and_ the numeral visible. At 360 × 640 it covers the
> ring's lowest 69 px with the numeral still visible, which the owner accepted.
> The build pins the panel's **content**, not a pixel height.

**On desktop** the panel is constrained to the shell's **620 px content column**,
centred, with rounded top corners and the backdrop dimming the rest of the
window. Not a full-width bar.

### 1.3 Behaviour

- **Every pick and every slider move applies live.** No confirm, no cancel;
  closing the panel changes nothing.
- **Opening the panel does not pause the clock.** Auditioning under the running
  clock is the point of "from within a sitting". `Pause` stays a separate,
  explicit action.
- **The door works while paused.** A pick while paused is written and is heard on
  resume; the lane is silent while paused by construction (it is active only
  while `focused && sitting && !paused && finishRequested === null`), so no new
  state is needed.
- **`None` mid-sit fades the bed out** (the lane's `stop`) and nothing else
  happens. `None` stays first in the list.
- **Only one layer is ever open over the ring.** An OS or web back with the panel
  open closes the panel first and does nothing else; #777's pause-and-confirm
  applies to the _next_ back. Requesting `Finish early` with the panel open
  closes the panel before the confirm dialog shows.

### 1.4 The accessibility contract

The door is a 44 dp button with a visible label and an accessibility label naming
the lane. The panel opens with a **dialog role**, takes and **traps focus**,
closes on **Escape** and on **`Done`**, and **returns focus to the door**.
**Tap-outside dismissal is off** - a stray tap during a sit must not close it
under a screen reader - so breathing's backdrop `Pressable` is deliberately not
copied. The radiogroup and the rail are the components the home card and the
breathing session already ship, so keyboard and screen-reader operation are
covered. Picking a bed announces its name. The volume stays reachable in the
panel whenever a bed is chosen. The clock is not announced while the panel is
open. **Nothing is icon-only.**

### 1.5 Copy

Two new keys, both in the `timer` namespace, `en` and `bg`:

| Key                   | `en`     | `bg`   | Where                          |
| --------------------- | -------- | ------ | ------------------------------ |
| `ambient.door`        | `Sound`  | `Звук` | the door's visible label       |
| `ambient.volumeShort` | `Volume` | `Сила` | the rail's short visible label |

Everything else is an existing key: `timer:ambient.label` for the heading,
`timer:ambient.volumeLabel` for the rail's accessibility label, `common:done` for
`Done`, and each bed's own `breathing.sounds.ambient.*` label for its chip.

## 2. The pick is session-authoritative ([#2495](https://github.com/Selftend/selftend/issues/2495))

**The sit owns what is playing for the length of the sit. The preference query
only seeds it.**

The sit screen keeps a **null-until-picked local pair** - the bed and its volume,
the home card's exact shape, `pickedBed ?? preferences?.… ?? "none"`. The lane
reads that pair, and so does the panel. The panel takes `bedId`, `bedVolume` and
the pick / change / commit handlers **as props from the sit screen** and **never
reads `useUserPreferences` itself**, so its selected chip and what is audible can
never disagree.

The write is the home card's write, verbatim: one attempt through
`useUpdateUserPreferences().mutateAsync(patch).catch(() => undefined)`, the bed
on change, the volume on commit, drags local. **No retry, no error copy, no
toast, no new column, and no `staleTime` / refetch / invalidation change.**

> ☠️ **Why this is a rule and not an accident.** `useUpdateUserPreferences`
> writes the patch into the cache optimistically in `onMutate` and **rolls it
> back in `onError`**, invalidating only on success. Mutations run
> `networkMode: "always"`, so offline they fail fast. A lane fed from the query
> alone would therefore **swap the bed back under the person mid-sit** on any
> failed or offline write. Feeding the lane from the sit's own pair is what makes
> that impossible.

What a person gets from a failed or offline pick: the bed they chose plays for
the rest of the sit, the panel says nothing, and the home card afterwards shows
the bed from before the sit. The precedent is the breathing session's volume
rails, which are frontend-authoritative for the same reason.

## 3. The looper, per platform ([#2441](https://github.com/Selftend/selftend/issues/2441))

| Platform    | Ruling                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iOS**     | **Do nothing.** `expo-audio`'s `player.loop = true` stays - an `AVQueuePlayer` with one duplicate `AVPlayerItem` queued behind the current one since `expo-audio@56`.                                                                                                                       |
| **Android** | **Do nothing.** Gapless by construction: Media3's `REPEAT_MODE_ONE` is an ordinary period transition and re-trims priming every iteration.                                                                                                                                                  |
| **Web**     | **The looping bed moves to a Web Audio buffer loop.** `fetch` → `decodeAudioData` → `AudioBufferSourceNode` (`loop = true`) → `GainNode` → destination. The `HTMLAudioElement` stays as a silent **fallback**. One-shots - the guided voice and the bells - stay on the element, untouched. |

**Why web, and why only web.** On the element the wrap is a **seek** on every
engine, with digital silence in it and no fade: ~22 ms then ~19 ms on Chromium
(Edge 153 and Chromium 147, three beds), ~10 ms on Firefox 148, plus ~10 ms of
the bed skipped per wrap. Chromium's tracker ruled this infeasible to fix in
2024; WebKit's equivalent bug has been open since 2021. The Web Audio buffer loop
measured **sample-exact** - 1 323 000 frames, priming and the 8 padding samples
trimmed, zero inserted samples. On the two phones the owner heard **no seam at
all** across four wraps each on `rain` and `brown-noise`, with breathing
identical, so there is nothing on native to fix.

### 3.1 The web design, decided

1. **Split, not replace.** `openWeb` in `src/lib/lane-player.ts` becomes two
   handles: a graph handle for `loop === true`, today's element code for
   `loop === false`. `prepareWebOneShot` in `src/lib/native-audio.ts` is untouched.
2. **One `AudioContext` per page**, module-level, created lazily on the **first
   looping `play()`** - never at import, never on a screen mount - `resume()`d on
   every looping play and `suspend()`ed when the last looping lane releases its
   source. The gesture footing is unchanged: the bed starts from a focus effect
   after the home screen's tap, exactly where the element's `play()` runs and
   succeeds today.
3. **Decode with a two-entry cache** keyed by asset URL - the playing bed and the
   previous one, so a pause → resume is instant and a swap back costs at most one
   decode. The outgoing buffer is dropped when a third bed arrives. ~10.6 MB per
   bed at 44.1 kHz, ~11.5 MB at 48 kHz, so **≤ 23 MB resident**.
4. **First play waits** for the `fetch` (same origin; `public/_headers` already
   permits it, and the file is in the HTTP cache after the first session) plus
   the decode, and the fade-in starts after that. **Accepted**: the bed may start
   a beat after the opening bell. A pre-decode on mount is not in this spec.
5. **The fade stays the lane's `setInterval` ramp**, writing `gain.gain.value`
   directly rather than `GainNode` automation, so the existing invariants and
   their fake-timer assertions hold verbatim. A playing bed keeps the page
   audible, so Chrome's timer throttling does not reach a fade that starts from
   sound; a fade-in from silence in a hidden tab was already throttled on the
   element.
6. **Loop window** `loopStart = buffer.duration − nominalSeconds`,
   `loopEnd = buffer.duration`. Exact (`loopStart = 0`) when the decoder trimmed
   priming, and a guard against a decoder that did not, which would otherwise put
   a ~23 ms hole at every wrap. `nominalSeconds` joins each `AMBIENT_SOUNDS` row.
7. **Fallback to the element, silently**, when any of: no `AudioContext`
   constructor; `decodeAudioData` rejects; the context is not `running` after
   `resume()`. The fallback is today's code and today's seam - **never silence**.
   ☠️ This is not hypothetical: the beds' major brand is `M4A `, exactly the
   brand a Safari 27 beta rejected with `EncodingError` until 2026-07-27.
8. **iOS Safari parity**: set `navigator.audioSession.type = "playback"` once,
   where the API exists, before the first looping play. Not new scope - the
   element already ignores the mute switch and continues when the screen locks,
   and the native app sets `playsInSilentMode: true` for the same reason. Without
   it a Web Audio bed would obey the mute switch and be interrupted on
   backgrounding.
9. **Bundle: zero change.** No asset change (19 files, 3.41 MiB, the 4 MiB
   ceiling test untouched), no dependency, roughly one small module of lane code.
   `expo-audio` stays out of the web bundle.

### 3.2 Rejected, so nobody re-opens them

- **Two staggered elements self-crossfading at the seam.** Each element still
  seeks at its own wrap, the crossfade is scheduled off a main-thread timer with
  ±4-16 ms jitter against a ~20 ms artefact, and the crossfade shape becomes the
  player's problem - the thing the fold gate keeps in the pipeline.
- **Opus in Ogg/WebM for web.** The wrap is a _seek_, not a codec problem, so a
  container change does not touch it. It also adds ~2.1 MB against the 4 MiB
  ceiling unless the bundle is split by platform, and it is a second lossy
  generation unless re-encoded from the masters.
- **Media Source Extensions double-buffering.** Needs fragmented MP4 and leaves
  the page managing the timeline and eviction forever, for nothing Web Audio does
  not already do.
- **Rotating the loop point, or re-rendering the beds.** Rotating only moves the
  head hole into the interior; re-rendering costs credits, is non-deterministic,
  and is not needed (§6).

### 3.3 The standing check

Two things, and deliberately not a third:

1. **A structural lane test** pinning that a looping web lane plays through
   `AudioBufferSourceNode.loop`, so a refactor cannot quietly put the bed back on
   the element.
2. **The per-platform record in `scripts/audio/README.md`**, carrying the
   measured numbers, the date of the owner's listen, and the one trigger to
   repeat the phone listen: an `expo-audio` upgrade whose changelog or diff
   touches the iOS looper (`AVQueuePlayer` / the duplicate `AVPlayerItem`), or a
   Safari major.

**Not** a committed loopback rig and **not** a line in the release recipe. The
#2439 rig stays described in its resolution comment, where it can be rebuilt from
if it is ever needed again; committing it would put a browser-only, one-at-a-time
measurement harness into a repo whose release path can never run it.

## 4. The swap crossfade ([#2484](https://github.com/Selftend/selftend/issues/2484))

**A bed swap crossfades, on every platform, over the existing `LOOP_FADE_MS`
(400 ms).** Web, iOS, Android, and the web element fallback alike.

1. **The outgoing bed holds at level until the incoming can start**, then both
   ramps run together. ☠️ Today `play()` calls `release()` **before** it awaits
   `open()`, so the silence covers the native audio-mode setup and, after §3, a
   cold `fetch` + `decodeAudioData`. Under this rule there is no hole at any
   speed of open. The cost is that on a cold bed the sound lands a beat after the
   tap while the chip highlights immediately - accepted, because the alternative
   is a hole whose length is not ours to bound.
2. **At most one outgoing at a time.** A further tap during a crossfade demotes
   the current riser to outgoing - it falls from wherever it is - and **cuts** any
   older fader still on its way down. Ceiling of two live players, always, on
   every platform. This is what makes the invariant a countable assertion, and it
   matches the ≤ 2 decoded beds of §3.1.3 rather than fighting it.
3. **Linear, both ramps exactly as today.** Two complementary linear ramps on
   uncorrelated beds sum ~3 dB down for ~100 ms mid-swap. Accepted rather than
   adding an equal-power curve: §3.1.5 kept the `setInterval` ramp verbatim
   precisely so the existing invariants hold unchanged, and a brief dip on a
   change the person just asked for is not the artefact this spec is about.
4. **`stop()` during a crossfade fades both players to 0 from where each one is,
   and releases both.** Pause, `Finish early` and `None` all arrive as `stop()`,
   and none of them may reintroduce a cut. **`setVolume()` aims the riser only**;
   the outgoing keeps falling, which is already the rule for a player that is
   leaving.
5. **A `play()` that lands during a fade-out no longer cuts the departing
   player.** It keeps its own ramp, finishes its fall and releases itself while
   the new bed rises past it. A bed cut at half volume is exactly the click this
   spec exists to remove. ⚠️ **This is the one place the ruling changes an
   existing, tested behaviour** - see §8.

### 4.1 What does not change

- **One-shots are never crossfaded.** The crossfade applies only when the
  outgoing and the incoming are both looping; `loop === false` keeps today's cut,
  because a clip that starts under a ramp is a clip missing its first syllable.
- **`None` is not a swap.** It is `stop()` - a 400 ms fade-out. Going _from_
  `None` to a bed has no outgoing, so it is a plain fade-in, unchanged.
- **Re-tapping the selected chip does nothing.** `useAmbientLane`'s effect is
  keyed on `soundId`, so an identical id never reaches the lane.
- **Breathing needs nothing.** It shares the lane and inherits the code, but its
  Sounds sheet mounts from the _setup_ screen only, so there is no in-session bed
  change there to exercise it.
- **No asset, bundle, preference or screen change.** The crossfade is entirely
  inside `src/lib/lane-player.ts` plus one line of `src/lib/use-ambient-lane.ts`.

### 4.2 Rejected

Keeping the cut (the panel makes it audible on every chip tap, which is the whole
reason the question exists); fade-out-then-fade-in (~800 ms through silence, and
it turns "a `play()` during a fade-out cuts" into "waits", a worse invariant); a
web-only crossfade (the same tap would sound different per platform).

### 4.3 One consequence, recorded and not signalled

A failed `open()` now leaves the **previous bed playing** instead of leaving
silence, because the current player is no longer released before the await. That
is the better outcome, and it is deliberate - but it means the panel's chip and
what is heard can disagree with nothing said about it. This is the same class of
silent divergence §2 accepted for a failed write, and the focus surface takes no
error copy.

## 5. The lane's invariants, as they will read

`src/lib/lane-player.ts` holds these in its doc comment, and
`src/lib/lane-player.test.ts` holds them to it.

**Reworded - one invariant, and only one:**

> **At most TWO live players per lane, and two only while a swap crossfades.** A
> `play` on a bed that is playing at level holds that bed until the new one
> opens, then falls it while the new one rises; a `play` that lands during a
> fade-out lets the departing bed finish its own fall. A third arrival demotes
> the riser and cuts the older fader, so the ceiling of two is never exceeded. A
> `stop` leaves zero live players within `LOOP_FADE_MS`. Nothing is orphaned,
> nothing is released twice.

It replaces _"ONE live player per lane, always. A `play` that lands during a
fade-out cuts the outgoing player (once) and fades the new one in; nothing is
orphaned, nothing is released twice."_

**Unchanged in wording and in behaviour:** `play` rises from 0 to the requested
volume across `LOOP_FADE_MS`; `stop` falls to 0, then releases; a second `stop`
during a fade-out is ignored; `setVolume` retargets a fade-in and is ignored
during a fade-out; `setVolume` applies at once when nothing ramps; a fade-in
landing after `play` awaited setup targets the slider's value; a superseded
`play` is never adopted (the `playGen` guard); one-shots start at full volume and
are cut, not faded; the ramp is a plain `setInterval` with no React owner and so
outlives an unmount.

On web, "player" now reads "source node and its gain": the two existing web cases
assert on `gain.gain.value` and `source.stop()` instead of `el.volume` and
`el.pause()`.

**New, web only:**

|        |                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **W1** | One `AudioContext` per page, created on the first looping play, resumed on every looping play, suspended when no looping lane is live.                                                                                                       |
| **W2** | A looping bed plays through the graph when it can and through the element when it cannot. **The lane's contract is identical on both paths** - including the crossfade, so a fallback browser never hears a cut where another hears a blend. |
| **W3** | A one-shot never enters the graph.                                                                                                                                                                                                           |
| **W4** | The loop window is `[duration − nominal, duration]`; a bed whose decode is longer than its nominal length loops without a hole.                                                                                                              |
| **W5** | At most two decoded beds are resident.                                                                                                                                                                                                       |

## 6. The files ([#2460](https://github.com/Selftend/selftend/issues/2460))

Independent of everything above, and **hygiene rather than the fix**: the 5 ms
hole is inaudible on a gapless looper, so it is not what the owner heard.

Every shipped bed carries a **5-12 ms head ramp** (10-30 dB down at 0 ms) in the
PCM the pipeline encoded. It is not the render, not the encoder, not any decoder.
It is `alimiter` running with ffmpeg's default `latency=0`, which **prepends 219
frames (4.97 ms) of digital zeros** and drops the source's last 219 frames; the
AAC encoder then fills the silence with pre-echo, which decodes as the "ramp". It
is a hole, not a fade.

**The fix is one token and needs no render.** `:latency=1` on the limiter, then
`postprocess run` over the nine masters. Measured: flat heads, the seam gate
green on all nine at 0.74-1.35× (limit 3), −710 bytes total, an identical `elst`.

☠️ **All nine masters are on disk** - `selftend-audio-masters/round-B/beds/` under
the owner's `Downloads`, as `scripts/audio/README.md` records - and every shipped
bed reproduces **byte-identical** through the real `postprocess()` with ffmpeg
7.1.1. The three noise beds also regenerate byte-identical from
`synth-noise.mjs` at seed 1130. [#1571](https://github.com/Selftend/selftend/issues/1571)'s
"the pre-encode masters are on no disk" is stale; **byte-identical reproduction of
the current nine is the precondition of this PR**, not an optional check.

Two corrections ride with it:

- ☠️ **`fire` ships from `fire-c01-a02.wav`, not the `a01` that `choices.jsonl`
  names.** The `a01` take is 29.605 s with a 4.69 ms lead and fails the lead gate;
  the shipped file reproduces only from the `a02` trimmed copy. The record is
  wrong, not the file.
- ☠️ **The lead gate cannot see this class of defect and must also run on the
  normalised master.** It measures the _finished_ file at −60 dBFS, and the
  encoder had lifted 5 ms of digital silence to −10…−31 dB, well above the
  threshold. A master-side lead check closes that.

## 7. The guardrail pass

Item by item, against `AGENTS.md` and `docs/product-principles.md`:

- **Nothing default-on.** The door is a control, not a prompt. The bed's default
  is `None` and stays `None`; nothing in this spec changes a default, adds a
  notification, or contacts anybody.
- **Nothing expectant in the copy.** The door reads `Sound` / `Звук` and nothing
  else, in every state. No bed name, no marker, no "now playing", no empty state,
  no hint. A marker when a bed is on would read as a suggestion when it is off.
- **`None` is first and unmarked**, in the panel exactly as on the home card.
  The volume rail is absent until a bed is chosen, so silence needs no decision.
- **The volume is always reachable.** The sit's bed gains a second place to reach
  its volume, inside the session, without leaving it. `docs/accessibility.md`
  holds that a lane without a volume control is a regression; this moves the
  other way.
- **`en` and `bg` for every new string.** Two keys, both locales, both in §1.5.
  No structured content is added, so nothing needs `returnObjects`.
- **Nothing prescribes a return, and nothing varies by visit.** The panel serves
  the sit in progress. It shows the same thing on every open, carries no date, no
  count, no progress and no streak, and nothing about it is engineered to be
  reopened. Missing a day changes nothing here, because nothing here is counted.
- **No new personal data.** No new column, no new field, no analytics event, no
  third party. The two preference columns already exist and already hold exactly
  this.
- **No new dependency.** Web Audio is a browser API; the crossfade is arithmetic.

## 8. Tests - what pins each piece

**`src/lib/lane-player.test.ts`** - 15 cases today.

⚠️ **Two existing cases have their assertions deliberately rewritten. Flagging it
here so no reviewer reads it as an assertion weakened to match broken behaviour**
(`AGENTS.md`, Correctness & tests): "leaves exactly one live player when `play()`
lands during a fade-out" (native, ~L94) and "keeps one live element when `play()`
lands during a fade-out" (web, ~L250). Both assert today that the departing
player is released **immediately** on the new `play()`. Under §4.5 it is released
**at the end of its own ramp** instead. The rewrites must still assert that the
release happens **exactly once** and that **one player is live** once both ramps
have run - the "nothing orphaned, nothing released twice" half of the invariant is
not what moved. Both are renamed, so the old name stops lying.

**Five new crossfade cases**, each with a web twin wherever the two paths differ
(per W2):

1. A swap holds the outgoing **at level** through the incoming's open, then runs
   both ramps - asserting the outgoing's volume is unchanged while the open is
   pending.
2. A third tap during a crossfade demotes the riser and cuts the older fader:
   never three live, one release each.
3. `stop()` during a crossfade fades **both** to 0 from where each is and
   releases both; zero live within `LOOP_FADE_MS`.
4. `setVolume()` during a crossfade retargets the riser only; the fader's
   trajectory is unchanged.
5. A failed `open()` leaves the previous bed playing at its level, with no
   release.

**The web `describe` grows from 2 to ~8 cases** for §3: rise and fall via gain,
one live source when `play` lands during a fade-out, fallback when the decode
rejects, fallback when the context stays suspended, the context suspended after
release, the loop window on an over-long buffer, a one-shot untouched, and cache
eviction. The crossfade twins land on top of that growth, not beside it.

**New `test/web-audio-mock.ts`** beside `test/expo-audio-mock.ts`: a fake
`AudioContext` with `createBufferSource` / `createGain` / `decodeAudioData` /
`resume` / `suspend` / `state`, and a fake `fetch` returning an `ArrayBuffer`.

**New `mdhd` test** reading each shipped bed's authored length out of its bytes
and asserting it matches the declared `nominalSeconds`. The length is
`(mdhd.duration − elst.media_time) / mdhd.timescale` - **both boxes, not
`mdhd` alone**. Pure byte reading - no `ffprobe` in CI.

☠️ **Why both boxes: the `mdhd` duration on its own is not the nominal length.**
This paragraph asked for `mdhd`'s duration and timescale and nothing else until
build item 1 measured it. `rain.m4a` reads 1324024 / 44100 = **30.023220 s** for
a bed authored to exactly 30 s, because `mdhd` counts the 1024 samples of AAC
encoder priming at the head of the file. The edit list says how many to drop -
every bed carries `elst` with `media_time = 1024` - and subtracting them lands
on 30.000, 29.520 and 29.600 with no remainder. A reader that stops at `mdhd` is
off by exactly the 23 ms hole §3.1.6's loop window exists to skip, so it would
pin every bed to the wrong number.

**`meditation-sit-screen.test.tsx`** gains the panel's cases, including the one
§2 requires: pick `ocean` mid-sit, simulate the rollback (`mockPreferences.data`
back to `rain`, rerender), and assert **no further `play` and no `stop`** - the
lane stays on the pick - and no toast.

**Unchanged:** `test/expo-audio-mock.ts` (`fakePlayers` and `livePlayers()`
already express "how many are live"), `use-breathing-audio.test.tsx`, and
`test/audio-shipped-assets.test.ts` (no asset changes).

## 9. Documents this spec touches

- **`CONTEXT.md` § Sound** - the four glossary terms. Added with this file.
- **`docs/README.md`** - the index entry for this file. Added with this file.
- **`scripts/audio/README.md`** - the per-platform loop record replaces the
  "#1138 established that no platform loops by buffer wrap anyway" paragraph,
  which is measured false for web. Corrected to today's truth with this file; the
  build PR for §3 updates the web line again when the lane moves.
- **`docs/adr/0011-…`** - the reversal. Added with this file.
- **`docs/accessibility.md`** - the `meditation_ambient_volume` bullet gains the
  second place that volume is reachable. **Rides with build item 4.**
- **`docs/modules/meditation-tmi.md` § 7** - one line in the session flow naming
  the sound door. **Rides with build item 4.**
- **`docs/positioning.md`** needs no change. Its "nine looping ambient beds with
  fades" is an audit note, it is true today, and it stays true; nothing in this
  spec claims seamlessness in product copy.

## 10. The build, in dependency order

Six items. **The platform change lands before the control** - items 2 and 3
before item 4 - and the reason is §4: the panel turns every chip tap into a swap,
so shipping the panel onto today's cut-and-rise is exactly the artefact the
crossfade exists to remove.

1. **`nominalSeconds` on the ambient catalogue, pinned by an `mdhd` test.**
   Every `AMBIENT_SOUNDS` row with an asset carries a nominal length - 30.000 for
   seven beds, **29.520 for `fire`, 29.600 for `stream`** - and `none` does not.
   _Acceptance_: the new byte-reading test passes against every shipped bed.
   _Why first_: the web loop window (§3.1.6) reads it.

2. **Lift `ChoiceRow` and `VolumeRail` into shared components.** Both are private
   today - `ChoiceRow` to `src/features/meditation/meditation-home-screen.tsx`,
   `VolumeRail` to `app/(app)/tools/breathing/session.tsx`. A pure move.
   _Acceptance_: the meditation home and the breathing session import them and
   render identically; the existing screen tests pass unchanged.
   _Why here_: item 4 reuses both, and moving them under item 4 would hide a
   refactor inside a feature PR.

3. **The lane plays two beds, and web loops on a buffer.** §3 and §4 in **one
   PR**, because both replace how `lane-player.ts` holds a player and splitting
   them means writing the two-record shape twice and rewriting the same web cases
   twice.
   - `src/lib/use-ambient-lane.ts` loses one line: the swap effect's
     `return () => void lane.stop()` cleanup, which is what makes a bed change a
     `stop()` immediately followed by a `play()`. Safe: the effect body's
     `if (!active)` branch and the separate unmount effect already cover the other
     two cases.
   - `src/lib/lane-player.ts`: the single `handle` + `ramp` + `fadingOut` become a
     small per-player record (`{ handle, ramp, lastVolume }`), at most two, each
     with a role of riser or fader. `release()` stays the one place a player is
     let go and stays idempotent per record. `playGen` keeps guarding a superseded
     `open()`; what changes is that the current record is adopted as the fader
     **after** the await rather than released before it.
   - `openWeb` splits into a graph handle and today's element handle (§3.1.1);
     the context, the two-entry cache, the loop window, the silent fallback and
     `navigator.audioSession.type = "playback"` all land here (§3.1.2-3.1.8).
   - The doc comment carries the reworded invariant and W1-W5 (§5).
     _Acceptance_: the 15 invariants hold, two cases rewritten and renamed per §8,
     five crossfade cases plus web twins, the web `describe` at ~8, the structural
     test of §3.3.1 present, `test/web-audio-mock.ts` added, zero asset or bundle
     change.
     _Docs in this PR_: `docs/adr/0011-…` gains nothing new (it lands with this
     spec) but `scripts/audio/README.md`'s web line moves to "loops on a Web Audio
     buffer; the element is the fallback, never the looper".

4. **The sound door and the sound panel on the sit.** §1 and §2.
   - The door on its own row; the panel as `PressShieldModal surface="sheet"`
     with the header-row `Done`, the radiogroup and the rail; the 620 px desktop
     constraint.
   - The sit screen gains the null-until-picked local pair; the lane and the
     panel both read it; the panel takes it as props.
   - Two new `timer` keys in `en` and `bg` (§1.5).
     _Acceptance_: the accessibility contract of §1.4 holds under keyboard and
     screen reader; the clock does not pause; the door works while paused; back and
     `Finish early` close the panel first; the rollback test of §8 passes; both
     i18n gates pass.
     _Docs in this PR_: `docs/accessibility.md` and `docs/modules/meditation-tmi.md`
     per §9.

5. **The files: `:latency=1`, and the nine masters re-run.** §6. Independent of
   1-4 and lowest priority; it can land at any point.
   _Acceptance_: byte-identical reproduction of the shipped nine **first**; then
   `:latency=1`, flat heads on all nine, the seam gate green, an identical `elst`,
   and `test/audio-shipped-assets.test.ts` still under the 4 MiB ceiling. The
   `choices.jsonl` `fire` entry is corrected to `fire-c01-a02.wav`, and the lead
   check also runs on the normalised master.

6. **The post-build listen.** Owner, on web, after item 3 ships: repeat the
   #2440 run on the same Chrome, **recording the browser version this time**, and
   confirm the fade-in is gone. Not a release gate; the one reading this spec
   cannot supply for itself.

## 11. Not in this spec, and where each thing went

- **An in-session bed change on the breathing session screen.** Same lane, and
  the loop fix and the crossfade reach it for free, but the control is a
  breathing-screen decision with its own shell rulings (#779). A fresh effort.
- **Bells or the bed while the app is suspended.** Ruled out on
  [#1703](https://github.com/Selftend/selftend/issues/1703): a background-audio
  entitlement plus an Android foreground service is a store-review posture change.
- **New beds, or re-rendering the shipped set.** Unrepeatable and credit-priced.
  §6 transcodes what ships; it renders nothing new.
- **Grounding audio.** Ruled out on #1703.
- **The home card's own failed bed write leaking into the sit.** The card keeps
  showing the pick while the query has rolled back, and `Begin` passes the sit
  only `duration` and `bell`, so the sit plays the previous bed. Pre-existing, a
  home-card write rather than a mid-sit one, and its own small issue.
- **The breathing session's bed reverting on a failed Sounds-sheet write.** The
  session reads the bed off the query while its volume rails carry the override.
  Part of the breathing effort above.
- **A pre-decode of the bed on mount** (the #1744 pattern), and **`GainNode`
  automation** in place of the `setInterval` ramp. Both are possible later
  refactors, neither is needed, and §3.1.4 and §3.1.5 record what was accepted
  instead.
- **The bell volume mid-sit.** Killed in §1: the bell is a cue whose level is a
  setup decision.

## Appendix A - premises corrected while assembling

Every one of these was believed at charting and is false. They are recorded
because each one would send a reader the wrong way.

1. **"A gap at the web loop point is a player artifact that no file can fix"** -
   [#1137](https://github.com/Selftend/selftend/issues/1137) required a human to
   listen to each bed looped 10× on web and native. **That listen was never run on
   a platform looper.** The audition that shipped tiles the bed on **decoded PCM**
   by design, so the ear approved the _file's_ seam while the owner hears the
   _player's_. The listen has now been run, on the shipped app, on both phones and
   on web (#2440).

2. **`scripts/audio/README.md`: "no platform loops by buffer wrap anyway"** -
   true of the mechanism, false in its implication. The web element's wrap is a
   full pipeline **seek** that inserts ~10-22 ms of digital silence and skips
   ~10 ms of the bed, so what an ear gets on web is not the file's own seam.
   Corrected with this spec.

3. **"Gecko loops seamlessly by design"** (#2437, from the spec and the
   platform's own documentation) - **false on this file**: Firefox 148 measured
   ~10 ms of silence at the wrap, and `el.duration` reads 30.023 s because Gecko
   ignores the edit list on the element timeline.

4. **"Every bed is 30.000 s"** - `fire.m4a` is **29.520 s** and `stream.m4a`
   **29.600 s**. Both are folded beds, i.e. the seam gate's fold fallback ran on
   them. This is why §3.1.6's loop window is per-bed rather than a constant.

5. **"The pre-encode masters are on no disk"** (#1571) - **stale**. All nine are
   on the owner's disk and every shipped bed reproduces from them byte-identical,
   which is what makes §6 a re-encode rather than a re-render.

6. **`choices.jsonl` names the wrong `fire` master** - `a01`, where the shipped
   file reproduces only from `fire-c01-a02.wav`. The record is wrong, not the file.

7. **"The fade-in at the wrap is the app's fade"** - it is not app code at all.
   `LOOP_FADE_MS` runs only on `play()` and `stop()`; looping is a platform flag
   with no `ended` handler and no second player.

8. **"The 5-12 ms head ramp is in the render"** - it is the pipeline. `alimiter`
   at `latency=0` prepends 219 frames of zeros (§6). #2439 tested the limiter
   alone and the encoder alone and missed the composition of the two.

9. **"The seam is a three-platform problem"** - it is **web-only**. Both phones
   are seamless by ear, and Android is gapless by construction.

10. **"Three labelled controls fit the sit's control row"** (#2436 ruling 3) -
    324 px in `en`, 359 px in `bg`, against a 312 px column. §1.1.

11. **"Persisting the pick is enough"** (#2436 ruling 6) - a lane fed from the
    query alone swaps the bed **back** mid-sit on any failed or offline write,
    because the mutation hook rolls its own optimistic write back. §2.
