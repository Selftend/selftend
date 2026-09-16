# ADR-0011: The web bed loops on a Web Audio buffer, and a lane holds two players while a swap crossfades

Date: 2026-09-16 · Status: accepted · Origin: #2428 (map; #2441 ruled the player
per platform, #2484 ruled the swap) · Recorded by: #2443 · Spec: `docs/sound.md`

## Context

Selftend plays every looping background sound - a **bed** - through one lane
implementation, `src/lib/lane-player.ts`, shared by the meditation sit and the
breathing session. Two rulings made that lane what it is today, and this ADR
reverses a piece of each.

[#1743](https://github.com/Selftend/selftend/issues/1743) gave the lane its
fades and, with them, the rule the file's doc comment still states: **one live
player per lane, always.** A bed swap was deliberately left half-faded - the
outgoing player cut, the incoming one rising from 0 - because a crossfade needs
two live players and a second set of invariants, and at the time nothing in the
product let a person change a bed while a session was running. The bed was chosen
on a setup screen, before anything played.

[#1138](https://github.com/Selftend/selftend/issues/1138) recorded that no
platform loops a bed by wrapping a buffer - iOS duplicates an `AVPlayerItem`,
Android sets `REPEAT_MODE_ONE`, web sets `HTMLAudioElement.loop` - and
[#1137](https://github.com/Selftend/selftend/issues/1137) accordingly required a
human to listen to each bed looped ten times on web and native, on the reasoning
that _a gap at the web loop point is a player artifact that no file can fix_.
The audition that shipped tiles the bed on **decoded PCM** by design, so the ear
that approved each bed approved the file's own seam. **The platform-looper listen
#1137 asked for was never run.**

The owner ran it, on the shipped app, in September 2026, and reported two things
about the meditation sit: the background sound cannot be changed from inside a
sitting, and on web _"the transition when the bg sound ends and it starts anew is
not seamless - there is a short pause and fade in."_

Measurement (#2439) found the pause is a **seek**, not a fade and not the app's
ramp: on the media element the wrap inserts ~22 ms then ~19 ms of digital silence
on Chromium and ~10 ms on Firefox, and skips ~10 ms of the bed each time.
Chromium's tracker ruled this infeasible to fix in 2024; WebKit's equivalent bug
has been open since 2021. Gecko's documented seamless looping does not hold on
these files. The same measurement found `decodeAudioData` plus
`AudioBufferSourceNode.loop` **sample-exact** in every engine. On the two phones
the owner heard no seam at all (#2440), and Android is gapless by construction.

Separately, the decision to put a bed picker **inside** a running sit (#2436,
#2442) turns every chip tap into an audible swap. #1743's cut was chosen when no
such surface existed; the surface now exists.

## Decision

**Two reversals, both scoped to the lane, both recorded here because each undoes
a rule a previous ticket set deliberately.**

### 1. On web, the looping bed plays through a Web Audio buffer. The media element becomes the fallback, never the looper.

`fetch` → `decodeAudioData` → `AudioBufferSourceNode` (`loop = true`) →
`GainNode` → destination, behind the existing `LanePlayer` interface, so the
hook, the sit and the breathing session do not change. One-shots - the guided
voice and the bells - stay on the element and are never admitted to the graph.

The element remains as a **silent fallback** for three named conditions: no
`AudioContext` constructor, a rejected decode, or a context that is not `running`
after `resume()`. The fallback is today's code and today's seam; it is never
silence. This is not hypothetical - the beds' major brand is `M4A `, exactly the
brand a Safari 27 beta rejected with `EncodingError` until 2026-07-27.

**iOS and Android do nothing.** `expo-audio`'s `loop` flag stays on both.

Five web-only invariants come with it, and they are the substance of the
reversal:

- **W1** One `AudioContext` per page, created on the first looping play, resumed
  on every looping play, suspended when no looping lane is live.
- **W2** A looping bed plays through the graph when it can and through the
  element when it cannot; the lane's contract is identical on both paths.
- **W3** A one-shot never enters the graph.
- **W4** The loop window is `[duration − nominal, duration]`, which is exact when
  the decoder trimmed priming and a guard when it did not.
- **W5** At most two decoded beds are resident (~23 MB).

### 2. A bed swap crossfades, on every platform, and the one-live-player rule becomes a ceiling of two.

The outgoing bed **holds at level until the incoming can start**, then both ramps
run together over the existing `LOOP_FADE_MS`. Both ramps stay linear and the
ramp helper is untouched. A `play()` that lands during a fade-out no longer cuts
the departing player; it finishes its own fall while the new one rises.

#1743's invariant is reworded:

> **At most TWO live players per lane, and two only while a swap crossfades.** A
> `play` on a bed that is playing at level holds that bed until the new one
> opens, then falls it while the new one rises; a `play` that lands during a
> fade-out lets the departing bed finish its own fall. A third arrival demotes
> the riser and cuts the older fader, so the ceiling of two is never exceeded. A
> `stop` leaves zero live players within `LOOP_FADE_MS`. Nothing is orphaned,
> nothing is released twice.

**The ceiling of two is the same two as W5.** The graph's residency limit and the
lane's player limit are one constraint counted from two directions, not two
constraints that happen to agree - a crossfade on web is a second source and gain
on the same context, decoding the bed W5 already allows. Read together they say:
a lane is never mid-swap between more than two beds, on any platform, in any
code path.

The other fourteen invariants are untouched in wording and in behaviour.

## Consequences

- **The seam the owner reported is removed on web and was never present on the
  phones.** Both readings of what was heard - the measured silence-then-step and
  the reported swell - are removed by a sample-exact loop.
- **A bed can be changed from inside a running session without a click.** That is
  what makes the sound panel shippable; on the old cut, every chip tap would have
  been the artefact this map set out to remove.
- **Two existing tests change their assertions**, and the change is deliberate:
  the two cases that pin "a `play` during a fade-out releases the departing
  player immediately" now pin "it is released at the end of its own ramp". Both
  must still assert the release happens exactly once. Flagged in `docs/sound.md`
  §8 so it is not read as an assertion weakened to match broken behaviour.
- **A failed `open()` now leaves the previous bed playing** instead of leaving
  silence, because the current player is no longer released before the await.
  Better, and deliberate - but the panel's chip and what is heard can disagree
  with nothing said about it, which is the same silent divergence the product
  already accepts for a failed preference write.
- **On a cold bed on web, sound lands a beat after the tap** while the chip
  highlights immediately, because the outgoing holds until `fetch` and decode
  resolve. Accepted: the alternative is a hole whose length is not ours to bound.
- **Two complementary linear ramps dip ~3 dB for ~100 ms mid-swap.** Accepted
  rather than adding an equal-power curve, which would cost the `setInterval`
  ramp the fake-timer assertions depend on.
- **Zero asset, bundle, dependency or preference change.** 19 files, 3.41 MiB,
  the 4 MiB ceiling untouched; `expo-audio` stays out of the web bundle.
- **The phone listen is now a standing obligation with one trigger**, recorded in
  `scripts/audio/README.md`: an `expo-audio` upgrade whose diff touches the iOS
  looper, or a Safari major. Apple's own headers say "as gaplessly as possible
  ... not guaranteed", so iOS is seamless by measurement, not by contract.

## Alternatives rejected

- **Leave web on the element.** The artefact is what started the map, and the
  platform will not fix it: Chromium ruled it infeasible, WebKit's bug is four
  years old.
- **Two staggered elements self-crossfading at the seam.** Each element still
  seeks at its own wrap, and the crossfade is scheduled off a main-thread timer
  with ±4-16 ms jitter against a ~20 ms artefact.
- **Opus in Ogg/WebM for web.** The wrap is a seek, not a codec problem. It also
  adds ~2.1 MB against a 4 MiB ceiling and is a second lossy generation.
- **Media Source Extensions.** Fragmented MP4 plus a timeline and eviction the
  page manages forever, for nothing Web Audio does not do.
- **Rotating the loop point, or re-rendering the beds.** Rotating moves the head
  hole into the interior; re-rendering is credit-priced and non-deterministic.
- **Keeping the cut on swap.** The panel makes it audible on every tap.
- **Fade-out then fade-in.** ~800 ms through silence, and it turns "a `play`
  during a fade-out cuts" into "waits" - a worse invariant than either.
- **A web-only crossfade.** The same tap would sound different per platform.
- **`GainNode` automation in place of the `setInterval` ramp.** It would make the
  ramp unobservable to the fake-timer assertions that hold fourteen unchanged
  invariants, for a change nobody heard a need for. A possible later refactor.
