import { useEffect, useRef, useState } from "react";

import type { PhaseLabel } from "@/src/constants/breathing";
import { ambientSoundLookup, breathSoundLookup } from "@/src/constants/breathing-sounds";
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { createLanePlayer } from "@/src/features/breathing/lane-player";

interface BreathingAudioOptions {
  active: boolean;
  phaseLabel: PhaseLabel | null;
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
}

export function useBreathingAudio(opts: BreathingAudioOptions): void {
  const { active, phaseLabel, breathSoundId, ambientSoundId, breathVolume, ambientVolume } = opts;
  // Lazy useState instead of a render-written ref: same one-instance-per-mount
  // semantics, no ref access during render.
  const [breathLane] = useState(createLanePlayer);
  const [ambientLane] = useState(createLanePlayer);
  const breathClipRef = useRef<number | null>(null);

  // Ambient: start/stop with the session; restart when the chosen sound changes.
  // `active` drops on every pause as well as at the end, and the lane fades on both
  // (#1743): stop() ramps the bed to 0 before releasing it, play() ramps the next one
  // up from 0. A swap runs this effect's cleanup (stop) and body (play) in one tick;
  // the lane cuts the outgoing bed and fades the new one in - see `lane-player.ts`.
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
    // Already resolved: the repository maps a stored id the catalog lacks to `none`
    // on read (#1745), so this lookup never sees a retired texture id. It used to
    // resolve here as well, and the session screen did not - the gap this closes.
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

  // Unmount: stop() on a looping lane starts a fade-out that OUTLIVES this component -
  // the ramp is a setInterval with no React owner, finishes within LOOP_FADE_MS and
  // releases the player itself. Chosen over an immediate cut so that leaving the
  // screen mid-session sounds like the session ending, not like a cable pulled.
  useEffect(() => {
    return () => {
      void breathLane.stop();
      void ambientLane.stop();
    };
  }, [breathLane, ambientLane]);
}
