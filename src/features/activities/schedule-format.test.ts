import { isoToScheduleInput, scheduleInputToIso } from "@/src/features/activities/schedule-format";

describe("schedule-format", () => {
  it("round-trips a local YYYY-MM-DD HH:MM through ISO and back", () => {
    const iso = scheduleInputToIso("2026-06-15 09:30");
    expect(iso).not.toBeNull();
    // Parsed as local time, so re-formatting in the same local zone yields the input.
    expect(isoToScheduleInput(iso as string)).toBe("2026-06-15 09:30");
  });

  it("returns null for blank / whitespace input", () => {
    expect(scheduleInputToIso(null)).toBeNull();
    expect(scheduleInputToIso("")).toBeNull();
    expect(scheduleInputToIso("   ")).toBeNull();
  });

  it("returns null for unparseable text (so the caller can flag a bad format)", () => {
    expect(scheduleInputToIso("not a date")).toBeNull();
    expect(scheduleInputToIso("2026-13-40 99:99")).toBeNull();
  });

  it("isoToScheduleInput returns empty string for an invalid iso", () => {
    expect(isoToScheduleInput("nonsense")).toBe("");
  });
});
