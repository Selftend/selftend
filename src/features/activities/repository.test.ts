import {
  completeActivity,
  getActivity,
  listActivities,
  saveActivity,
} from "@/src/features/activities/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "a-1",
  user_id: "user-1",
  activity_name: "Walk",
  category: "pleasure",
  scheduled_at: "2026-05-16T09:00:00.000Z",
  completed_at: null,
  mood_before: 3,
  mood_after: null,
  notes: "park loop",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const sampleMapped = {
  id: "a-1",
  userId: "user-1",
  activityName: "Walk",
  category: "pleasure",
  scheduledAt: "2026-05-16T09:00:00.000Z",
  completedAt: null,
  moodBefore: 3,
  moodAfter: null,
  notes: "park loop",
  createdAt: "2026-05-15T08:00:00.000Z",
  updatedAt: "2026-05-15T08:00:00.000Z",
};

describe("activities repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists activities scheduled ascending and maps rows", async () => {
    const order = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listActivities("user-1")).resolves.toEqual([sampleMapped]);
    expect(from).toHaveBeenCalledWith("activity_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("scheduled_at", { ascending: true, nullsFirst: false });
  });

  it("returns null when getActivity finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getActivity("user-1", "missing")).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "missing");
  });

  it("trims input and inserts a new activity", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveActivity("user-1", {
      activityName: "  Walk  ",
      category: "pleasure",
      scheduledAt: "2026-05-16T09:00:00.000Z",
      moodBefore: 3,
      notes: "  park loop  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      activity_name: "Walk",
      category: "pleasure",
      scheduled_at: "2026-05-16T09:00:00.000Z",
      mood_before: 3,
      notes: "park loop",
    });
  });

  it("updates an existing activity scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveActivity(
      "user-1",
      {
        activityName: "Walk",
        category: "mastery",
        scheduledAt: null,
        moodBefore: null,
        notes: "",
      },
      "a-1",
    );

    expect(update).toHaveBeenCalledWith({
      user_id: "user-1",
      activity_name: "Walk",
      category: "mastery",
      scheduled_at: null,
      mood_before: null,
      notes: "",
    });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "a-1");
  });

  it("completes an activity with timestamp and moodAfter", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { ...sampleRow, completed_at: "now", mood_after: 4 },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await completeActivity("user-1", "a-1", 4);

    const calls = update.mock.calls as unknown as [{ completed_at: string; mood_after: number }][];
    const payload = calls[0][0];
    expect(payload.mood_after).toBe(4);
    expect(typeof payload.completed_at).toBe("string");
    expect(payload.completed_at.length).toBeGreaterThan(0);
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", "a-1");
  });
});
