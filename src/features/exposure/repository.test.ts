import {
  getHierarchy,
  getItem,
  listAllItems,
  listHierarchies,
  listItems,
  listSessions,
  saveHierarchy,
  saveItems,
  saveSession,
} from "@/src/features/exposure/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const hierarchyRow = {
  id: "h-1",
  user_id: "user-1",
  title: "Driving",
  anxiety_type: "phobia",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const itemRow = {
  id: "i-1",
  hierarchy_id: "h-1",
  user_id: "user-1",
  description: "Sit in parked car",
  suds_rating: 30,
  completed_at: null,
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const sessionRow = {
  id: "s-1",
  exposure_item_id: "i-1",
  user_id: "user-1",
  pre_suds: 60,
  post_suds: 30,
  duration_minutes: 15,
  safety_behaviors_used: false,
  safety_behavior_description: "",
  notes: "",
  completed_at: "2026-05-15T08:30:00.000Z",
  created_at: "2026-05-15T08:30:00.000Z",
};

describe("exposure repository - hierarchies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists hierarchies newest-first", async () => {
    const order = jest.fn().mockResolvedValue({ data: [hierarchyRow], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listHierarchies("user-1");
    expect(from).toHaveBeenCalledWith("exposure_hierarchies");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns null when getHierarchy finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getHierarchy("user-1", "missing")).resolves.toBeNull();
  });

  it("trims title and anxiety type on insert", async () => {
    const single = jest.fn().mockResolvedValue({ data: hierarchyRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveHierarchy("user-1", { title: "  Driving  ", anxietyType: "  phobia  " });
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      title: "Driving",
      anxiety_type: "phobia",
    });
  });
});

describe("exposure repository - items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists items by hierarchy ordered by suds ascending", async () => {
    const order = jest.fn().mockResolvedValue({ data: [itemRow], error: null });
    const eqH = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqH }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listItems("user-1", "h-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqH).toHaveBeenCalledWith("hierarchy_id", "h-1");
    expect(order).toHaveBeenCalledWith("suds_rating", { ascending: true });
  });

  it("listAllItems orders by created_at desc", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [itemRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listAllItems("user-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("trims item descriptions on bulk insert", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveItems("user-1", "h-1", [
      { description: "  step a  ", sudsRating: 20 },
      { description: "step b", sudsRating: 50 },
    ]);

    expect(insert).toHaveBeenCalledWith([
      { hierarchy_id: "h-1", user_id: "user-1", description: "step a", suds_rating: 20 },
      { hierarchy_id: "h-1", user_id: "user-1", description: "step b", suds_rating: 50 },
    ]);
  });

  it("returns null when getItem finds nothing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getItem("user-1", "missing")).resolves.toBeNull();
  });
});

describe("exposure repository - sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists sessions for an item ordered by completed_at desc", async () => {
    const order = jest.fn().mockResolvedValue({ data: [sessionRow], error: null });
    const eqI = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqI }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listSessions("user-1", "i-1");
    expect(eqI).toHaveBeenCalledWith("exposure_item_id", "i-1");
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
  });

  it("saves a session and marks the item completed", async () => {
    const single = jest.fn().mockResolvedValue({ data: sessionRow, error: null });
    const selectSession = jest.fn(() => ({ single }));
    const insertSession = jest.fn(() => ({ select: selectSession }));
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));

    const from = jest.fn((table: string) => {
      if (table === "exposure_sessions") return { insert: insertSession };
      if (table === "exposure_items") return { update };
      throw new Error(`unexpected table ${table}`);
    });
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveSession("user-1", "i-1", {
      preSuds: 60,
      postSuds: 30,
      durationMinutes: 15,
      safetyBehaviorsUsed: false,
      safetyBehaviorDescription: "  ",
      notes: "  good  ",
    });

    expect(insertSession).toHaveBeenCalledWith({
      exposure_item_id: "i-1",
      user_id: "user-1",
      pre_suds: 60,
      post_suds: 30,
      duration_minutes: 15,
      safety_behaviors_used: false,
      safety_behavior_description: "",
      notes: "good",
    });
    const calls = update.mock.calls as unknown as [{ completed_at: string }][];
    expect(typeof calls[0][0].completed_at).toBe("string");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "i-1");
  });
});
