import { Platform } from "react-native";

import { ensureNativeAudioMode, loadExpoAudio } from "@/src/lib/native-audio";

/**
 * One lane of session audio: a looping bed, or the one-shot cue of the moment.
 *
 * Looping playback FADES (#1743): `play` ramps from 0 up to the requested volume and
 * `stop` ramps down to 0 before the player is released, so a pause, a resume and the
 * end of a session no longer cut dead. A bed SWAP CROSSFADES (#2484, `docs/sound.md`
 * §4): the outgoing bed holds at level until the incoming one can start, then both
 * ramps run together over `LOOP_FADE_MS`. One-shot cues (`loop === false`, the guided
 * voice) are never crossfaded — a clip that starts under a ramp is a clip with its
 * first syllable missing.
 *
 * On web a LOOPING bed plays through a Web Audio buffer loop (#2441, §3): the element's
 * `loop` is a full pipeline seek with ~20 ms of digital silence in it on Chromium and
 * ~10 ms on Firefox, while an `AudioBufferSourceNode` loop measured sample-exact. The
 * element stays as a silent fallback, never as silence, and one-shots never leave it.
 * iOS and Android loop seamlessly already and are untouched.
 *
 * Invariants the tests hold:
 * - At most TWO live players per lane, and two only while a swap crossfades. A `play`
 *   on a bed that is playing at level holds that bed until the new one opens, then
 *   falls it while the new one rises; a `play` that lands during a fade-out lets the
 *   departing bed finish its own fall. A third arrival demotes the riser and cuts the
 *   older fader, so the ceiling of two is never exceeded. A `stop` leaves zero live
 *   players within `LOOP_FADE_MS`. Nothing is orphaned, nothing is released twice.
 * - `setVolume` during a fade-in retargets the ramp, so the live slider still wins
 *   over the value `play` was called with. During a fade-out it is ignored: the bed
 *   is leaving. Mid-crossfade it aims the RISER only.
 * - The ramp is a plain `setInterval` with no React owner, so it OUTLIVES an unmount:
 *   the hook's cleanup calls `stop`, the fade completes on its own and releases the
 *   player. Nothing is left running past `LOOP_FADE_MS`.
 *
 * Web only:
 * - W1: one `AudioContext` per page, created on the first looping play, resumed on
 *   every looping play, suspended when no looping lane is live.
 * - W2: a looping bed plays through the graph when it can and through the element when
 *   it cannot, and the lane's contract is IDENTICAL on both paths — including the
 *   crossfade, so a fallback browser never hears a cut where another hears a blend.
 * - W3: a one-shot never enters the graph.
 * - W4: the loop window is `[duration − nominal, duration]`, so a bed whose decode kept
 *   the AAC priming loops without a hole.
 * - W5: at most two decoded beds are resident.
 */
export interface LanePlayer {
  /**
   * `nominalSeconds` is the length the bed was authored to, from its `AMBIENT_SOUNDS`
   * row — the web loop window (§3.1.6) needs it, and nothing else does. Absent means
   * "loop the whole buffer", which is what a lane with no catalogue row wants.
   */
  play: (asset: number, volume: number, loop: boolean, nominalSeconds?: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
}

/** How long a looping lane takes to fade in or out. One constant, all three directions. */
export const LOOP_FADE_MS = 400;
// Twenty-odd steps across the ramp: fine enough that a bed does not audibly stair-step,
// coarse enough that fake-timer tests stay cheap.
const FADE_STEP_MS = 20;

/** What the two platforms have in common once a sound is open. */
interface LaneHandle {
  setVolume: (volume: number) => void;
  release: () => void;
}

type OpenLane = (
  asset: number,
  volume: number,
  loop: boolean,
  nominalSeconds?: number,
) => Promise<LaneHandle>;

// ---------------------------------------------------------------------------
// Web: the buffer graph, and the element it falls back to
// ---------------------------------------------------------------------------

// On web `require("...m4a")` resolves to a URL string, which is what both the element
// and the fetch want. The `number` in the signature is the native asset-module id.
const assetUrl = (asset: number) => asset as unknown as string;

function openWebElement(asset: number, volume: number, loop: boolean): LaneHandle {
  const el = new window.Audio(assetUrl(asset));
  el.loop = loop;
  el.volume = volume;
  void el.play().catch(() => {});
  return {
    setVolume: (v) => {
      el.volume = v;
    },
    release: () => el.pause(),
  };
}

type AudioContextCtor = new () => AudioContext;

// W1: one context per page. Module-level and lazily built on the FIRST looping play —
// never at import and never on a screen mount, so a page that plays no bed never
// constructs one. The bed starts from a focus effect after the home screen's tap,
// exactly where the element's play() runs and succeeds today, so the gesture footing
// is the same one the element has always stood on.
let sharedContext: AudioContext | null = null;
// How many graph beds are live. The context is suspended when this reaches 0 so a lane
// that has faded out is not holding the page's audio hardware open.
let liveGraphBeds = 0;
let audioSessionSet = false;

function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  const g = globalThis as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctor) return null;
  try {
    sharedContext = new Ctor();
  } catch {
    return null;
  }
  return sharedContext;
}

