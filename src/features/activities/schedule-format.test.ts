import {
  isoToScheduleInput,
  resolveScheduleOccurrence,
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

  describe("resolveScheduleOccurrence", () => {
    // A plan made somewhere well away from the test runner's zone. The offset is
    // deliberately not the local one, which is what makes "was it carried through
    // or re-derived?" observable without having to move the process timezone.
    const TOKYO_OFFSET = 540;
    const stored = {
      scheduledAt: "2026-06-15T10:00:00.000Z", // 2026-06-15 19:00 in Tokyo
      scheduledOffsetMinutes: TOKYO_OFFSET,
    };
    const asRendered = isoToScheduleInput(stored.scheduledAt);

    it("carries the stored pair through when the field was not touched", () => {
      // The travel case: the field renders through the EDITOR's zone, so re-parsing it
      // would stamp the plan with wherever they are now. Editing the notes must not
      // move the day the plan was made for (#330).
      const resolved = resolveScheduleOccurrence(asRendered, stored)!;

      expect(resolved.scheduledOffsetMinutes).toBe(TOKYO_OFFSET);
      expect(resolved.scheduledAt).toBe(stored.scheduledAt);
      expect(entryDayKey(resolved.scheduledAt, resolved.scheduledOffsetMinutes)).toBe("2026-06-15");
    });

    it("tolerates surrounding whitespace as untouched", () => {
      const resolved = resolveScheduleOccurrence(`  ${asRendered}  `, stored)!;
      expect(resolved.scheduledOffsetMinutes).toBe(TOKYO_OFFSET);
    });

    it("re-parses when the user actually picks a new time", () => {
      // A real edit is the one case where reading the offset here is right: the user
      // is choosing a time where they now stand.
      const resolved = resolveScheduleOccurrence("2026-06-16 08:00", stored)!;
      const parsed = new Date(resolved.scheduledAt);

      expect(resolved.scheduledAt).not.toBe(stored.scheduledAt);
      expect(resolved.scheduledOffsetMinutes).toBe(-parsed.getTimezoneOffset());
      expect(entryDayKey(resolved.scheduledAt, resolved.scheduledOffsetMinutes)).toBe("2026-06-16");
    });

    it("keeps an uncaptured offset uncaptured rather than back-filling it", () => {
      // Null means "never captured". Filling it in from the editor's zone would assert
      // a fact nobody supplied - the mistake 20260726 had to undo.
      const legacy = { scheduledAt: stored.scheduledAt, scheduledOffsetMinutes: null };
      const resolved = resolveScheduleOccurrence(isoToScheduleInput(legacy.scheduledAt), legacy)!;

      expect(resolved.scheduledOffsetMinutes).toBeNull();
      expect(resolved.scheduledAt).toBe(legacy.scheduledAt);
    });

    it("clears the schedule when the field is emptied", () => {
      expect(resolveScheduleOccurrence("", stored)).toBeNull();
      expect(resolveScheduleOccurrence(null, stored)).toBeNull();
    });

    it("parses normally for a new activity with nothing stored", () => {
      const resolved = resolveScheduleOccurrence("2026-06-15 09:30", null)!;
      const parsed = new Date(resolved.scheduledAt);
      expect(resolved.scheduledOffsetMinutes).toBe(-parsed.getTimezoneOffset());
      expect(resolveScheduleOccurrence("2026-06-15 09:30", undefined)).not.toBeNull();
    });

    it("parses normally when the stored activity had no schedule at all", () => {
      const unscheduled = { scheduledAt: null, scheduledOffsetMinutes: null };
      const resolved = resolveScheduleOccurrence("2026-06-15 09:30", unscheduled)!;
      expect(resolved.scheduledAt).not.toBeNull();
      expect(resolved.scheduledOffsetMinutes).not.toBeNull();
    });

    it("still reports unparseable text as null so the caller can flag it", () => {
      expect(resolveScheduleOccurrence("not a date", stored)).toBeNull();
    });
  });
});
