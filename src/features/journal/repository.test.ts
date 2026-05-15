import {
  deleteJournalEntry,
  getJournalEntry,
  listJournalEntries,
  saveJournalEntry,
} from "@/src/features/journal/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

describe("journal repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists entries newest-first and maps rows", async () => {
    const rows = [
      {
        id: "j-1",
        user_id: "user-1",
        title: "Today",
        body: "Walked outside",
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

    await expect(listJournalEntries("user-1", 25)).resolves.toEqual([
      {
        id: "j-1",
        userId: "user-1",
        title: "Today",
        body: "Walked outside",
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);
    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(25);
  });

  it("returns null when getJournalEntry finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getJournalEntry("user-1", "missing")).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "missing");
  });

  it("trims title and body and inserts a new entry", async () => {
    const row = {
      id: "j-1",
      user_id: "user-1",
      title: "Today",
      body: "Walked outside",
      created_at: "2026-05-15T08:00:00.000Z",
      updated_at: "2026-05-15T08:00:00.000Z",
    };
    const single = jest.fn().mockResolvedValue({ data: row, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveJournalEntry("user-1", {
      title: "  Today  ",
      body: "  Walked outside  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Today",
      body: "Walked outside",
    });
  });

  it("trims and updates an existing entry", async () => {
    const row = {
      id: "j-1",
      user_id: "user-1",
      title: "Updated",
      body: "Body",
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
      saveJournalEntry("user-1", { title: " Updated ", body: " Body " }, "j-1"),
    ).resolves.toEqual({
      id: "j-1",
      userId: "user-1",
      title: "Updated",
      body: "Body",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:30:00.000Z",
    });

    expect(update).toHaveBeenCalledWith({
      title: "Updated",
      body: "Body",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "j-1");
  });

  it("deletes by id scoped to user", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const del = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ delete: del }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await deleteJournalEntry("user-1", "j-1");

    expect(from).toHaveBeenCalledWith("journal_entries");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "j-1");
  });
});
