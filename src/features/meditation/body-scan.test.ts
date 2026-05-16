import { bodyScanSegments, currentBodyScanSegment } from "@/src/features/meditation/body-scan";

describe("bodyScanSegments", () => {
  it("returns the expected number of segments for each preset", () => {
    expect(bodyScanSegments(4)).toHaveLength(4);
    expect(bodyScanSegments(6)).toHaveLength(6);
    expect(bodyScanSegments(12)).toHaveLength(12);
  });

  it("indexes segments starting at 0", () => {
    expect(bodyScanSegments(6).map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("currentBodyScanSegment", () => {
  it("returns the first segment at the start", () => {
    expect(currentBodyScanSegment(6, 0, 600).index).toBe(0);
  });

  it("moves to later segments as time elapses", () => {
    // 6 segments over 600 seconds = 100 s per segment.
    expect(currentBodyScanSegment(6, 50, 600).index).toBe(0);
    expect(currentBodyScanSegment(6, 100, 600).index).toBe(1);
    expect(currentBodyScanSegment(6, 250, 600).index).toBe(2);
    expect(currentBodyScanSegment(6, 599, 600).index).toBe(5);
  });

  it("clamps to the final segment at or beyond the total duration", () => {
    expect(currentBodyScanSegment(4, 240, 240).index).toBe(3);
    expect(currentBodyScanSegment(12, 9999, 600).index).toBe(11);
  });

  it("returns the first segment when total seconds is zero", () => {
    expect(currentBodyScanSegment(4, 30, 0).index).toBe(0);
  });
});
