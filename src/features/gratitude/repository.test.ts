import {
  deleteGratitudeEntry,
  getGratitudeEntry,
  listGratitudeEntries,
  saveGratitudeEntry,
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
        level: 3,
        events: [],
        good_moment: "",
        miss_if_gone: "",
        hidden_good: "",
        life_item_1: "",
        life_item_2: "",
        life_item_3: "",
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
        items: ["Warm coffee", "Sunlight"],
        events: [],
        goodMoment: "",
        missIfGone: "",
        hiddenGood: "",
        lifeItems: [],
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

  it("trims, filters blanks, and inserts a new entry", async () => {
    const row = {
      id: "g-1",
      user_id: "user-1",
      item_1: "Warm coffee",
      item_2: "Sunlight",
      item_3: "",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
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

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      level: 3,
      item_1: "Warm coffee",
      item_2: "Sunlight",
      item_3: "",
      note: "A steady morning.",
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
    });
  });

  it("trims and updates an existing entry", async () => {
    const row = {
      id: "g-1",
      user_id: "user-1",
      item_1: "Updated",
      item_2: "",
      item_3: "",
      level: 3,
      events: [],
      good_moment: "",
      miss_if_gone: "",
      hidden_good: "",
      life_item_1: "",
      life_item_2: "",
      life_item_3: "",
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
      items: ["Updated"],
      events: [],
      goodMoment: "",
      missIfGone: "",
      hiddenGood: "",
      lifeItems: [],
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

  it("rejects saves without a gratitude item", async () => {
    await expect(
      saveGratitudeEntry("user-1", { level: 3, items: ["  "], note: "" }),
    ).rejects.toThrow("At least one gratitude item is required.");
    expect(mockRequireSupabase).not.toHaveBeenCalled();
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
});
