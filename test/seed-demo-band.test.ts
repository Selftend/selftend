/**
 * The demo seed's ACT band placement and its stray guard (#1971).
 *
 * ☠️ WHY THIS FILE EXISTS. The required `integration` check went red at
 * 23:59 UTC on a commit that touched only Playwright specs: today's band
 * (10:00-12:00 UTC) was still in the future, the seed's clamp pulled the row
 * back to just-passed, and that instant fell on the PREVIOUS UTC day at 23:59.
 * The clamp detector asked "is the UTC hour before the band opens?" — 23 is
 * not — so the excuse was never recorded and the guard threw. The same shape
 * bites any seeding machine whose local day is ahead of the UTC day (01:30 in
 * Sofia is 22:30 UTC yesterday).
 *
 * The guard itself is not loosened: a row outside the band that the clamp did
 * NOT produce is still a stray. The run instant is pinned with fake timers, and
 * the window is the seed's own (`seed-demo-window.mjs`, read off the clock at
 * call time), so the machine-local `dayAt` and the UTC band meet here exactly
 * as they do in the seed and a change to the window cannot leave this test
 * quietly asserting against a window the seed no longer uses. Jest's timezone
 * is Asia/Kolkata (jest.config.js), a non-UTC, non-whole-hour zone.
 */
import {
  ACT_BAND_END_HOUR,
  ACT_BAND_MINUTES,
  ACT_BAND_START_HOUR,
  createBand,
} from "../scripts/seed-demo-band.mjs";
import { DAYS, createWindow } from "../scripts/seed-demo-window.mjs";

const TODAY = DAYS - 1;

/** The seed's band, built on the seed's own window at the (faked) run instant. */
function bandBuiltAt(runInstant: string) {
  jest.useFakeTimers({ now: new Date(runInstant) });
  return createBand(createWindow());
}

afterEach(() => {
  jest.useRealTimers();
});

describe("createBand", () => {
  it("places a past day's row inside the band, unclamped and not a stray", () => {
    const band = bandBuiltAt("2026-09-05T15:00:00.000Z");
    const iso = band.inBand(TODAY - 3, 30);
    expect(iso).toBe("2026-09-02T10:30:00.000Z");
    expect(band.clampedInstants.size).toBe(0);
    expect(band.isStray(new Date(iso).getTime())).toBe(false);
  });

  it("rejects a minute outside the band", () => {
    const band = bandBuiltAt("2026-09-05T15:00:00.000Z");
    expect(() => band.inBand(TODAY, ACT_BAND_MINUTES)).toThrow(/0-119 minutes/);
    expect(() => band.inBand(TODAY, -1)).toThrow(/0-119 minutes/);
  });

  // The original clamp case: a run before the band opens on the same UTC day.
  it("excuses today's row when the run starts before the band opens", () => {
    const band = bandBuiltAt("2026-09-05T08:00:00.000Z");
    const iso = band.inBand(TODAY, 0);
    expect(iso).toBe("2026-09-05T07:58:00.000Z");
    expect(band.isStray(new Date(iso).getTime())).toBe(false);
  });

  // #1971's CI failure: 00:01 UTC, today's band is ten hours away, the clamp
  // lands at 23:59 on the previous UTC day.
  it("excuses today's row when the clamp lands on the previous UTC day", () => {
    const band = bandBuiltAt("2026-09-05T00:01:16.519Z");
    const iso = band.inBand(TODAY, 0);
    expect(iso).toBe("2026-09-04T23:59:16.519Z");
    expect(band.isStray(new Date(iso).getTime())).toBe(false);
  });

  // The run instant the ticket names, 23:59:xx UTC. On a UTC runner today's
  // band has already passed by then and nothing clamps; under a zone ahead of
  // UTC (Kolkata: 05:29 the next morning) "today" is the next civil day, the
  // band is ten hours off, and the clamp lands at 23:57 on the UTC day the run
  // is still in.
  it("excuses today's row for a run at 23:59 UTC", () => {
    const band = bandBuiltAt("2026-09-04T23:59:30.000Z");
    const iso = band.inBand(TODAY, 10);
    expect(iso).toBe("2026-09-04T23:57:30.000Z");
    expect(band.isStray(new Date(iso).getTime())).toBe(false);
  });

  // #1971's local face: 04:00 in Kolkata is 22:30 UTC the day before, so the
  // machine's "today" has a band that opens 11.5 hours into the future.
  it("excuses today's row when the local day is ahead of the UTC day", () => {
    const band = bandBuiltAt("2026-09-04T22:30:00.000Z");
    const iso = band.inBand(TODAY, 45);
    expect(iso).toBe("2026-09-04T22:28:00.000Z");
    expect(band.isStray(new Date(iso).getTime())).toBe(false);
  });

  // The guard is NOT loosened: only the clamp's own instants are excused.
  it("still flags an out-of-band instant the clamp did not produce", () => {
    const band = bandBuiltAt("2026-09-05T00:01:16.519Z");
    band.inBand(TODAY, 0);
    expect(band.isStray(Date.UTC(2026, 8, 4, 23, 59, 0))).toBe(true);
    expect(band.isStray(Date.UTC(2026, 8, 4, ACT_BAND_START_HOUR - 1, 59))).toBe(true);
    expect(band.isStray(Date.UTC(2026, 8, 4, ACT_BAND_END_HOUR, 0))).toBe(true);
    expect(band.isStray(Date.UTC(2026, 8, 4, ACT_BAND_START_HOUR, 0))).toBe(false);
  });

  it("measures band edges unclamped, even for today", () => {
    const band = bandBuiltAt("2026-09-05T00:01:16.519Z");
    expect(band.bandOpensAt(TODAY)).toBe(Date.UTC(2026, 8, 5, ACT_BAND_START_HOUR));
    expect(band.bandClosesAt(TODAY)).toBe(Date.UTC(2026, 8, 5, ACT_BAND_END_HOUR));
  });
});
