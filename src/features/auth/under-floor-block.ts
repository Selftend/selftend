import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The device-local under-floor block (#1765, spec #227 §3).
 *
 * When someone answers the age gate below their country's floor, their account
 * is deleted server-side and this flag is written on the device. It exists for
 * one reason: without it, the very next launch mints a fresh guest
 * (`signInAnonymously`, #1440) and re-opens the gate a second later, so the
 * hard block §3 asks for would last exactly as long as the screen stayed
 * mounted.
 *
 * **It is a speed bump, not identity, and not the security boundary.** The
 * boundary is the deletion: nothing about the person survives it. This only
 * stops the immediate same-device retry, and everything about it is shaped by
 * that modest job:
 *
 * - **It stores one expiry timestamp and nothing else.** No date of birth, no
 *   country, no age, no user id - there is no field here anything personal
 *   could ride in, which is the same property `readAttestation`'s outcome type
 *   has (#1764) and for the same reason. `under-floor-block.test.ts` asserts
 *   the stored value is exactly that number.
 * - **It expires.** A permanent device flag would be a ban on a phone rather
 *   than a block on a person, it would outlive the household that owns the
 *   device, and it would still be defeated by a reinstall - so it buys the one
 *   thing it can actually buy, which is the retry that would otherwise happen
 *   in the same minute.
 * - **A storage failure does not block.** Reads and writes are best-effort,
 *   matching `session-marker.ts` beside it. A device that cannot persist the
 *   flag falls back to answering the gate again - and being deleted again.
 *
 * ⚠️ The clock is a parameter, never `Date.now()` inside. These are called from
 * an effect rather than render so purity is not at stake here, but an injected
 * clock is what lets the window be tested at its two edges instead of around
 * them (`reference_react_compiler_purity_clock`, and #1764 makes the same call
 * for `readAttestation`).
 */
export const UNDER_FLOOR_BLOCK_KEY = "selftend:age-floor:blocked-until";

/**
 * How long the same-device block holds: one day.
 *
 * Long enough that "answer it differently and try again" is not a thing you do
 * in the moment, which is the entire ask. Not longer, because the flag cannot
 * tell a person from a device and a shared phone is not the target.
 */
export const UNDER_FLOOR_BLOCK_MS = 24 * 60 * 60 * 1000;

/** Whether this device is inside an under-floor block window. */
export async function readUnderFloorBlock(now: Date): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(UNDER_FLOOR_BLOCK_KEY);
    if (stored === null) {
      return false;
    }

    const until = Number(stored);
    // `Number("")` is 0 and `Number("tomorrow")` is NaN; both compare false
    // here, so junk in the key reads as no block rather than as a block that
    // never lifts.
    if (Number.isFinite(until) && now.getTime() < until) {
      return true;
    }

    // Expired or unusable: drop it, so a stale entry is not re-read on every
    // launch for the life of the install.
    await clearBlock();
    return false;
  } catch {
    return false;
  }
}

/** Start (or restart) the block window from `now`. */
export async function writeUnderFloorBlock(now: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(UNDER_FLOOR_BLOCK_KEY, String(now.getTime() + UNDER_FLOOR_BLOCK_MS));
  } catch {
    // Best-effort: a device that cannot persist the flag just gets to answer
    // the gate again, and to be deleted again.
  }
}

/**
 * Lift the block.
 *
 * ⚠️ Deliberately **not exported**. Its only caller is the expiry branch above,
 * and keeping it private makes "the one thing that lifts this block is time" a
 * property of the module rather than a convention: an exported clear is an
 * invitation to lift the block from a screen, which is the hole the flag
 * exists to close. It is covered through `readUnderFloorBlock` on an expired
 * entry, not directly.
 */
async function clearBlock(): Promise<void> {
  try {
    await AsyncStorage.removeItem(UNDER_FLOOR_BLOCK_KEY);
  } catch {
    // Best-effort: worst case is one blocked launch after the window lapsed.
  }
}
