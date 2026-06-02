import {
  cycleSeconds,
  totalSeconds,
  formatClock,
  elapsedMinutes,
} from "@/src/features/breathing/cycle-math";

import { breathingPatterns, breathingLookup } from "@/src/constants/breathing";

const boxPhases = [
  { label: "inhale" as const, durationSeconds: 4 },
  { label: "hold" as const, durationSeconds: 4 },
  { label: "exhale" as const, durationSeconds: 4 },
  { label: "holdOut" as const, durationSeconds: 4 },
];

describe("cycle-math", () => {
  it("sums one cycle's phase durations", () => {
    expect(cycleSeconds(boxPhases)).toBe(16);
  });

  it("supports fractional phase durations", () => {
    expect(cycleSeconds([{ label: "inhale", durationSeconds: 5.5 }])).toBe(5.5);
  });

  it("multiplies cycle length by cycle count", () => {
    expect(totalSeconds(boxPhases, 8)).toBe(128);
  });

  it("formats sub-hour durations as M:SS", () => {
    expect(formatClock(128)).toBe("2:08");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(9)).toBe("0:09");
  });

  it("formats hour+ durations as HH:MM:SS", () => {
    expect(formatClock(3808)).toBe("01:03:28");
    // Regression: the breathing session countdown feeds secondsLeft through formatClock,
    // so a session over an hour must show the hours field, not a >59 minutes value.
    expect(formatClock(3600)).toBe("01:00:00");
    expect(formatClock(4000)).toBe("01:06:40");
  });

  it("rounds elapsed time to whole minutes, floored at 1", () => {
    expect(elapsedMinutes(600, 0)).toBe(10);
    expect(elapsedMinutes(128, 64)).toBe(1);
    expect(elapsedMinutes(128, 200)).toBe(1); // remaining > planned clamps to 0 elapsed -> min 1
  });
});

describe("built-in patterns adopt the cycle model", () => {
  it("every pattern declares defaultCycles and cycleOptions", () => {
    for (const pattern of breathingPatterns) {
      expect(pattern.defaultCycles).toBeGreaterThan(0);
      expect(pattern.cycleOptions.length).toBeGreaterThan(0);
      expect(pattern.cycleOptions).toContain(pattern.defaultCycles);
      // `durations` (minutes) must be gone.
      expect((pattern as unknown as Record<string, unknown>).durations).toBeUndefined();
    }
  });

  it("box-breathing is a 16s, 4-phase cycle", () => {
    expect(cycleSeconds(breathingLookup["box-breathing"].phases)).toBe(16);
    expect(breathingLookup["box-breathing"].phases).toHaveLength(4);
  });
});
