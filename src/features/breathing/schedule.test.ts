import { scheduleStateAt } from "@/src/features/breathing/schedule";
import type { BreathingPhase } from "@/src/constants/breathing";

const inEx: BreathingPhase[] = [
  { label: "inhale", durationSeconds: 4 },
  { label: "exhale", durationSeconds: 4 },
];

describe("scheduleStateAt", () => {
  it("reports the inhale phase at t=0", () => {
    const s = scheduleStateAt(inEx, 2, 0);
    expect(s.done).toBe(false);
    expect(s.phase?.label).toBe("inhale");
    expect(s.phaseIndex).toBe(0);
    expect(s.cycleNumber).toBe(1);
    expect(s.phaseRemainingSeconds).toBe(4);
    expect(s.totalRemainingSeconds).toBe(16);
  });

  it("crosses into exhale at the boundary", () => {
    const s = scheduleStateAt(inEx, 2, 4);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseIndex).toBe(1);
    expect(s.cycleNumber).toBe(1);
  });

  it("advances the cycle number after a full cycle", () => {
    const s = scheduleStateAt(inEx, 2, 8);
    expect(s.phase?.label).toBe("inhale");
    expect(s.cycleNumber).toBe(2);
  });

  it("rounds remaining seconds up at fractional elapsed", () => {
    const s = scheduleStateAt(inEx, 2, 5.5);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseRemainingSeconds).toBe(3); // ceil(8 - 5.5)
    expect(s.totalRemainingSeconds).toBe(11); // ceil(16 - 5.5)
  });

  it("handles fractional phase durations", () => {
    const coherent: BreathingPhase[] = [
      { label: "inhale", durationSeconds: 5.5 },
      { label: "exhale", durationSeconds: 5.5 },
    ];
    const s = scheduleStateAt(coherent, 1, 10);
    expect(s.phase?.label).toBe("exhale");
    expect(s.phaseRemainingSeconds).toBe(1); // ceil(11 - 10)
  });

  it("reports done at/after the planned total", () => {
    expect(scheduleStateAt(inEx, 2, 16).done).toBe(true);
    expect(scheduleStateAt(inEx, 2, 99).done).toBe(true);
  });
});
