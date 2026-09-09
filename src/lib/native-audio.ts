import { Platform } from "react-native";

// Shared native-audio glue for the one-shot and lane players (breathing,
// timer). expo-audio is lazy-required inside the native branches so it stays
// out of the web bundle — web plays through HTMLAudioElement instead.
type ExpoAudioModule = typeof import("expo-audio");
type NativeAudioPlayer = ReturnType<ExpoAudioModule["createAudioPlayer"]>;

// One configuration per app run, shared by everyone who asks while it is still in
// flight: a sit screen prepares its bells in one tick (#1744) and the global
// session is configured once for the three of them, not once each. A failed
// attempt is forgotten, so the next sound tries again.
let nativeAudioMode: Promise<void> | null = null;

export function loadExpoAudio(): ExpoAudioModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- native-only path; lazy require keeps expo-audio out of the web bundle
  return require("expo-audio") as ExpoAudioModule;
}

async function configureNativeAudioMode(audio: ExpoAudioModule): Promise<void> {
  await audio.setAudioModeAsync({ playsInSilentMode: true });
}

/** Plays through the iOS mute switch, once per app run. */
export function ensureNativeAudioMode(audio: ExpoAudioModule): Promise<void> {
  if (nativeAudioMode === null) {
    const attempt = configureNativeAudioMode(audio);
    nativeAudioMode = attempt;
    // Forgotten AFTER it is stored, never inside the attempt: a setup that fails
    // synchronously would otherwise reset the latch first and then be stored over
    // it, wedging every later sound on a rejection. Guarded on identity so a
    // retry that is already in flight is not thrown away by the old failure.
    attempt.catch(() => {
      if (nativeAudioMode === attempt) nativeAudioMode = null;
    });
  }
  return nativeAudioMode;
}

/**
 * A one-shot loaded AHEAD of its moment (#1744). `playOneShot` builds its player
 * when the sound is due, so the first bell of a sit - fired the instant the sit
 * starts - arrived late by the asset load. A screen that knows which sounds it
 * will certainly play prepares them on mount and only calls `play` at the moment.
 *
 * Single-use. `play` hands the player to the same self-release listener the
 * one-shot has always used; `release` lets go of a player that was never played
 * (the screen left before its moment) and is a no-op after `play`.
 *
 * Volume is decided at `play`, not at preparation: the preference query can
 * resolve in between. The #1188 rule stays the caller's - prepare nothing at 0,
 * so a user who muted the bells never has the global audio session configured
 * on their behalf - and holds again at `play`: 0 plays nothing and leaves the
 * sound prepared.
 */
export interface PreparedOneShot {
  play: (volume: number) => void;
  release: () => void;
}

function prepareWebOneShot(asset: number): PreparedOneShot {
  let el: HTMLAudioElement | null = null;
  try {
    el = new window.Audio(asset as unknown as string);
    // The default is the browser's to choose ("metadata" in some); ask for the
    // whole clip now, so `play` at the moment does not fetch first.
    el.preload = "auto";
  } catch {
    // best-effort
  }
  return {
    play(volume) {
      const target = el;
      if (!target || !(volume > 0)) return;
      el = null;
      try {
        target.volume = volume;
        void target.play().catch(() => {});
      } catch {
        // best-effort
      }
    },
    release() {
      // Nothing to free: an element that never played is garbage once dropped.
      el = null;
    },
  };
}

function prepareNativeOneShot(asset: number): PreparedOneShot {
  let player: NativeAudioPlayer | null = null;
  let modeReady: Promise<void> = Promise.resolve();
  try {
    const audio = loadExpoAudio();
    modeReady = ensureNativeAudioMode(audio);
    // Observed here so a sound prepared and then released, never played, does not
    // leave a failed setup as an unhandled rejection; `play` observes it again.
    void modeReady.catch(() => {});
    const owned = audio.createAudioPlayer(asset);
    owned.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) owned.remove();
    });
    player = owned;
  } catch {
    // best-effort: audio must never crash a session
  }
  return {
    play(volume) {
      const target = player;
      if (!target || !(volume > 0)) return;
      player = null;
      void (async () => {
        try {
          await modeReady;
          target.volume = volume;
          target.play();
        } catch {
          // A player that never started is still a native handle; do not leak it.
          try {
            target.remove();
          } catch {
            // ignore
          }
        }
      })();
    },
    release() {
      const target = player;
      player = null;
      try {
        target?.remove();
      } catch {
        // ignore
      }
    },
  };
}

/** Load a one-shot now; play it later, once. See `PreparedOneShot`. */
export function prepareOneShot(asset: number): PreparedOneShot {
  return Platform.OS === "web" ? prepareWebOneShot(asset) : prepareNativeOneShot(asset);
}

/**
 * Fire-and-forget one-shot (timer bells, spoken intro cues). Self-releases
 * when playback finishes. Best-effort: audio must never crash a session.
 */
export function playOneShot(asset: number, volume: number): void {
  // Silence is not a quiet sound: at 0 there is nothing to hear, so skip the
  // work entirely (#1188). On native that also means never reaching
  // ensureNativeAudioMode - a user who turns the bells off does not have the
  // app's global audio session configured on their behalf for nothing.
  if (!(volume > 0)) return;
  prepareOneShot(asset).play(volume);
}
