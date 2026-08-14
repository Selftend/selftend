import {
  archiveThoughtRecord,
  countThoughtRecordsSince,
  getLatestThoughtRecordAt,
  getThoughtRecord,
  listThoughtRecords,
  saveThoughtRecord,
} from "@/src/features/cbt/repository";
import type { ThoughtRecordInput } from "@/src/features/cbt/types";
import { fetchLatestActivity } from "@/src/lib/latest-activity";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

jest.mock("@/src/lib/latest-activity", () => ({ fetchLatestActivity: jest.fn() }));

const mockFetchLatestActivity = jest.mocked(fetchLatestActivity);

const mockRequireSupabase = jest.mocked(requireSupabase);

function buildClient(builders: Record<string, unknown>) {
  return { from: jest.fn((t: string) => builders[t]) } as unknown as ReturnType<
    typeof requireSupabase
  >;
}

const FULL_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "u1",
  situation: "stuck in traffic",
  nats: [{ text: "I'll be late", beliefRating: 80, isHotThought: true }],
  emotions: ["anxious"],
  emotion_intensity_before: 70,
  distortions: ["catastrophizing"],
  evidence_for: ["boss frowned"],
  evidence_against: ["usually on time"],
  balanced_thought: "It will probably be fine",
  emotion_intensity_after: 30,
  outcome_notes: "felt calmer",
  created_at: "2026-05-10T07:00:00.000Z",
  updated_at: "2026-05-11T07:00:00.000Z",
  archived_at: null,
};

// Every nullable column set to null, to exercise the `?? []` / `?? ""` fallback arms of mapThoughtRecord.
const NULL_ROW = {
  ...FULL_ROW,
  nats: null,
  emotions: null,
  emotion_intensity_before: null,
  distortions: null,
  evidence_for: null,
  evidence_against: null,
  emotion_intensity_after: null,
  outcome_notes: null,
};

// The jest runner pins TZ to Asia/Kolkata (+05:30), so "the viewer's day" is
// fixed. 19:00Z on the 15th is already 00:30 on the 16th here, but midday on the
// 15th at UTC-7 - one instant that lands on two different civil days.
const ACROSS_MIDNIGHT_AT = "2026-05-15T19:00:00.000Z";
const CAPTURED_DAY = "2026-05-15";
const VIEWER_DAY = "2026-05-16";

const listOne = (row: Record<string, unknown>) => {
  const limit = jest.fn().mockResolvedValue({ data: [row], error: null });
  const order = jest.fn(() => ({ limit }));
  const isArchived = jest.fn(() => ({ order }));
  const eqUser = jest.fn(() => ({ is: isArchived }));
  const select = jest.fn(() => ({ eq: eqUser }));
  mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));
};

const INPUT: ThoughtRecordInput = {
  situation: "  stuck in traffic  ",
  nats: [{ text: "I'll be late", beliefRating: 80, isHotThought: true }],
  emotions: ["anxious"],
  emotionIntensityBefore: 70,
  distortions: ["catastrophizing"],
  evidenceFor: ["  boss frowned  ", "   ", ""],
  evidenceAgainst: ["  usually on time  "],
  balancedThought: "  It will probably be fine  ",
  emotionIntensityAfter: 30,
  outcomeNotes: "  felt calmer  ",
};

describe("cbt repository - countThoughtRecordsSince", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts non-archived thought records created since a cutoff (head request + is + gte filters)", async () => {
    const gte = jest.fn().mockResolvedValue({ count: 5, error: null });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(5);

    expect(from).toHaveBeenCalledWith("thought_records");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(isArchived).toHaveBeenCalledWith("archived_at", null);
    expect(gte).toHaveBeenCalledWith("created_at", "2026-05-13T00:00:00.000Z");
  });

  it("treats a null count as zero", async () => {
    const gte = jest.fn().mockResolvedValue({ count: null, error: null });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).resolves.toBe(0);
  });

  it("throws when the count query errors", async () => {
    const gte = jest.fn().mockResolvedValue({ count: null, error: new Error("boom") });
    const isArchived = jest.fn(() => ({ gte }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(countThoughtRecordsSince("user-1", "2026-05-13T00:00:00.000Z")).rejects.toThrow(
      "boom",
    );
  });
});

