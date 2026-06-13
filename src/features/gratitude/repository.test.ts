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

    await expect(getGratitudeEntry("user-1", "missing")).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "missing");
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
    const select = jest.fn(() => ({ single }));
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
    const select = jest.fn(() => ({ single }));
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
    const select = jest.fn(() => ({ single }));
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
    const select = jest.fn(() => ({ single }));
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
});
