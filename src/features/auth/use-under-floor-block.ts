import { useEffect, useState } from "react";

import { readUnderFloorBlock } from "@/src/features/auth/under-floor-block";

interface UnderFloorBlockState {
  /** This device is inside an under-floor block window. */
  blocked: boolean;
  /** The device flag has been read; before this, `blocked` means nothing. */
  hydrated: boolean;
}

/**
 * Reads the device's under-floor block once per mount (#1765, spec #227 §3).
 *
 * ⚠️ **`hydrated` is not decoration - the caller must wait on it.** The flag
 * lives in AsyncStorage, so it arrives a tick late, and `blocked` is `false`
 * for that tick. A caller that rendered the app on the strength of that would
 * flash the shell at exactly the person the block exists to keep out.
 * `ProtectedLayout` folds it into the loading gate it already shows while the
 * session restores, so this costs no new spinner - on a cold start the storage
 * read is comfortably inside the session round trip.
 *
 * It never rejects: `readUnderFloorBlock` swallows storage failures and
 * answers `false`. The `catch` is here anyway, because a hydrate that never
 * settles would strand the app on the loading screen, and that is too heavy a
 * consequence to leave resting on another module's internals.
 */
export function useUnderFloorBlock(): UnderFloorBlockState {
  const [state, setState] = useState<UnderFloorBlockState>({ blocked: false, hydrated: false });

  useEffect(() => {
    let mounted = true;

    // Read the clock here, in an effect, never in render (`react-hooks/purity`).
    readUnderFloorBlock(new Date())
      .then((blocked) => {
        if (mounted) setState({ blocked, hydrated: true });
      })
      .catch(() => {
        if (mounted) setState({ blocked: false, hydrated: true });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
