import {
  DEFAULT_INTERVAL_MINUTES,
  INTERVAL_OPTIONS_MINUTES,
  isIntervalTick,
} from "@/src/features/timer/interval";

describe("timer interval", () => {
  it("defaults to a 5-minute interval and offers an Off option", () => {
    expect(DEFAULT_INTERVAL_MINUTES).toBe(5);
    expect(INTERVAL_OPTIONS_MINUTES[0]).toBe(0); // 0 = off
    expect(INTERVAL_OPTIONS_MINUTES).toContain(5);
  });

  it("never fires when the interval is off", () => {
    expect(isIntervalTick(300, 0)).toBe(false);
    expect(isIntervalTick(0, 0)).toBe(false);
  });

  it("never fires at the very start", () => {
    expect(isIntervalTick(0, 300)).toBe(false);
  });

  it("fires on each whole interval boundary", () => {
    expect(isIntervalTick(300, 300)).toBe(true); // first 5-min mark
    expect(isIntervalTick(600, 300)).toBe(true); // second
    expect(isIntervalTick(900, 300)).toBe(true);
  });

  it("does not fire between boundaries", () => {
    expect(isIntervalTick(299, 300)).toBe(false);
    expect(isIntervalTick(301, 300)).toBe(false);
    expect(isIntervalTick(450, 300)).toBe(false);
  });
});
