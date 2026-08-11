import {
  ascendingCursorFilter,
  descendingCursorFilter,
  descendingDayCursorFilter,
  nextDescendingCursor,
  nextDescendingDayCursor,
} from "@/src/lib/descending-cursor";

describe("descending cursor", () => {
  it("leaves URL encoding to Supabase while preserving PostgREST grammar", () => {
    expect(
      descendingCursorFilter("completed_at", {
        timestamp: "2026-08-09T13:57:59.867076+00:00",
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(
      'completed_at.lt."2026-08-09T13:57:59.867076+00:00",and(completed_at.eq."2026-08-09T13:57:59.867076+00:00",id.lt."11111111-1111-4111-8111-111111111111")',
    );
  });

  it("rejects a column name that could alter filter grammar", () => {
    expect(() =>
      descendingCursorFilter("completed_at),id.gt.0", { timestamp: "now", id: "id" }),
    ).toThrow("Invalid cursor column");
  });

  it("uses greater-than for an oldest-first drain", () => {
    expect(
      ascendingCursorFilter("logged_at", {
        timestamp: "2026-08-09",
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(
      'logged_at.gt."2026-08-09",and(logged_at.eq."2026-08-09",id.gt."11111111-1111-4111-8111-111111111111")',
    );
  });

  it("takes the boundary from the final row and returns undefined for an empty page", () => {
    expect(
      nextDescendingCursor(
        [
          { id: "new", at: "2026-08-10" },
          { id: "old", at: "2026-08-09" },
        ],
        (row) => row.at,
      ),
    ).toEqual({ timestamp: "2026-08-09", id: "old" });
    expect(nextDescendingCursor([], (row: { id: string; at: string }) => row.at)).toBeUndefined();
  });
});

describe("descending day cursor", () => {
  const cursor = {
    day: "2026-08-09",
    timestamp: "2026-08-09T13:57:59.867076+00:00",
    id: "11111111-1111-4111-8111-111111111111",
  };

  it("builds the three-level keyset predicate for day, then timestamp, then id", () => {
    expect(descendingDayCursorFilter("entry_day", "created_at", cursor)).toBe(
      'entry_day.lt."2026-08-09",' +
        'and(entry_day.eq."2026-08-09",created_at.lt."2026-08-09T13:57:59.867076+00:00"),' +
        'and(entry_day.eq."2026-08-09",created_at.eq."2026-08-09T13:57:59.867076+00:00",' +
        'id.lt."11111111-1111-4111-8111-111111111111")',
    );
  });

  it("rejects malformed days, timestamps, ids, and grammar-altering columns", () => {
    expect(() =>
      descendingDayCursorFilter("entry_day", "created_at", { ...cursor, day: "yesterday" }),
    ).toThrow("Invalid cursor day");
    expect(() =>
      descendingDayCursorFilter("entry_day", "created_at", { ...cursor, timestamp: "nope" }),
    ).toThrow("Invalid cursor timestamp");
    expect(() =>
      descendingDayCursorFilter("entry_day", "created_at", { ...cursor, id: "1;drop" }),
    ).toThrow("Invalid cursor id");
    expect(() => descendingDayCursorFilter("entry_day),id.gt.0", "created_at", cursor)).toThrow(
      "Invalid cursor column",
    );
  });

  it("takes the boundary from the final row and returns undefined for an empty page", () => {
    expect(
      nextDescendingDayCursor(
        [
          { id: "new", day: "2026-08-10", at: "2026-08-10T08:00:00Z" },
          { id: "old", day: "2026-08-09", at: "2026-08-09T08:00:00Z" },
        ],
        (row) => row.day,
        (row) => row.at,
      ),
    ).toEqual({ day: "2026-08-09", timestamp: "2026-08-09T08:00:00Z", id: "old" });
    expect(
      nextDescendingDayCursor(
        [],
        (row: { id: string; day: string; at: string }) => row.day,
        (row) => row.at,
      ),
    ).toBeUndefined();
  });
});
