import { useEffect, useState } from "react";

import { ambientSoundLookup } from "@/src/constants/breathing-sounds";
import { createLanePlayer } from "@/src/lib/lane-player";

interface AmbientLaneOptions {
  /** The session is running. Drops on pause and at the end; the bed fades on both. */
  active: boolean;
  /** An `AMBIENT_SOUNDS` id, already resolved by the preferences repository (#1745). */
  soundId: string;
  volume: number;
}

/**
 * One looping ambient bed that follows a session: starts with it, stops when it
 * ends or pauses, swaps when the chosen bed changes, and takes volume live without
 * restarting playback. Shared by the breathing session and the meditation sit
 * (#1742) so there is exactly one lane implementation and one way of driving it.
 *
 * `none` (the catalog's null-asset row) and any id the catalog lacks play nothing:
 * a stored id is free text, and silence is the only safe reading of one we do not
 * know. The repository resolves retired ids to `none` before they get here; the
 * `?? null` is the null-guard for a caller that bypasses it.
 */
export function useAmbientLane({ active, soundId, volume }: AmbientLaneOptions): void {
  // Lazy useState instead of a render-written ref: same one-instance-per-mount
  // semantics, no ref access during render.
  const [lane] = useState(createLanePlayer);

  // Start/stop with the session; restart when the chosen sound changes. `active`
  // drops on every pause as well as at the end, and the lane fades on both (#1743):
  // stop() ramps the bed to 0 before releasing it, play() ramps the next one up
  // from 0. A swap runs this effect's cleanup (stop) and body (play) in one tick;
  // the lane cuts the outgoing bed and fades the new one in - see `lane-player.ts`.
  useEffect(() => {
    if (!active) {
      void lane.stop();
      return;
    }
    const asset = ambientSoundLookup[soundId]?.asset ?? null;
    if (asset !== null) void lane.play(asset, volume, true);
    else void lane.stop();
    return () => {
      void lane.stop();
    };
    // Volume changes are handled in the volume effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lane, active, soundId]);

  // Live volume changes without restarting playback.
  useEffect(() => {
    void lane.setVolume(volume);
  }, [lane, volume]);

  // Unmount: stop() on a looping lane starts a fade-out that OUTLIVES this component -
  // the ramp is a setInterval with no React owner, finishes within LOOP_FADE_MS and
  // releases the player itself. Chosen over an immediate cut so that leaving the
  // screen mid-session sounds like the session ending, not like a cable pulled.
  useEffect(() => {
    return () => {
      void lane.stop();
    };
  }, [lane]);
}