/**
 * iOS Safari plays a Web Audio graph through the mute switch and keeps it alive on
 * backgrounding only with this set, which is the parity the element already has and
 * the native app asks for with `playsInSilentMode`. Best-effort: the property does
 * not exist outside Safari, and setting it can throw on an unknown value.
 */
function ensureWebAudioSession() {
  if (audioSessionSet) return;
  audioSessionSet = true;
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  } catch {
    // best-effort
  }
}

// W5: the playing bed and the previous one, so a pause → resume is instant and a swap
// BACK costs no decode. A third bed evicts the oldest. ~10.6 MB decoded per bed at
// 44.1 kHz, so ≤ ~23 MB resident. The promise is cached rather than the buffer, so two
// plays racing the same cold bed decode it once.
const DECODE_CACHE_SIZE = 2;
const decodeCache = new Map<string, Promise<AudioBuffer>>();

function decodeBed(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const cached = decodeCache.get(url);
  if (cached) {
    // Re-insert so the least recently PLAYED bed is the one evicted, not the least
    // recently decoded: a swap back to the previous bed must keep it resident.
    decodeCache.delete(url);
    decodeCache.set(url, cached);
    return cached;
  }
  const pending = (async () => {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    return await ctx.decodeAudioData(bytes);
  })();
  // A rejected decode is not a fact about the bed forever — the next play refetches
  // rather than falling back to the element for the rest of the page's life.
  pending.catch(() => {
    if (decodeCache.get(url) === pending) decodeCache.delete(url);
  });
  decodeCache.set(url, pending);
  while (decodeCache.size > DECODE_CACHE_SIZE) {
    const oldest = decodeCache.keys().next().value;
    if (oldest === undefined) break;
    decodeCache.delete(oldest);
  }
  return pending;
}

async function openWebGraph(
  asset: number,
  volume: number,
  nominalSeconds: number | undefined,
): Promise<LaneHandle> {
  const ctx = getAudioContext();
  if (!ctx) throw new Error("no AudioContext");
  ensureWebAudioSession();
  const buffer = await decodeBed(ctx, assetUrl(asset));
  await ctx.resume().catch(() => {});
  // A context that never reaches `running` would play silence; the element would at
  // least play the bed with its seam. §3.1.7: the fallback is never silence.
  if (ctx.state !== "running") throw new Error("AudioContext not running");

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  // W4. `decodeAudioData` trims the 1024 samples of AAC priming in every engine
  // measured, which lands this on exactly 0; on one that does not, it skips exactly
  // the priming instead of wrapping into the ~23 ms hole at the head of the file.
  // Clamped because a nominal length longer than the decode would otherwise be a
  // negative start offset.
  const loopStart =
    nominalSeconds === undefined ? 0 : Math.max(0, buffer.duration - nominalSeconds);
  source.loopStart = loopStart;
  source.loopEnd = buffer.duration;

  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  // Start at the first authored sample, not at the priming that precedes it.
  source.start(0, loopStart);
  liveGraphBeds += 1;

  let released = false;
  return {
    // The lane's `setInterval` ramp writes `gain.gain.value` directly rather than
    // scheduling automation, so every existing fade invariant holds verbatim (§3.1.5).
    setVolume: (v) => {
      gain.gain.value = v;
    },
    release: () => {
      if (released) return;
      released = true;
      try {
        source.stop();
      } catch {
        // A source that never started, or already stopped.
      }
      source.disconnect();
      gain.disconnect();
      liveGraphBeds -= 1;
      if (liveGraphBeds <= 0) void ctx.suspend().catch(() => {});
    },
  };
}

