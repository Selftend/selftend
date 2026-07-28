import {
  isoToScheduleInput,
  scheduleInputToOccurrence,
} from "@/src/features/activities/schedule-format";
import { entryDayKey } from "@/src/lib/occurrence-time";

describe("schedule-format", () => {
  it("round-trips a local YYYY-MM-DD HH:MM through ISO and back", () => {
    const occurrence = scheduleInputToOccurrence("2026-06-15 09:30");
    expect(occurrence).not.toBeNull();
    // Parsed as local time, so re-formatting in the same local zone yields the input.
    expect(isoToScheduleInput(occurrence!.scheduledAt)).toBe("2026-06-15 09:30");
  });

  it("returns null for blank / whitespace input", () => {
    expect(scheduleInputToOccurrence(null)).toBeNull();
    expect(scheduleInputToOccurrence("")).toBeNull();
    expect(scheduleInputToOccurrence("   ")).toBeNull();
  });

  it("returns null for unparseable text (so the caller can flag a bad format)", () => {
    expect(scheduleInputToOccurrence("not a date")).toBeNull();
    expect(scheduleInputToOccurrence("2026-13-40 99:99")).toBeNull();
  });

  it("isoToScheduleInput returns empty string for an invalid iso", () => {
    expect(isoToScheduleInput("nonsense")).toBe("");
  });

  it("captures the offset in force at the SCHEDULED instant, from the same parse", () => {
    const occurrence = scheduleInputToOccurrence("2026-06-15 09:30")!;
    const parsed = new Date(occurrence.scheduledAt);
    // Not "the offset now": the offset that applies at the moment being scheduled, so
    // a plan made across a DST boundary is not paired with a clock that was never in
    // force at it (#330).
    expect(occurrence.scheduledOffsetMinutes).toBe(-parsed.getTimezoneOffset());
  });

  it("keeps the picked civil day recoverable from the pair", () => {
    // The whole point of storing the offset alongside the instant: whoever reads the
    // row later, wherever they are standing, gets back the day the user picked.
    const occurrence = scheduleInputToOccurrence("2026-06-15 23:45")!;
    expect(entryDayKey(occurrence.scheduledAt, occurrence.scheduledOffsetMinutes)).toBe(
      "2026-06-15",
    );
  });
});
