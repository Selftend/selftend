/**
 * The per-country minimum age for using Selftend (#1761, spec #227 §2).
 *
 * This is the single place the floor lives. No screen, query or policy string
 * re-derives it: the age gate asks the questions, this module answers them,
 * and the caller stores only the verdict.
 *
 * **The floor is set by GDPR Art. 9(2)(a) explicit consent, not by contract.**
 * Thought records are special-category data, so the age that matters is the
 * one at which a person may consent to that processing themselves — which is
 * why the table is a per-country spread rather than a single number, and why
 * there is no parental-consent path anywhere in it. Where national law would
 * demand one, the floor rises instead.
 *
 * Two deliberate choices worth not undoing:
 *
 * - **Countries whose floor is 13 are listed explicitly**, even though 13 is
 *   also the catch-all. An entry means the value was decided and sourced for
 *   that jurisdiction; the catch-all means nobody has looked yet. The legal
 *   review and the primary-source spot-checks (#1763) need to tell those apart.
 * - **The clock is a parameter, never a default.** `react-hooks/purity` errors
 *   on `new Date()` during render, and a default argument hides that from the
 *   component that triggers it — the caller reads the clock in an effect and
 *   passes the instant in.
 */

/** No jurisdiction goes below this, whatever the table or the input says. */
export const ABSOLUTE_MINIMUM_AGE_FLOOR = 13;

/** The only floors §2 permits. The union is what stops a bad edit compiling. */
export type AgeFloor = 13 | 14 | 15 | 16;

/**
 * A calendar date with no time and no zone — the frame a birthday actually
 * lives in. A `Date` would drag a UTC instant along and shift the answer by a
 * day for anyone east or west of the server.
 */
export interface CivilDate {
  year: number;
  /** 1-12, not the 0-11 a `Date` uses. */
  month: number;
  /** 1-31. */
  day: number;
}

/**
 * ISO 3166-1 alpha-2, uppercase. Anything absent takes the catch-all.
 *
 * Exported because the privacy policy has to PUBLISH this table (#1767), and a
 * published list that is retyped by hand drifts from the one the gate applies -
 * silently, and in the direction that admits someone the floor was meant to
 * hold back. `policy-age-floor.test.ts` compares the two, which it can only do
 * if the table is readable from outside this module. Nothing else re-derives
 * it: callers ask `floorForCountry`.
 */
export const FLOOR_BY_COUNTRY: Readonly<Record<string, AgeFloor>> = {
  // 13 — no national provision raising it above the GDPR baseline.
  US: 13,
  GB: 13,
  BE: 13,
  EE: 13,
  FI: 13,
  LV: 13,
  MT: 13,
  PT: 13,
  SE: 13,
  NO: 13,
  IS: 13,
  // 14
  AT: 14,
  BG: 14,
  CY: 14,
  IT: 14,
  LT: 14,
  ES: 14,
  // 15
  CZ: 15,
  // ☠️ Denmark is NOT a GDPR-baseline 13. It raised its age of digital consent
  // from 13 to 15 with effect from 2024-01-01 (LOV nr 1783 af 28/12/2023,
  // amending databeskyttelsesloven § 6(2)), and the mapping this table was
  // first built from had not caught up - so it shipped here as 13 until #1921.
  // Provenance and the two-route verification: docs/age-floor-statute-checks.md.
  DK: 15,
  FR: 15,
  GR: 15,
  SI: 15,
  // 16
  HR: 16,
  DE: 16,
  HU: 16,
  IE: 16,
  LU: 16,
  NL: 16,
  PL: 16,
  RO: 16,
  SK: 16,
  LI: 16,
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

/**
 * Whether a year/month/day triple names a day that exists.
 *
 * Exported because `meetsAgeFloor` deliberately collapses "not old enough" and
 * "that date is nonsense" into the same `false`, and the gate above it must not
 * (#1764): a typo has to come back as a correctable field error, while an
 * under-floor verdict is a one-way exit. The gate asks this first, so the two
 * are never confused - and the collapse inside `meetsAgeFloor` stays, because
 * any caller that skips this check must still fail closed.
 */
export function isRealCivilDate(date: CivilDate): boolean {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

/**
 * The age floor for a self-declared country of residence.
 *
 * Unknown, malformed and empty input all take the catch-all rather than
 * throwing: this runs behind a free-form selector, and a gate that crashes on
 * an unrecognised code fails open, which is the one outcome worth ruling out.
 */
export function floorForCountry(country: string): AgeFloor {
  const code = country.trim().toUpperCase();
  const floor = FLOOR_BY_COUNTRY[code] ?? ABSOLUTE_MINIMUM_AGE_FLOOR;
  // The union type stops a sub-13 entry compiling; this keeps the invariant
  // true for a caller that reaches here from untyped JavaScript.
  return Math.max(floor, ABSOLUTE_MINIMUM_AGE_FLOOR) as AgeFloor;
}

/**
 * Whether someone born on `dateOfBirth` meets `country`'s floor as of `now`.
 *
 * Returns a boolean and only a boolean — the date of birth is compared and
 * dropped. Nothing here returns, stores or logs it, which is what lets the
 * caller honour §3's "DOB is discarded" without holding anything back.
 *
 * **It fails closed.** An impossible date, a birth in the future, or an
 * unusable instant all return `false`. A protective gate that cannot read the
 * answer must refuse rather than wave someone through.
 *
 * A 29 February birth needs no special case. In a non-leap year the month/day
 * comparison holds the person back through 28 February and admits them on
 * 1 March — the later of the two readings, which is the conservative one for
 * a floor whose whole job is to not admit someone too young.
 */
export function meetsAgeFloor(dateOfBirth: CivilDate, country: string, now: Date): boolean {
  const instant = now.getTime();
  if (!Number.isFinite(instant)) {
    return false;
  }
  if (!isRealCivilDate(dateOfBirth)) {
    return false;
  }

  const today: CivilDate = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };

  let age = today.year - dateOfBirth.year;
  const beforeBirthdayThisYear =
    today.month < dateOfBirth.month ||
    (today.month === dateOfBirth.month && today.day < dateOfBirth.day);
  if (beforeBirthdayThisYear) {
    age -= 1;
  }

  if (age < 0) {
    return false;
  }

  return age >= floorForCountry(country);
}
