import {
  completeActivity,
  getActivity,
  getLatestCompletedActivityAt,
  listActivities,
  listRecentCompletedActivities,
  saveActivity,
} from "@/src/features/activities/repository";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

jest.mock("@/src/lib/latest-activity", () => ({ fetchLatestActivity: jest.fn() }));

const mockFetchLatestActivity = jest.mocked(fetchLatestActivity);

const mockRequireSupabase = jest.mocked(requireSupabase);

const sampleRow = {
  id: "a-1",
  user_id: "user-1",
  activity_name: "Walk",
  category: "pleasure",
  pace_category: null,
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
  paceCategory: null,
  scheduledAt: "2026-05-16T09:00:00.000Z",
  scheduledOffsetMinutes: null,
  scheduledDayKey: "2026-05-16",
  completedAt: null,
  completedOffsetMinutes: null,
  completedDayKey: null,
  moodBefore: 3,
  moodAfter: null,
  notes: "park loop",
  createdAt: "2026-05-15T08:00:00.000Z",
  updatedAt: "2026-05-15T08:00:00.000Z",
};

// The jest runner pins TZ to Asia/Kolkata (+05:30), so "the viewer's day" is fixed.
// 19:00Z on the 15th is 00:30 on the 16th in Kolkata but midday on the 15th at UTC-7 -
// one instant that lands on two different civil days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";
const UTC_MINUS_7 = -420;

const listOne = (row: Record<string, unknown>) => {
  const limit = jest.fn().mockResolvedValue({ data: [row], error: null });
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
};