async function openWeb(
  asset: number,
  volume: number,
  loop: boolean,
  nominalSeconds?: number,
): Promise<LaneHandle> {
  // W3: one-shots never enter the graph. They are cut, not faded, and a clip does not
  // loop, so the graph buys them nothing and would cost them a decode.
  if (!loop) return openWebElement(asset, volume, false);
  try {
    return await openWebGraph(asset, volume, nominalSeconds);
  } catch {
    // §3.1.7, silently: no constructor, a decode that rejects, or a context that never
    // reaches `running`. Today's code and today's seam — which is a seam, not silence.
    return openWebElement(asset, volume, true);
  }
}

// ---------------------------------------------------------------------------
// Native: unchanged. Both platforms loop seamlessly already (#2440).
// ---------------------------------------------------------------------------

async function openNative(asset: number, volume: number, loop: boolean): Promise<LaneHandle> {
  const audio = loadExpoAudio();
  await ensureNativeAudioMode(audio);
  const player = audio.createAudioPlayer(asset);
  try {
    player.loop = loop;
    player.volume = volume;
    player.play();
  } catch (error) {
    // A player that never started is still a native handle; do not leak it.
    player.remove();
    throw error;
  }
  return {
    setVolume: (v) => {
      player.volume = v;
    },
    release: () => player.remove(),
  };
}

/**
 * A linear volume ramp on `setInterval`. `retarget` moves the destination while the
 * ramp runs; the remaining steps are re-aimed at the new target from wherever the
 * volume is now, so a retarget never jumps.
 */
function createVolumeRamp(apply: (volume: number) => void) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let current = 0;
  let target = 0;
  let stepsLeft = 0;
  let onDone: (() => void) | null = null;

  const clear = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    onDone = null;
  };

  return {
    get running() {
      return timer !== null;
    },
    start(from: number, to: number, done?: () => void) {
      clear();
      current = from;
      target = to;
      onDone = done ?? null;
      stepsLeft = Math.max(1, Math.round(LOOP_FADE_MS / FADE_STEP_MS));
      apply(current);
      timer = setInterval(() => {
        stepsLeft -= 1;
        // Divide what is left evenly over the steps that are left; the last step
        // lands exactly on the target.
        current = stepsLeft <= 0 ? target : current + (target - current) / (stepsLeft + 1);
        apply(current);
        if (stepsLeft <= 0) {
          const finish = onDone;
          clear();
          finish?.();
        }
      }, FADE_STEP_MS);
    },
    retarget(to: number) {
      target = to;
    },
    /** Stop ramping where it is. The `done` callback is dropped, not fired. */
    cancel: clear,
  };
}

/**
 * One live player and everything the lane needs to move it: its own ramp, so two
 * players can ramp in opposite directions at once, and where its volume actually is,
 * so a fall starts from there rather than jumping.
 */
interface LaneBed {
  handle: LaneHandle;
  ramp: ReturnType<typeof createVolumeRamp>;
  volume: number;
  looping: boolean;
  released: boolean;
}