describe("cbt repository - listThoughtRecords", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps rows, filling both the present and the null/undefined arms of mapThoughtRecord", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [FULL_ROW, NULL_ROW], error: null });
    const order = jest.fn(() => ({ limit }));
    const isArchived = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));

    const result = await listThoughtRecords("u1");

    expect(select).toHaveBeenCalledWith("*");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(isArchived).toHaveBeenCalledWith("archived_at", null);
    expect(order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(500);

    // present arm
    expect(result[0]).toEqual({
      id: FULL_ROW.id,
      userId: "u1",
      situation: "stuck in traffic",
      nats: FULL_ROW.nats,
      emotions: ["anxious"],
      emotionIntensityBefore: 70,
      distortions: ["catastrophizing"],
      evidenceFor: ["boss frowned"],
      evidenceAgainst: ["usually on time"],
      balancedThought: "It will probably be fine",
      emotionIntensityAfter: 30,
      outcomeNotes: "felt calmer",
      createdAt: FULL_ROW.created_at,
      createdOffsetMinutes: null,
      dayKey: "2026-05-10",
      updatedAt: FULL_ROW.updated_at,
      archivedAt: null,
    });

    // null/fallback arm
    expect(result[1]).toMatchObject({
      nats: [],
      emotions: [],
      emotionIntensityBefore: null,
      distortions: [],
      evidenceFor: [],
      evidenceAgainst: [],
      emotionIntensityAfter: null,
      outcomeNotes: "",
    });
  });

  it("buckets a record to its captured day, not the viewer's", async () => {
    // The defect: this record was written at midday somewhere at UTC-7 on the
    // 15th. Converting its instant through the viewer's timezone files it under
    // the 16th - a day the user had not lived when they wrote it (#330).
    listOne({
      ...FULL_ROW,
      created_at: ACROSS_MIDNIGHT_AT,
      created_offset_minutes: -420,
    });

    const [record] = await listThoughtRecords("u1");
    expect(record.createdOffsetMinutes).toBe(-420);
    expect(record.dayKey).toBe(CAPTURED_DAY);
    expect(record.dayKey).not.toBe(VIEWER_DAY);
  });

  it("falls back to the viewer's day when no offset was captured", async () => {
    // Same instant, offset absent: null means "unknown", never "UTC" (#250), so
    // the record renders exactly where it always has rather than moving.
    listOne({ ...FULL_ROW, created_at: ACROSS_MIDNIGHT_AT, created_offset_minutes: null });

    const [record] = await listThoughtRecords("u1");
    expect(record.createdOffsetMinutes).toBeNull();
    expect(record.dayKey).toBe(VIEWER_DAY);
  });

  it("treats a column absent from an older response as uncaptured", async () => {
    listOne({ ...FULL_ROW, created_at: ACROSS_MIDNIGHT_AT });

    const [record] = await listThoughtRecords("u1");
    expect(record.createdOffsetMinutes).toBeNull();
    expect(record.dayKey).toBe(VIEWER_DAY);
  });

  it("throws when the list query errors", async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: new Error("list boom") });
    const order = jest.fn(() => ({ limit }));
    const isArchived = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ is: isArchived }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));

    await expect(listThoughtRecords("u1")).rejects.toThrow("list boom");
  });
});

describe("cbt repository - getThoughtRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for a malformed uuid without touching the client", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    expect(await getThoughtRecord("u1", "not-a-uuid")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));

    const result = await getThoughtRecord("u1", FULL_ROW.id);

    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", FULL_ROW.id);
    expect(result).toMatchObject({ id: FULL_ROW.id, situation: "stuck in traffic" });
  });

  it("returns null when no row is found", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));

    expect(await getThoughtRecord("u1", FULL_ROW.id)).toBeNull();
  });

  it("throws when the fetch errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error("get boom") });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { select } }));

    await expect(getThoughtRecord("u1", FULL_ROW.id)).rejects.toThrow("get boom");
  });
});

