/**
 * The demo seed's ACT band: placement inside the 10:00-12:00 UTC band and the
 * stray check that guards it. Pure — the seed injects its window and clamp —
 * so the day-boundary cases can be pinned without a database (#1971).
 *
 * The ACT tables store no captured offset (#1284), so their rows are pinned
 * to a UTC band rather than the seeding machine's clock; `seed-demo-data.mjs`
 * carries the reasoning for the band's hours and margins.
 */

export const ACT_BAND_START_HOUR = 10;
export const ACT_BAND_END_HOUR = 12;
export const ACT_BAND_MINUTES = (ACT_BAND_END_HOUR - ACT_BAND_START_HOUR) * 60;

/**
 * @param {object} deps
 * @param {(dayIndex: number) => Date} deps.dayAt the calendar date at a day
 *   index of the seeded window, as a machine-local Date
 * @param {(millis: number) => string} deps.clampToPast the seed's future-clamp:
 *   an instant that has not happened yet becomes just-passed
 */
export function createBand({ dayAt, clampToPast }) {
  // The instants the future-clamp pulled out of the band, by epoch millisecond.
  //
  // Only ever TODAY's rows, and only on a run that starts before the band
  // closes: `clampToPast` pulls a future instant back to just-passed, which is
  // the same trade every other block in the seed makes for today's rows.
  // Recorded rather than waved through so the stray check can excuse exactly
  // these and nothing else.
  const clampedOutOfBand = new Set();

  /** The UTC instant `minutesIntoBand` into the band on day `dayIndex`, unclamped. */
  function intendedAt(dayIndex, minutesIntoBand) {
    const d = dayAt(dayIndex);
    return Date.UTC(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      ACT_BAND_START_HOUR,
      minutesIntoBand,
      0,
      0,
    );
  }

  /** A timestamp `minutesIntoBand` into the 10:00-12:00 UTC band on day `dayIndex`. */
  function inBand(dayIndex, minutesIntoBand) {
    if (
      !Number.isInteger(minutesIntoBand) ||
      minutesIntoBand < 0 ||
      minutesIntoBand >= ACT_BAND_MINUTES
    ) {
      throw new Error(
        `inBand() takes 0-${ACT_BAND_MINUTES - 1} minutes into the band, got ${minutesIntoBand}.`,
      );
    }
    const intended = intendedAt(dayIndex, minutesIntoBand);
    const iso = clampToPast(intended);
    // A clamp is detected by comparing instants, never by the hour of the
    // result: the clamped instant can land on the PREVIOUS UTC day (a run at
    // 00:01 UTC, or a machine whose local day is ahead of the UTC day), where
    // "is the hour before the band opens?" reads 23 and says no (#1971).
    if (new Date(iso).getTime() < intended) {
      clampedOutOfBand.add(new Date(iso).getTime());
    }
    return iso;
  }

  /**
   * Whether a stored instant sits outside the band without the clamp's excuse.
   * ☠️ Excused instants match by EPOCH MILLIS rather than by string, because
   * PostgREST returns a different ISO format than the seed wrote.
   */
  function isStray(millis) {
    if (clampedOutOfBand.has(millis)) return false;
    const hour = new Date(millis).getUTCHours();
    return hour < ACT_BAND_START_HOUR || hour >= ACT_BAND_END_HOUR;
  }

  /**
   * The UTC instant the band OPENS on day `dayIndex`, in epoch millis.
   *
   * The margin checks compare band edge to band edge rather than counting 48
   * hours back from `now`: every row sits somewhere inside a two-hour band, so
   * a fixed-hours comparison rejects a correctly placed row whenever the run
   * starts earlier in the day than the row it is measuring. Unclamped on
   * purpose — these are boundaries to measure against, not timestamps to store.
   */
  function bandOpensAt(dayIndex) {
    return intendedAt(dayIndex, 0);
  }

  /** The UTC instant the band CLOSES on day `dayIndex`, in epoch millis. */
  function bandClosesAt(dayIndex) {
    return intendedAt(dayIndex, ACT_BAND_MINUTES);
  }

  return { inBand, isStray, bandOpensAt, bandClosesAt, clampedOutOfBand };
}
