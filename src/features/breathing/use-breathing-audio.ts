import { useEffect, useRef, useState } from "react";

import type { PhaseLabel } from "@/src/constants/breathing";
import { breathSoundLookup } from "@/src/constants/breathing-sounds";
import { breathClipFor } from "@/src/features/breathing/breath-audio-plan";
import { createLanePlayer } from "@/src/lib/lane-player";
import { phaseHaptic } from "@/src/lib/native-haptics";
import { useAmbientLane } from "@/src/lib/use-ambient-lane";

interface BreathingAudioOptions {
  active: boolean;
  phaseLabel: PhaseLabel | null;
  breathSoundId: string;
  ambientSoundId: string;
  breathVolume: number;
  ambientVolume: number;
  /** A tap at each phase boundary (#1741), beside the sound or instead of it. Opt-in. */
  hapticCues: boolean;
}

export function useBreathingAudio(opts: BreathingAudioOptions): void {
  const {
    active,
    phaseLabel,
    breathSoundId,
    ambientSoundId,
    breathVolume,
    ambientVolume,
    hapticCues,
  } = opts;
  // Lazy useState instead of a render-written ref: same one-instance-per-mount
  // semantics, no ref access during render.
  const [breathLane] = useState(createLanePlayer);
  const breathClipRef = useRef<number | null>(null);

  // Ambient: the shared bed lane (#1742) - starts and stops with the session,
  // fades on pause and at the end (#1743), swaps on a new sound, takes volume live.
  useAmbientLane({ active, soundId: ambientSoundId, volume: ambientVolume });

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

  // The phase's tap (#1741): its OWN effect, keyed on the phase and never on the
  // clip. The sound effect above de-duplicates on the resolved clip, so a tap
  // beside `lane.play` would never fire for the `none` sound, would skip every
  // hold for a voice without a hold cue, and would fire on a mid-phase sound
  // swap. The switch rides a ref so flipping it mid-phase waits for the next
  // boundary rather than tapping at once. A resume taps once for the phase it
  // returns to, exactly as the sound re-cues it.
  const hapticCuesRef = useRef(hapticCues);
  useEffect(() => {
    hapticCuesRef.current = hapticCues;
  }, [hapticCues]);
  useEffect(() => {
    if (!active || phaseLabel === null || !hapticCuesRef.current) return;
    phaseHaptic();
  }, [active, phaseLabel]);

  // Unmount: stop() on a looping lane starts a fade-out that OUTLIVES this component -
  // the ramp is a setInterval with no React owner, finishes within LOOP_FADE_MS and
  // releases the player itself. Chosen over an immediate cut so that leaving the
  // screen mid-session sounds like the session ending, not like a cable pulled.
  useEffect(() => {
    return () => {
      void breathLane.stop();
    };
  }, [breathLane]);
}