describe("cbt repository - saveThoughtRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts a trimmed, empty-filtered payload without created_at when none is provided", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { insert } }));

    const result = await saveThoughtRecord("u1", INPUT);

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toEqual({
      user_id: "u1",
      situation: "stuck in traffic",
      nats: INPUT.nats,
      emotions: ["anxious"],
      emotion_intensity_before: 70,
      distortions: ["catastrophizing"],
      evidence_for: ["boss frowned"],
      evidence_against: ["usually on time"],
      balanced_thought: "It will probably be fine",
      emotion_intensity_after: 30,
      outcome_notes: "felt calmer",
    });
    expect(payload).not.toHaveProperty("created_at");
    // Neither half alone: a server-defaulted instant with no offset records
    // "unknown", which is truthful. An offset with no instant would not be.
    expect(payload).not.toHaveProperty("created_offset_minutes");
    expect(result).toMatchObject({ id: FULL_ROW.id });
  });

  it("includes the instant AND its offset in the insert payload when provided", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { insert } }));

    await saveThoughtRecord("u1", {
      ...INPUT,
      createdAt: "2026-01-01T00:00:00.000Z",
      createdOffsetMinutes: 540,
    });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({
      created_at: "2026-01-01T00:00:00.000Z",
      created_offset_minutes: 540,
    });
  });

  it("sends neither half when the offset is missing", async () => {
    // A half-pair would let a device offset be attached to a server-defaulted
    // instant. At 23:59 those are two different clocks, a whole day apart, and
    // the resulting civil day would be permanently wrong rather than merely
    // unknown (#330).
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { insert } }));

    await saveThoughtRecord("u1", { ...INPUT, createdAt: "2026-01-01T00:00:00.000Z" });

    const payload = (insert.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("created_offset_minutes");
  });

  it("never re-stamps the captured day when editing an existing record", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { update } }));

    await saveThoughtRecord(
      "u1",
      { ...INPUT, createdAt: "2026-01-01T00:00:00.000Z", createdOffsetMinutes: 540 },
      "record-1",
    );

    // The stored pair has to survive an edit made anywhere else in the world:
    // the record's day is where the thought was caught, not where it was reread.
    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("created_offset_minutes");
  });

  it("updates the scoped row when a recordId is given", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: FULL_ROW, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { update } }));

    await saveThoughtRecord("u1", INPUT, FULL_ROW.id);

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toMatchObject({ situation: "stuck in traffic", user_id: "u1" });
    expect(payload).not.toHaveProperty("created_at");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", FULL_ROW.id);
  });

  it("throws the not-found sentinel when the update returns no row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const select = jest.fn(() => ({ maybeSingle }));
    const eqId = jest.fn(() => ({ select }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { update } }));

    await expect(saveThoughtRecord("u1", INPUT, FULL_ROW.id)).rejects.toThrow(
      "Thought record not found",
    );
  });

  it("throws when the save query errors", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: new Error("save boom") });
    const select = jest.fn(() => ({ maybeSingle }));
    const insert = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { insert } }));

    await expect(saveThoughtRecord("u1", INPUT)).rejects.toThrow("save boom");
  });
});

describe("cbt repository - archiveThoughtRecord", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stamps archived_at on the scoped row", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { update } }));

    await archiveThoughtRecord("u1", FULL_ROW.id);

    const payload = (update.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(payload).toHaveProperty("archived_at");
    expect(typeof payload.archived_at).toBe("string");
    expect(eqUser).toHaveBeenCalledWith("user_id", "u1");
    expect(eqId).toHaveBeenCalledWith("id", FULL_ROW.id);
  });

  it("throws when the archive update errors", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: new Error("archive boom") });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    mockRequireSupabase.mockReturnValue(buildClient({ thought_records: { update } }));

    await expect(archiveThoughtRecord("u1", FULL_ROW.id)).rejects.toThrow("archive boom");
  });
});

describe("getLatestThoughtRecordAt", () => {
  // `created_at`, not the `updated_at` the list is ordered by: the row reports the last
  // record WRITTEN. Archived records are excluded, matching the count beside it.
  it("reads the newest non-archived record by creation (#990)", async () => {
    mockFetchLatestActivity.mockResolvedValue(null);

    await getLatestThoughtRecordAt("user-1");

    expect(mockFetchLatestActivity).toHaveBeenCalledWith({
      table: "thought_records",
      userId: "user-1",
      column: "created_at",
      offsetColumn: "created_offset_minutes",
      isNull: "archived_at",
    });
  });
});
