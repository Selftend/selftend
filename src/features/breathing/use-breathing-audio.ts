import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import type { PhaseLabel } from "@/src/constants/breathing";
import { ambientSoundLookup, breathSoundLookup } from "@/src/constants/breathing-sounds";
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";

type ExpoAvModule = typeof import("expo-av");
type LoadedSound = {
  setVolumeAsync: (v: number) => Promise<unknown>;
  stopAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
  playAsync: () => Promise<unknown>;
};

let nativeAudioModeConfigured = false;

interface BreathingAudioOptions {
  active: boolean;
  phaseLabel: PhaseLabel | null;
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
}

// A tiny platform-abstracted player so the controller logic stays readable.
interface LanePlayer {
  play: (asset: number, volume: number, loop: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  stop: () => Promise<void>;
}

function createLanePlayer(): LanePlayer {
  if (Platform.OS === "web") {
    let el: HTMLAudioElement | null = null;
    return {
      async play(asset, volume, loop) {
        el?.pause();
        el = new window.Audio(asset as unknown as string);
        el.loop = loop;
        el.volume = volume;
        await el.play().catch(() => {});
      },
      async setVolume(volume) {
        if (el) el.volume = volume;
      },
      async stop() {
        el?.pause();
        el = null;
      },
    };
  }

  let sound: LoadedSound | null = null;
  // Bumped by every play()/stop(); a play() whose async createAsync resolves after it was
  // superseded unloads its orphan sound instead of leaking a looping track.
  let playGen = 0;
  return {
    async play(asset, volume, loop) {
      const gen = ++playGen;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Audio } = require("expo-av") as ExpoAvModule;
        if (!nativeAudioModeConfigured) {
          await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
          nativeAudioModeConfigured = true;
        }
        if (gen !== playGen) return;
        if (sound) {
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
          sound = null;
        }
        const created = await Audio.Sound.createAsync(asset, { isLooping: loop, volume });
        if (gen !== playGen) {
          // A newer play()/stop() ran while we were loading - unload the orphan, don't play.
          await (created.sound as unknown as LoadedSound).unloadAsync().catch(() => {});
          return;
        }
        sound = created.sound as unknown as LoadedSound;
        await sound.playAsync();
      } catch {
        // Audio is best-effort; never crash a breathing session.
      }
    },
    async setVolume(volume) {
      await sound?.setVolumeAsync(volume).catch(() => {});
    },
    async stop() {
      playGen++;
      try {
        await sound?.stopAsync();
        await sound?.unloadAsync();
      } catch {
        // ignore
      }
      sound = null;
    },
  };
}

/** Fire-and-forget one-shot (used for the spoken intro before a session). Self-unloads. */
export function playIntroCue(asset: number, volume: number): void {
  if (Platform.OS === "web") {
    try {
      const el = new window.Audio(asset as unknown as string);
      el.volume = volume;
      void el.play().catch(() => {});
    } catch {
      // best-effort
    }
    return;
  }
  void (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Audio } = require("expo-av") as ExpoAvModule;
      if (!nativeAudioModeConfigured) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        nativeAudioModeConfigured = true;
      }
      const created = await Audio.Sound.createAsync(asset, { volume });
      const s = created.sound as unknown as LoadedSound & {
        setOnPlaybackStatusUpdate?: (
          cb: (st: { isLoaded?: boolean; didJustFinish?: boolean }) => void,
        ) => void;
      };
      await s.playAsync();
      s.setOnPlaybackStatusUpdate?.((st) => {
        if (st.isLoaded && st.didJustFinish) void s.unloadAsync();
      });
    } catch {
      // best-effort
    }
  })();
}

export function useBreathingAudio(opts: BreathingAudioOptions): void {
  const { active, phaseLabel, breathSoundId, ambientSoundId, breathVolume, ambientVolume } = opts;
  const breathLane = useRef<LanePlayer | null>(null);
  const ambientLane = useRef<LanePlayer | null>(null);
  const breathClipRef = useRef<number | null>(null);

  if (!breathLane.current) breathLane.current = createLanePlayer();
  if (!ambientLane.current) ambientLane.current = createLanePlayer();

  // Ambient: start/stop with the session; restart when the chosen sound changes.
  useEffect(() => {
    const lane = ambientLane.current!;
    if (!active) {
      void lane.stop();
      return;
    }
    const asset = ambientSoundLookup[ambientSoundId]?.asset ?? null;
    if (asset !== null) void lane.play(asset, ambientVolume, true);
    else void lane.stop();
    return () => {
      void lane.stop();
    };
    // Volume changes are handled in the volume effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ambientSoundId]);

  // Breath: on each phase (or sound) change, fire the phase's cue / swap the looped texture.
  useEffect(() => {
    const lane = breathLane.current!;
    if (!active) {
      breathClipRef.current = null;
      void lane.stop();
      return;
    }
    const sound = breathSoundLookup[breathSoundId];
    const clip = breathClipFor(phaseLabel, sound);
    if (clip === breathClipRef.current) return;
    breathClipRef.current = clip;
    // Cue sounds (loop === false) fire once at the start of the phase; texture sounds loop.
    if (clip !== null) void lane.play(clip, breathVolume, sound?.loop ?? true);
    else void lane.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, phaseLabel, breathSoundId]);

  // Live volume changes without restarting playback.
  useEffect(() => {
    void breathLane.current?.setVolume(breathVolume);
  }, [breathVolume]);
  useEffect(() => {
    void ambientLane.current?.setVolume(ambientVolume);
  }, [ambientVolume]);

  useEffect(() => {
    return () => {
      void breathLane.current?.stop();
      void ambientLane.current?.stop();
    };
  }, []);
}
