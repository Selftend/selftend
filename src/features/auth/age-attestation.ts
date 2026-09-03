import { isRealCivilDate, meetsAgeFloor, type CivilDate } from "@/src/features/auth/age-floor";

/**
 * What the age gate's four questions add up to (#1764, spec #227 §3).
 *
 * The screen above this is deliberately thin: it collects four strings and
 * renders whatever comes back. Everything that decides anything lives here,
 * pure and clock-injected, because two of the three outcomes are irreversible
 * for the person on the other side of it - one writes an attestation, the other
 * hands them to a path that deletes their account (#1765).
 *
 * **The outcome type is the privacy boundary.** `readAttestation` takes the
 * date of birth and returns a verdict that cannot carry it: there is no field
 * on `AttestationOutcome` it could travel in. That is what makes §3's "DOB is
 * discarded, ever" a property of the code rather than a promise about it - a
 * caller cannot persist, log or report what it was never handed. The screen
 * holds the four strings only while they are being typed.
 *
 * **A typo and an under-floor verdict are different answers**, and separating
 * them is the reason `isRealCivilDate` is exported from the floor module.
 * `meetsAgeFloor` collapses both into `false` on purpose, so that any caller
 * skipping the check still fails closed - but a gate that treated "31 February"
 * as under-floor would delete the account of someone who mistyped their
 * birthday. So the calendar is checked first, and only a date that exists is
 * ever measured against the floor.
 */

/** The four strings the screen collects, exactly as typed. */
export interface AttestationDraft {
  /** Day of month, as entered. */
  day: string;
  /** Month, 1-12, as entered. */
  month: string;
  /** Four-digit year, as entered. */
  year: string;
  /** ISO 3166-1 alpha-2, or empty while nothing is chosen. */
  country: string;
}

/**
 * The verdict, and the only thing that leaves this module.
 *
 * ⚠️ Nothing here may gain a date-of-birth field, however convenient. See the
 * docblock above: the absence is the guarantee.
 */
export type AttestationOutcome =
  /** Something is still blank. Not an error - the person is mid-answer. */
  | { kind: "incomplete" }
  /** The date does not exist, or has not happened yet. Correctable, in place. */
  | { kind: "invalid-date" }
  /** Meets the floor. `country` is canonical and ready to store. */
  | { kind: "pass"; country: string }
  /** Does not meet the floor. One way out, and nothing is written. */
  | { kind: "under-floor" };

const DAY_OR_MONTH = /^\d{1,2}$/;
const YEAR = /^\d{4}$/;

/**
 * Whether `date` is still ahead of `now`.
 *
 * Returns `false` on an unusable clock rather than guessing, which leaves the
 * decision to `meetsAgeFloor` - and that fails closed. A broken clock must
 * never be the reason someone is waved through.
 */
function isInTheFuture(date: CivilDate, now: Date): boolean {
  if (!Number.isFinite(now.getTime())) {
    return false;
  }
  const today: CivilDate = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
  if (date.year !== today.year) return date.year > today.year;
  if (date.month !== today.month) return date.month > today.month;
  return date.day > today.day;
}

/**
 * Read the gate's answers and return the verdict, holding nothing back.
 *
 * `now` is a parameter and never a default: `react-hooks/purity` forbids
 * reading the clock during render, and a default argument would hide the read
 * inside a component that looked pure (#1761's own note on the same hazard).
 * The caller reads it in the submit handler.
 */
export function readAttestation(draft: AttestationDraft, now: Date): AttestationOutcome {
  const day = draft.day.trim();
  const month = draft.month.trim();
  const year = draft.year.trim();
  const country = draft.country.trim().toUpperCase();

  if (!day || !month || !year || !country) {
    return { kind: "incomplete" };
  }

  if (!DAY_OR_MONTH.test(day) || !DAY_OR_MONTH.test(month) || !YEAR.test(year)) {
    return { kind: "invalid-date" };
  }

  const dateOfBirth: CivilDate = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };

  if (!isRealCivilDate(dateOfBirth) || isInTheFuture(dateOfBirth, now)) {
    return { kind: "invalid-date" };
  }

  if (meetsAgeFloor(dateOfBirth, country, now)) {
    return { kind: "pass", country };
  }

  return { kind: "under-floor" };
}