describe("activities repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists activities scheduled ascending and maps rows", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [sampleRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listActivities("user-1")).resolves.toEqual([sampleMapped]);
    expect(from).toHaveBeenCalledWith("activity_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(order).toHaveBeenCalledWith("scheduled_at", { ascending: true, nullsFirst: false });
  });

  it("lists recent COMPLETED activities newest-first by completed_at, capped and mapped", async () => {
    const completedRow = { ...sampleRow, completed_at: "2026-05-16T10:00:00.000Z" };
    const limit = jest.fn().mockResolvedValue({ data: [completedRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const not = jest.fn(() => ({ order }));
    const eq = jest.fn(() => ({ not }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await listRecentCompletedActivities("user-1");
    expect(from).toHaveBeenCalledWith("activity_logs");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    // Only completed rows: routine derivation asks "completed on day X".
    expect(not).toHaveBeenCalledWith("completed_at", "is", null);
    expect(order).toHaveBeenCalledWith("completed_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(250);
    expect(result).toEqual([
      {
        ...sampleMapped,
        completedAt: "2026-05-16T10:00:00.000Z",
        completedDayKey: "2026-05-16",
      },
    ]);
  });

  it("throws when listRecentCompletedActivities query errors", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const order = jest.fn(() => ({ limit }));
    const not = jest.fn(() => ({ order }));
    const eq = jest.fn(() => ({ not }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listRecentCompletedActivities("user-1")).rejects.toMatchObject({ code: "42P01" });
  });

  it("returns null when getActivity finds no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits to null before supabase).
    const missingId = "11111111-1111-4111-8111-111111111111";
    await expect(getActivity("user-1", missingId)).resolves.toBeNull();
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqId).toHaveBeenCalledWith("id", missingId);
  });

  it("trims input and inserts a new activity", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveActivity("user-1", {
      activityName: "  Walk  ",
      category: "pleasure",
      paceCategory: null,
      scheduledAt: "2026-05-16T09:00:00.000Z",
      scheduledOffsetMinutes: 330,
      moodBefore: 3,
      notes: "  park loop  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      activity_name: "Walk",
      category: "pleasure",
      pace_category: null,
      scheduled_at: "2026-05-16T09:00:00.000Z",
      scheduled_offset_minutes: 330,
      mood_before: 3,
      notes: "park loop",
    });
  });

  it("updates an existing activity scoped to user and id", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
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
        paceCategory: null,
        scheduledAt: null,
        scheduledOffsetMinutes: null,
        moodBefore: null,
        notes: "",
      },
      "a-1",
    );

    expect(update).toHaveBeenCalledWith({
      user_id: "user-1",
      activity_name: "Walk",
      category: "mastery",
      pace_category: null,
      scheduled_at: null,
      // Cleared together: an edit that drops the schedule must not leave the row
      // asserting the civil day it used to mean (#330).
      scheduled_offset_minutes: null,
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
    const select = jest.fn(() => ({ single, maybeSingle: single }));
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
  // Both defects in #330, one per column. The activity is bucketed by the day it
  // was captured on, not the day its instant falls on for whoever is looking.
  describe("captured civil days", () => {
    it("buckets a COMPLETED activity to its captured day, not the viewer's", async () => {
      listOne({
        ...sampleRow,
        completed_at: ACROSS_MIDNIGHT_AT,
        completed_offset_minutes: UTC_MINUS_7, // finished at midday somewhere at UTC-7
      });

      const [activity] = await listActivities("user-1");
      expect(activity.completedOffsetMinutes).toBe(UTC_MINUS_7);
      expect(activity.completedDayKey).toBe(CAPTURED_DAY);
      // The instant alone would have filed it under the viewer's tomorrow.
      expect(activity.completedDayKey).not.toBe(VIEWER_DAY);
    });

    it("buckets a SCHEDULED activity to the day it was planned for, not the viewer's", async () => {
      // "Tuesday 7pm" picked at UTC-7 stays Tuesday after the user flies to Kolkata,
      // where the same instant is already Wednesday (owner decision, 2026-07-28).
      listOne({
        ...sampleRow,
        scheduled_at: ACROSS_MIDNIGHT_AT,
        scheduled_offset_minutes: UTC_MINUS_7,
      });

      const [activity] = await listActivities("user-1");
      expect(activity.scheduledOffsetMinutes).toBe(UTC_MINUS_7);
      expect(activity.scheduledDayKey).toBe(CAPTURED_DAY);
      expect(activity.scheduledDayKey).not.toBe(VIEWER_DAY);
      // The instant itself is untouched - it still orders the list and renders the
      // time of day (schedule-format.ts:12-15 stands).
      expect(activity.scheduledAt).toBe(ACROSS_MIDNIGHT_AT);
    });

    it("falls back to the viewer's day when no offset was captured", async () => {
      // Same instants, offsets absent: null means "unknown", never "UTC" (#250), so
      // the activity renders exactly where it always has rather than moving.
      listOne({
        ...sampleRow,
        scheduled_at: ACROSS_MIDNIGHT_AT,
        scheduled_offset_minutes: null,
        completed_at: ACROSS_MIDNIGHT_AT,
        completed_offset_minutes: null,
      });

      const [activity] = await listActivities("user-1");
      expect(activity.scheduledOffsetMinutes).toBeNull();
      expect(activity.completedOffsetMinutes).toBeNull();
      expect(activity.scheduledDayKey).toBe(VIEWER_DAY);
      expect(activity.completedDayKey).toBe(VIEWER_DAY);
    });

    it("treats columns absent from an older response as uncaptured", async () => {
      listOne({ ...sampleRow, scheduled_at: ACROSS_MIDNIGHT_AT, completed_at: ACROSS_MIDNIGHT_AT });

      const [activity] = await listActivities("user-1");
      expect(activity.scheduledOffsetMinutes).toBeNull();
      expect(activity.completedOffsetMinutes).toBeNull();
      expect(activity.scheduledDayKey).toBe(VIEWER_DAY);
      expect(activity.completedDayKey).toBe(VIEWER_DAY);
    });

    it("leaves both day keys null when there is no timestamp to place", async () => {
      // "Not scheduled" and "not done" are facts of their own. Resolving them to a
      // day would silently file every open activity under today.
      listOne({ ...sampleRow, scheduled_at: null, completed_at: null });

      const [activity] = await listActivities("user-1");
      expect(activity.scheduledDayKey).toBeNull();
      expect(activity.completedDayKey).toBeNull();
    });

    it("resolves each column with its OWN offset", async () => {
      // A plan made at UTC-7 and completed after flying to Kolkata: two captures,
      // two days. One shared offset would collapse them onto the same day.
      listOne({
        ...sampleRow,
        scheduled_at: ACROSS_MIDNIGHT_AT,
        scheduled_offset_minutes: UTC_MINUS_7,
        completed_at: ACROSS_MIDNIGHT_AT,
        completed_offset_minutes: 330,
      });

      const [activity] = await listActivities("user-1");
      expect(activity.scheduledDayKey).toBe(CAPTURED_DAY);
      expect(activity.completedDayKey).toBe(VIEWER_DAY);
    });
  });

  it("sends the completion instant and its offset from one reading of the clock", async () => {
    const single = jest.fn().mockResolvedValue({ data: sampleRow, error: null });
    const select = jest.fn(() => ({ single, maybeSingle: single }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await completeActivity("user-1", "a-1", 4);

    const payload = (update.mock.calls as unknown as [Record<string, unknown>][])[0][0];
    // The pair has to describe the same moment: the offset must be the one in force
    // at the instant sent, not whatever a second clock reading would have produced.
    const sent = new Date(payload.completed_at as string);
    expect(Number.isNaN(sent.getTime())).toBe(false);
    expect(payload.completed_offset_minutes).toBe(-sent.getTimezoneOffset());
  });
});

describe("getLatestCompletedActivityAt", () => {
  // `completed_at`, never `scheduled_at`: the row reports what was done, and the
  // schedule-ordered 500-row list could push a recent completion off its own page.
  it("reads the newest completion with its captured offset (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: -420,
    });

    await expect(getLatestCompletedActivityAt("user-1")).resolves.toEqual({
      at: "2026-07-27T08:00:00.000Z",
      offsetMinutes: -420,
    });
    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "activity_logs",
      userId: "user-1",
      column: "completed_at",
      offsetColumn: "completed_offset_minutes",
    });
  });
});
