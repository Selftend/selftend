import {
  countGratitudeEntries,
  countGratitudeEntriesSince,
  deleteGratitudeEntry,
  getGratitudeEntry,
  listFavoriteGratitudeEntries,
  listGratitudeEntries,
  saveGratitudeEntry,
  setGratitudeEntryStarred,
} from "@/src/features/gratitude/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("gratitude repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists entries newest-first and maps rows", async () => {
    const rows = [
      {
        id: "g-1",
        user_id: "user-1",
        item_1: "Warm coffee",
        item_2: "Sunlight",
        item_3: "",
        item_4: "",
        item_5: "",
        level: 3,
        events: [],
        good_moment: "",
        miss_if_gone: "",
        hidden_good: "",
        life_item_1: "",
        life_item_2: "",
        life_item_3: "",
        starred: true,
        note: "A steady morning.",
        logged_at: "2026-05-15T08:00:00.000Z",
        created_at: "2026-05-15T08:00:00.000Z",
        updated_at: "2026-05-15T08:00:00.000Z",
      },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listGratitudeEntries("user-1", 25)).resolves.toEqual([
      {
        id: "g-1",
        userId: "user-1",
        level: 3,
        items: ["Warm coffee", "Sunlight", "", "", ""],
        events: [],
        goodMoment: "",
        missIfGone: "",
        hiddenGood: "",
        lifeItems: ["", "", ""],
        starred: true,
        note: "A steady morning.",
        loggedAt: "2026-05-15T08:00:00.000Z",
        loggedOffsetMinutes: null,
        dayKey: "2026-05-15",
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);
    expect(from).toHaveBeenCalledWith("gratitude_entries");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(25);
  });

  it("returns null when getGratitudeEntry finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits before supabase).
    const missingId = "11111111-1111-4111-8111-111111111111";
    await expect(getGratitudeEntry("user-1", missingId)).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", missingId);
  });

  it("returns null for a malformed id without calling supabase", async () => {
    // PostgREST would reject the uuid cast with a 400 (console error), so the
    // repository must not fire the doomed request at all.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getGratitudeEntry("user-1", "does-not-exist")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("lists favorite entries newest-first", async () => {
    const rows = [
      {
        id: "g-1",
        user_id: "user-1",
        item_1: "Warm coffee",
        item_2: "",
        item_3: "",
        item_4: "",
        item_5: "",
        level: 3,
        events: [],
        good_moment: "",
        miss_if_gone: "",
        hidden_good: "",
        life_item_1: "",
        life_item_2: "",
        life_item_3: "",
        starred: true,
        note: "",
        logged_at: "2026-05-15T08:00:00.000Z",
        created_at: "2026-05-15T08:00:00.000Z",
        updated_at: "2026-05-15T08:00:00.000Z",
      },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eqStarred = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqStarred }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listFavoriteGratitudeEntries("user-1", 10)).resolves.toMatchObject([
      { id: "g-1", starred: true },
    ]);

    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStarred).toHaveBeenCalledWith("starred", true);
    expect(order).toHaveBeenCalledWith("logged_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(10);
  });

  it("trims and inserts a new entry, preserving empty slots positionally", async () => {
    const row = {
      id: "g-1",
      user_id: "user-1",
      item_1: "Warm coffee",
      item_2: "Sunlight",
      item_3: "",
      item_4: "",
      item_5: "",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
      starred: false,
      note: "A steady morning.",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGratitudeEntry("user-1", {
      level: 3,
      items: ["  Warm coffee  ", "   ", " Sunlight "],
      note: "  A steady morning.  ",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        level: 3,
        item_1: "Warm coffee",
        item_2: "",
        item_3: "Sunlight",
        item_4: "",
        item_5: "",
        note: "A steady morning.",
        events: [],
        good_moment: "",
        miss_if_gone: "",
        hidden_good: "",
        life_item_1: "",
        life_item_2: "",
        life_item_3: "",
      }),
    );
  });

  it("trims and updates an existing entry", async () => {
    const row = {
      id: "g-1",
      user_id: "user-1",
      item_1: "Updated",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
      starred: false,
      note: "",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:30:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGratitudeEntry("user-1", { level: 3, items: [" Updated "], note: " " }, "g-1"),
    ).resolves.toEqual({
      id: "g-1",
      userId: "user-1",
      level: 3,
      items: ["Updated", "", "", "", ""],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: ["", "", ""],
      starred: false,
      note: "",
      loggedAt: "2026-05-15T08:00:00.000Z",
      loggedOffsetMinutes: null,
      dayKey: "2026-05-15",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:30:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      level: 3,
      item_1: "Updated",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      note: "",
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "g-1");
  });

  it("stores up to five gratitude items", async () => {
    const row = {
      id: "g-5",
      user_id: "user-1",
      item_1: "Coffee",
      item_2: "Sunlight",
      item_3: "Music",
      item_4: "Warm socks",
      item_5: "A call",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "Home",
      life_item_2: "",
      life_item_3: "",
      starred: false,
      note: "",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:30:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGratitudeEntry("user-1", {
        level: 3,
        items: ["Coffee", "Sunlight", "Music", "Warm socks", "A call", "Extra"],
        lifeItems: ["Home"],
        note: "",
      }),
    ).resolves.toMatchObject({
      items: ["Coffee", "Sunlight", "Music", "Warm socks", "A call"],
      lifeItems: ["Home", "", ""],
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        item_1: "Coffee",
        item_2: "Sunlight",
        item_3: "Music",
        item_4: "Warm socks",
        item_5: "A call",
        life_item_1: "Home",
      }),
    );
  });

  it("rejects saves without a gratitude item", async () => {
    await expect(
      saveGratitudeEntry("user-1", { level: 3, items: ["  "], note: "" }),
    ).rejects.toThrow("At least one gratitude item is required.");
    expect(mockRequireSupabase).not.toHaveBeenCalled();
  });

  it("toggles the favorite marker scoped to user", async () => {
    const row = {
      id: "g-1",
      user_id: "user-1",
      item_1: "Warm coffee",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
      starred: true,
      note: "",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:30:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(setGratitudeEntryStarred("user-1", "g-1", true)).resolves.toMatchObject({
      id: "g-1",
      starred: true,
    });

    expect(update).toHaveBeenCalledWith({ starred: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "g-1");
  });

  it("deletes by id scoped to user", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteGratitudeEntry("user-1", "g-1");

    expect(from).toHaveBeenCalledWith("gratitude_entries");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "g-1");
  });

  it("counts all gratitude entries for a user with a head request", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: 312, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countGratitudeEntries("user-1")).resolves.toBe(312);
    expect(from).toHaveBeenCalledWith("gratitude_entries");
    expect(select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("treats a null gratitude count as zero", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: null });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countGratitudeEntries("user-1")).resolves.toBe(0);
  });

  it("counts gratitude entries logged since a cutoff (head request + gte filter)", async () => {
    const gte = jest.fn().mockResolvedValue({ count: 6, error: null });
    const eqUser = jest.fn(() => ({ gte }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countGratitudeEntriesSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(6);
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(gte).toHaveBeenCalledWith("logged_at", "2026-05-13T00:00:00.000Z");
  });

  it("sanitizes stored levels 1 and 2 and coerces anything else to 3", async () => {
    const base = {
      user_id: "user-1",
      item_1: "a",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
      starred: false,
      note: "",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const rows = [
      { ...base, id: "g-1", level: 1 },
      { ...base, id: "g-2", level: 2 },
      { ...base, id: "g-3", level: 99 },
      { ...base, id: "g-4", level: null },
    ];
    const limit = jest.fn().mockResolvedValue({ data: rows, error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listGratitudeEntries("user-1");
    expect(result.map((e) => e.level)).toEqual([1, 2, 3, 3]);
    // Default limit arm (no explicit argument) resolves to 50.
    expect(limit).toHaveBeenCalledWith(50);
  });

  it("defaults nullable columns when mapping a row full of nulls", async () => {
    const row = {
      id: "g-null",
      user_id: "user-1",
      level: 3,
      item_1: "Kept",
      item_2: "",
      item_3: "",
      item_4: null,
      item_5: null,
      events: null,
      good_moment: null,
      miss_if_gone: null,
      hidden_good: null,
      life_item_1: null,
      life_item_2: null,
      life_item_3: null,
      starred: null,
      // A hand-rolled PostgREST insert can omit note entirely (note_enc is
      // nullable since encryption); the read path must not carry the null
      // forward, or one such row error-boundaries both gratitude screens (#433 §4).
      note: null,
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const limit = jest.fn().mockResolvedValue({ data: [row], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const [entry] = await listGratitudeEntries("user-1", 5);
    expect(entry).toEqual({
      id: "g-null",
      userId: "user-1",
      level: 3,
      items: ["Kept", "", "", "", ""],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: ["", "", ""],
      starred: false,
      note: "",
      loggedAt: "2026-05-15T08:00:00.000Z",
      loggedOffsetMinutes: null,
      dayKey: "2026-05-15",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:00:00.000Z",
    });
  });

  it("propagates a list error", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST500" } });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listGratitudeEntries("user-1")).rejects.toMatchObject({ code: "PGRST500" });
  });

  it("propagates a favorites error and defaults its limit to 100", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST501" } });
    const order = jest.fn(() => ({ limit }));
    const eqStarred = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqStarred }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listFavoriteGratitudeEntries("user-1")).rejects.toMatchObject({
      code: "PGRST501",
    });
    expect(limit).toHaveBeenCalledWith(100);
  });

  it("propagates the count error", async () => {
    const eqUser = jest.fn().mockResolvedValue({ count: null, error: { code: "PGRST502" } });
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countGratitudeEntries("user-1")).rejects.toMatchObject({ code: "PGRST502" });
  });

  it("propagates the since-count error and treats a null since-count as zero", async () => {
    const gteErr = jest.fn().mockResolvedValue({ count: null, error: { code: "PGRST503" } });
    const eqErr = jest.fn(() => ({ gte: gteErr }));
    const selectErr = jest.fn(() => ({ eq: eqErr }));
    const fromErr = jest.fn(() => ({ select: selectErr }));
    mockRequireSupabase.mockReturnValue({
      from: fromErr,
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(
      countGratitudeEntriesSince("user-1", "2026-05-13T00:00:00.000Z"),
    ).rejects.toMatchObject({ code: "PGRST503" });

    const gteZero = jest.fn().mockResolvedValue({ count: null, error: null });
    const eqZero = jest.fn(() => ({ gte: gteZero }));
    const selectZero = jest.fn(() => ({ eq: eqZero }));
    const fromZero = jest.fn(() => ({ select: selectZero }));
    mockRequireSupabase.mockReturnValue({
      from: fromZero,
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(countGratitudeEntriesSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(0);
  });

  it("maps the found row for getGratitudeEntry and propagates its error", async () => {
    const foundRow = {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      level: 2,
      item_1: "Found",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
      starred: false,
      note: "",
      logged_at: "2026-05-15T08:00:00.000Z",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const maybeSingle = jest.fn().mockResolvedValue({ data: foundRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getGratitudeEntry("user-1", foundRow.id)).resolves.toMatchObject({
      id: foundRow.id,
      level: 2,
      items: ["Found", "", "", "", ""],
    });

    const maybeSingleErr = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST504" } });
    const eqIdErr = jest.fn(() => ({ maybeSingle: maybeSingleErr }));
    const eqUserErr = jest.fn(() => ({ eq: eqIdErr }));
    const selectErr = jest.fn(() => ({ eq: eqUserErr }));
    const fromErr = jest.fn(() => ({ select: selectErr }));
    mockRequireSupabase.mockReturnValue({
      from: fromErr,
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(getGratitudeEntry("user-1", foundRow.id)).rejects.toMatchObject({
      code: "PGRST504",
    });
  });

  it("sanitizes the optional prose fields, filters events, and keeps an explicit loggedAt", async () => {
    const row = {
      id: "g-full",
      user_id: "user-1",
      item_1: "Coffee",
      item_2: "",
      item_3: "",
      item_4: "",
      item_5: "",
      level: 1,
      events: ["Walk", "Call"],
      good_moment: "A quiet walk",
      miss_if_gone: "My family",
      hidden_good: "Slow mornings",
      life_item_1: "Home",
      life_item_2: "Health",
      life_item_3: "",
      starred: false,
      note: "Grateful",
      logged_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveGratitudeEntry("user-1", {
      level: 1,
      items: ["  Coffee  "],
      note: "  Grateful  ",
      events: ["  Walk  ", "   ", " Call ", "Extra1", "Extra2"],
      goodMoment: "  A quiet walk  ",
      missIfGone: "  My family  ",
      hiddenGood: "  Slow mornings  ",
      lifeItems: ["  Home  ", " Health "],
      loggedAt: "2026-01-01T00:00:00.000Z",
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      user_id: "user-1",
      level: 1,
      good_moment: "A quiet walk",
      miss_if_gone: "My family",
      hidden_good: "Slow mornings",
      life_item_1: "Home",
      life_item_2: "Health",
      // Blank entries dropped, capped at three events.
      events: ["Walk", "Call", "Extra1"],
      logged_at: "2026-01-01T00:00:00.000Z",
    });
  });

  it("propagates a save error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGratitudeEntry("user-1", { level: 3, items: ["Coffee"], note: "" }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("throws not-found when an update returns no row", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveGratitudeEntry("user-1", { level: 3, items: ["Coffee"], note: "" }, "g-missing"),
    ).rejects.toThrow("Gratitude entry not found");
  });

  it("propagates a starred-toggle error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "PGRST505" } });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(setGratitudeEntryStarred("user-1", "g-1", false)).rejects.toMatchObject({
      code: "PGRST505",
    });
  });

  it("propagates a delete error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "PGRST506" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(deleteGratitudeEntry("user-1", "g-1")).rejects.toMatchObject({ code: "PGRST506" });
  });
});
