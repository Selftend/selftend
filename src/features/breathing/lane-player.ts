import { Platform } from "react-native";

import { ensureNativeAudioMode, loadExpoAudio } from "@/src/lib/native-audio";

/**
 * One lane of session audio: a looping bed, or the one-shot cue of the moment.
 *
 * Looping playback FADES (#1743): `play` ramps from 0 up to the requested volume and
 * `stop` ramps down to 0 before the player is released, so a pause, a resume and the
 * end of a session no longer cut dead. A bed SWAP is half-faded: the outgoing bed is
 * cut (see `play`) and the incoming one rises from 0. One-shot cues (`loop === false`,
 * the guided voice) are not faded — a clip that starts under a ramp is a clip with its
 * first syllable missing.
 *
 * Invariants the tests hold:
 * - ONE live player per lane, always. A `play` that lands during a fade-out cuts the
 *   outgoing player (once) and fades the new one in; nothing is orphaned, nothing is
 *   released twice.
 * - `setVolume` during a fade-in retargets the ramp, so the live slider still wins
 *   over the value `play` was called with. During a fade-out it is ignored: the bed
 *   is leaving.
 * - The ramp is a plain `setInterval` with no React owner, so it OUTLIVES an unmount:
 *   the hook's cleanup calls `stop`, the fade completes on its own and releases the
 *   player. Nothing is left running past `LOOP_FADE_MS`.
 */
export interface LanePlayer {
  play: (asset: number, volume: number, loop: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
}

/** How long a looping lane takes to fade in or out. One constant, both directions. */
export const LOOP_FADE_MS = 400;
// Twenty-odd steps across the ramp: fine enough that a bed does not audibly stair-step,
// coarse enough that fake-timer tests stay cheap.
const FADE_STEP_MS = 20;

/** What the two platforms have in common once a sound is open. */
interface LaneHandle {
  setVolume: (volume: number) => void;
  release: () => void;
}

async function openWeb(asset: number, volume: number, loop: boolean): Promise<LaneHandle> {
  const el = new window.Audio(asset as unknown as string);
  el.loop = loop;
  el.volume = volume;
  await el.play().catch(() => {});
  return {
    setVolume: (v) => {
      el.volume = v;
    },
    release: () => el.pause(),
  };
}

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

export function createLanePlayer(): LanePlayer {
  const open = Platform.OS === "web" ? openWeb : openNative;
  let handle: LaneHandle | null = null;
  let looping = false;
  let fadingOut = false;
  // Bumped by every play()/stop(); a play() that resumes after awaiting the
  // audio-mode setup only proceeds if it hasn't been superseded meanwhile.
  let playGen = 0;
  // Where the volume actually is, ramp or not: a fade-out starts from here, so a
  // slider move applied while idle is not undone by a jump when the bed leaves.
  let lastVolume = 0;
  // Where the caller wants it. Set by play() and overwritten by every setVolume(),
  // including one that lands while play() is still awaiting the audio-mode setup -
  // the fade-in then targets the slider's value, not the one play() was called with.
  let requestedVolume = 0;

  const applyVolume = (volume: number) => {
    lastVolume = volume;
    try {
      handle?.setVolume(volume);
    } catch {
      // A player released underneath us. The ramp keeps ticking into this catch
      // until it finishes (at most LOOP_FADE_MS) - harmless, and simpler than
      // cancelling from inside the apply callback.
    }
  };
  const ramp = createVolumeRamp(applyVolume);

  // The ONE place a player is let go. Idempotent: `handle` is nulled before anything
  // else can observe it, so a ramp's completion and a later stop() cannot both release.
  const release = () => {
    ramp.cancel();
    const h = handle;
    handle = null;
    fadingOut = false;
    try {
      h?.release();
    } catch {
      // ignore
    }
  };

  return {
    async play(asset, volume, loop) {
      const gen = ++playGen;
      requestedVolume = volume;
      // Whatever is playing - or fading out - is cut here, once. A crossfade would
      // need two live players and a second set of invariants; the bed that is leaving
      // is already on its way to 0, and the new one rises from 0 either way.
      release();
      try {
        const opened = await open(asset, loop ? 0 : volume, loop);
        if (gen !== playGen) {
          // Superseded while the audio mode was being set up: never adopt it.
          try {
            opened.release();
          } catch {
            // ignore
          }
          return;
        }
        handle = opened;
        looping = loop;
        if (loop) ramp.start(0, requestedVolume);
        else if (requestedVolume !== volume) applyVolume(requestedVolume);
      } catch {
        // Audio is best-effort; never crash a breathing session.
      }
    },
    async setVolume(volume) {
      requestedVolume = volume;
      if (!handle || fadingOut) return;
      if (ramp.running) {
        ramp.retarget(volume);
        return;
      }
      applyVolume(volume);
    },
    async stop() {
      playGen++;
      // No handle means no ramp either: release() cancels the ramp whenever it
      // nulls the handle, and play() releases before it awaits.
      if (!handle) return;
      if (!looping) {
        release();
        return;
      }
      if (fadingOut) return;
      fadingOut = true;
      // From wherever the volume is - mid fade-in included - down to 0, then let go.
      ramp.start(lastVolume, 0, release);
    },
  };
}
