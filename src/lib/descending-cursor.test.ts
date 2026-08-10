import {
  ascendingCursorFilter,
  descendingCursorFilter,
  nextDescendingCursor,
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