export function createLanePlayer(): LanePlayer {
  const open: OpenLane = Platform.OS === "web" ? openWeb : openNative;
  // The bed the lane is playing — the one a setVolume aims at, the one a stop fades.
  let current: LaneBed | null = null;
  // Beds on their way to 0, each finishing its own ramp and releasing itself. Normally
  // one (the outgoing half of a crossfade); two only for the moment a stop() catches a
  // crossfade in progress, when `current` is null and both halves are falling.
  let outgoing: LaneBed[] = [];
  // Bumped by every play()/stop(); a play() that resumes after awaiting the audio-mode
  // setup, or a fetch and a decode, only proceeds if it hasn't been superseded meanwhile.
  let playGen = 0;
  // Where the caller wants it. Set by play() and overwritten by every setVolume(),
  // including one that lands while play() is still awaiting setup - the fade-in then
  // targets the slider's value, not the one play() was called with.
  let requestedVolume = 0;

  const createBed = (handle: LaneHandle, volume: number, looping: boolean): LaneBed => {
    const bed: LaneBed = {
      handle,
      volume,
      looping,
      released: false,
      ramp: createVolumeRamp((v) => {
        bed.volume = v;
        try {
          bed.handle.setVolume(v);
        } catch {
          // A player released underneath us. The ramp keeps ticking into this catch
          // until it finishes (at most LOOP_FADE_MS) - harmless, and simpler than
          // cancelling from inside the apply callback.
        }
      }),
    };
    return bed;
  };

  // The ONE place a player is let go. Idempotent per bed: `released` is set before
  // anything else can observe it, so a ramp's completion and a later stop() cannot
  // both release the same player.
  const release = (bed: LaneBed) => {
    if (bed.released) return;
    bed.released = true;
    bed.ramp.cancel();
    outgoing = outgoing.filter((b) => b !== bed);
    if (current === bed) current = null;
    try {
      bed.handle.release();
    } catch {
      // ignore
    }
  };

  /** Send a bed down its own fade-out, from wherever it is, and release it at the end. */
  const fadeOut = (bed: LaneBed) => {
    if (current === bed) current = null;
    if (!outgoing.includes(bed)) outgoing.push(bed);
    bed.ramp.start(bed.volume, 0, () => release(bed));
  };

  const releaseAll = () => {
    if (current) release(current);
    for (const bed of [...outgoing]) release(bed);
  };

  return {
    async play(asset, volume, loop, nominalSeconds) {
      const gen = ++playGen;
      requestedVolume = volume;
      // A one-shot is not a swap: it is cut in, today's behaviour, because a clip that
      // starts under a ramp is a clip missing its first syllable.
      if (!loop) releaseAll();
      try {
        const opened = await open(asset, loop ? 0 : volume, loop, nominalSeconds);
        if (gen !== playGen) {
          // Superseded while the setup, the fetch or the decode was in flight: never
          // adopt it. The bed that is playing keeps playing.
          try {
            opened.release();
          } catch {
            // ignore
          }
          return;
        }
        // ☠️ The crossfade lives in these three lines, and the ORDER is the ruling
        // (§4.1): the outgoing bed is demoted here, AFTER the open resolved, not
        // released before the await. That is what closes the hole over the native
        // audio-mode setup and over a cold fetch + decode on web.
        if (loop) {
          const departing = current;
          // At most one outgoing at a time (§4.2). A third tap cuts whatever is still
          // on its way down, so the ceiling of two live players holds on every path.
          const keep = departing ?? outgoing[outgoing.length - 1];
          for (const bed of [...outgoing]) if (bed !== keep) release(bed);
          // A bed already falling keeps its OWN ramp and finishes its own fall (§4.5);
          // only one still at level is started on a new one.
          if (departing) fadeOut(departing);
        }
        const bed = createBed(opened, loop ? 0 : volume, loop);
        current = bed;
        if (loop) bed.ramp.start(0, requestedVolume);
        else if (requestedVolume !== volume) {
          bed.volume = requestedVolume;
          bed.handle.setVolume(requestedVolume);
        }
      } catch {
        // Audio is best-effort; never crash a session. §4.3: a failed open now leaves
        // the PREVIOUS bed playing rather than leaving silence, deliberately.
      }
    },
    async setVolume(volume) {
      requestedVolume = volume;
      // No current bed means either nothing is playing or everything is leaving, and a
      // bed that is leaving is not pulled back up. Mid-crossfade this aims the riser
      // only; the fader's trajectory is already decided.
      if (!current) return;
      if (current.ramp.running) {
        current.ramp.retarget(volume);
        return;
      }
      current.volume = volume;
      try {
        current.handle.setVolume(volume);
      } catch {
        // ignore
      }
    },
    async stop() {
      playGen++;
      if (current && !current.looping) {
        release(current);
        return;
      }
      // Both halves of a crossfade fall from where each one is and both are released
      // (§4.4); a second stop() finds no current bed and leaves the ramps alone, so it
      // neither restarts a fade nor pushes the release out.
      if (current) fadeOut(current);
    },
  };
}
