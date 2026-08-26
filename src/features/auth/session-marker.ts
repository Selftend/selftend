import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The device's own record that a session existed here (#1450). supabase-js
 * deletes its stored session itself the moment a restore fails, so by the time
 * the app can look, "there never was a session" and "there was one and it
 * died" look identical. This marker is written beside the session and cleared
 * only on a DELIBERATE exit (the `signOut` wrapper - settings sign-out and
 * delete-account both go through it). The involuntary paths - dormancy cleanup
 * under a live token, refresh failure, the 23503 zombie-session guard (which
 * calls the client's signOut directly, bypassing the wrapper) - all leave it
 * behind, which is exactly what lets the next cold start tell a returning
 * cleaned-up device from a genuinely new one and say so instead of starting
 * fresh silently.
 *
 * All three operations are best-effort: storage can be unavailable, and a
 * failed marker read must never block entry.
 *
 * The stored value is a bare presence flag, deliberately NOT the user id:
 * every consumer only asks "did a session exist here?", and the marker
 * outlives the account it describes - persisting the dead account's id would
 * be a data field with no feature-level need (AGENTS.md, data minimization).
 */
const SESSION_MARKER_KEY = "selftend_session_marker";
const SESSION_MARKER_VALUE = "1";

export async function readSessionMarker(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SESSION_MARKER_KEY)) !== null;
  } catch {
    return false;
  }
}

export async function writeSessionMarker(): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_MARKER_KEY, SESSION_MARKER_VALUE);
  } catch {
    // Best-effort: a device that can't persist the marker just never gets the
    // fresh-start notice.
  }
}

export async function clearSessionMarker(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_MARKER_KEY);
  } catch {
    // Best-effort: worst case is one spurious notice after a deliberate exit.
  }
}
