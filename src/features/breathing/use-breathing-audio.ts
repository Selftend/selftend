import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { AudioPlayer } from "expo-audio";

import type { PhaseLabel } from "@/src/constants/breathing";
import { ambientSoundLookup, breathSoundLookup } from "@/src/constants/breathing-sounds";
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { ensureNativeAudioMode, loadExpoAudio, playOneShot } from "@/src/lib/native-audio";

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

  let player: AudioPlayer | null = null;
  // Bumped by every play()/stop(); a play() that resumes after awaiting the
  // audio-mode setup only proceeds if it hasn't been superseded meanwhile.
  let playGen = 0;
  return {
    async play(asset, volume, loop) {
      const gen = ++playGen;
      try {
        const audio = loadExpoAudio();
        await ensureNativeAudioMode(audio);
        if (gen !== playGen) return;
        player?.remove();
        player = audio.createAudioPlayer(asset);
        player.loop = loop;
        player.volume = volume;
        player.play();
      } catch {
        // Audio is best-effort; never crash a breathing session.
      }
    },
    async setVolume(volume) {
      try {
        if (player) player.volume = volume;
      } catch {
        // ignore
      }
    },
    async stop() {
      playGen++;
      try {
        player?.remove();
      } catch {
        // ignore
      }
      player = null;
    },
  };
}

/** Fire-and-forget one-shot (used for the spoken intro before a session). Self-releases. */
export function playIntroCue(asset: number, volume: number): void {
  playOneShot(asset, volume);
}

export function useBreathingAudio(opts: BreathingAudioOptions): void {
  const { active, phaseLabel, breathSoundId, ambientSoundId, breathVolume, ambientVolume } = opts;
  // Lazy useState instead of a render-written ref: same one-instance-per-mount
  // semantics, no ref access during render.
  const [breathLane] = useState(createLanePlayer);
  const [ambientLane] = useState(createLanePlayer);
  const breathClipRef = useRef<number | null>(null);

  // Ambient: start/stop with the session; restart when the chosen sound changes.
  useEffect(() => {
    const lane = ambientLane;
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
    const lane = breathLane;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- breathVolume intentionally omitted: it's applied live by the volume effect below, so adding it here would restart playback on every volume tick
  }, [active, phaseLabel, breathSoundId]);

  // Live volume changes without restarting playback.
  useEffect(() => {
    void breathLane.setVolume(breathVolume);
  }, [breathLane, breathVolume]);
  useEffect(() => {
    void ambientLane.setVolume(ambientVolume);
  }, [ambientLane, ambientVolume]);

  useEffect(() => {
    return () => {
      void breathLane.stop();
      void ambientLane.stop();
    };
  }, [breathLane, ambientLane]);
}
