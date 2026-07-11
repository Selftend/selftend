import {
  getTask,
  listSteps,
  listTasks,
  saveSteps,
  saveTask,
  toggleStepComplete,
  updateTaskStatus,
} from "@/src/features/procrastination/repository";
import { requireSupabase } from "@/src/lib/supabase";

jest.mock("@/src/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

const mockRequireSupabase = jest.mocked(requireSupabase);

const taskRow = {
  id: "t-1",
  user_id: "user-1",
  task_description: "Write report",
  avoidance_reason: "boring",
  fear_thought: "will be judged",
  challenged_thought: "feedback is useful",
  deadline: "2026-06-01",
  reward: "coffee",
  status: "in_progress",
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

const stepRow = {
  id: "s-1",
  task_id: "t-1",
  user_id: "user-1",
  description: "Outline",
  estimated_minutes: 10,
  completed_at: null,
  created_at: "2026-05-15T08:00:00.000Z",
  updated_at: "2026-05-15T08:00:00.000Z",
};

describe("procrastination repository - tasks", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists tasks newest-first", async () => {
    const limit = jest.fn().mockResolvedValue({ data: [taskRow], error: null });
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await listTasks("user-1");
    expect(from).toHaveBeenCalledWith("procrastination_tasks");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("listTasks maps rows and throws on error", async () => {
    const limitOk = jest.fn().mockResolvedValue({ data: [taskRow], error: null });
    const orderOk = jest.fn(() => ({ limit: limitOk }));
    const eqOk = jest.fn(() => ({ order: orderOk }));
    const selectOk = jest.fn(() => ({ eq: eqOk }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select: selectOk })),
    } as unknown as ReturnType<typeof requireSupabase>);
    const rows = await listTasks("user-1");
    expect(rows).toEqual([
      {
        id: "t-1",
        userId: "user-1",
        taskDescription: "Write report",
        avoidanceReason: "boring",
        fearThought: "will be judged",
        challengedThought: "feedback is useful",
        deadline: "2026-06-01",
        reward: "coffee",
        status: "in_progress",
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);

    const limitErr = jest.fn().mockResolvedValue({ data: null, error: { code: "500" } });
    const orderErr = jest.fn(() => ({ limit: limitErr }));
    const eqErr = jest.fn(() => ({ order: orderErr }));
    const selectErr = jest.fn(() => ({ eq: eqErr }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ select: selectErr })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await expect(listTasks("user-1")).rejects.toMatchObject({ code: "500" });
  });

  it("getTask short-circuits to null on a malformed id without querying", async () => {
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);
    await expect(getTask("user-1", "not-a-uuid")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("getTask maps a found row", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: taskRow, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const result = await getTask("user-1", "11111111-1111-4111-8111-111111111111");
    expect(result).toMatchObject({ id: "t-1", taskDescription: "Write report" });
    expect(eqId).toHaveBeenCalledWith("id", "11111111-1111-4111-8111-111111111111");
  });

  it("getTask throws on a real error", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: { code: "42P01" } });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getTask("user-1", "11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      code: "42P01",
    });
  });

  it("returns null when getTask finds nothing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    // Well-formed uuid that matches no row, so the query itself runs (a malformed
    // id short-circuits to null before supabase).
    await expect(getTask("user-1", "11111111-1111-4111-8111-111111111111")).resolves.toBeNull();
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("trims text fields and inserts a task", async () => {
    const single = jest.fn().mockResolvedValue({ data: taskRow, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveTask("user-1", {
      taskDescription: "  Write report  ",
      avoidanceReason: "  boring  ",
      fearThought: "  fear  ",
      challengedThought: "  challenge  ",
      deadline: "2026-06-01",
      reward: "  coffee  ",
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      task_description: "Write report",
      avoidance_reason: "boring",
      fear_thought: "fear",
      challenged_thought: "challenge",
      deadline: "2026-06-01",
      reward: "coffee",
    });
  });

  it("saveTask throws on a real error", async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveTask("user-1", {
        taskDescription: "x",
        avoidanceReason: "y",
        fearThought: "z",
        challengedThought: "w",
        deadline: null,
        reward: "r",
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("updateTaskStatus updates just status", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateTaskStatus("user-1", "t-1", "completed");
    expect(update).toHaveBeenCalledWith({ status: "completed" });
  });

  it("updateTaskStatus throws on a real error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "500" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(updateTaskStatus("user-1", "t-1", "completed")).rejects.toMatchObject({
      code: "500",
    });
  });
});

describe("procrastination repository - steps", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists steps for a task ordered by created_at asc", async () => {
    const order = jest.fn().mockResolvedValue({ data: [stepRow], error: null });
    const eqT = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqT }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    const taskId = "33333333-3333-4333-8333-333333333333";
    const result = await listSteps("user-1", taskId);
    expect(result).toEqual([
      {
        id: "s-1",
        taskId: "t-1",
        userId: "user-1",
        description: "Outline",
        estimatedMinutes: 10,
        completedAt: null,
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-05-15T08:00:00.000Z",
      },
    ]);
    expect(eqT).toHaveBeenCalledWith("task_id", taskId);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("listSteps throws on a real error", async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { code: "500" } });
    const eqT = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqT }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listSteps("user-1", "33333333-3333-4333-8333-333333333333")).rejects.toMatchObject(
      { code: "500" },
    );
  });

  it("returns no steps for a malformed task id without calling supabase", async () => {
    // The task detail route feeds taskId straight from the URL; a malformed id would
    // 400 on PostgREST's uuid cast, so it must short-circuit to the zero-rows result.
    const from = jest.fn();
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(listSteps("user-1", "does-not-exist")).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("bulk-inserts trimmed steps with null estimate fallback", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await saveSteps("user-1", "t-1", [
      { description: "  outline  ", estimatedMinutes: 10 },
      { description: "draft", estimatedMinutes: null },
    ]);
    expect(insert).toHaveBeenCalledWith([
      { task_id: "t-1", user_id: "user-1", description: "outline", estimated_minutes: 10 },
      { task_id: "t-1", user_id: "user-1", description: "draft", estimated_minutes: null },
    ]);
  });

  it("saveSteps throws on a real error", async () => {
    const insert = jest.fn().mockResolvedValue({ error: { code: "23503" } });
    const from = jest.fn(() => ({ insert }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(
      saveSteps("user-1", "t-1", [{ description: "x", estimatedMinutes: 5 }]),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("toggleStepComplete sets or clears completed_at", async () => {
    const eqIdT = jest.fn().mockResolvedValue({ error: null });
    const eqUserT = jest.fn(() => ({ eq: eqIdT }));
    const updateT = jest.fn(() => ({ eq: eqUserT }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update: updateT })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await toggleStepComplete("user-1", "s-1", true);
    const trueCalls = updateT.mock.calls as unknown as [{ completed_at: string | null }][];
    expect(typeof trueCalls[0][0].completed_at).toBe("string");

    const eqIdF = jest.fn().mockResolvedValue({ error: null });
    const eqUserF = jest.fn(() => ({ eq: eqIdF }));
    const updateF = jest.fn(() => ({ eq: eqUserF }));
    mockRequireSupabase.mockReturnValue({
      from: jest.fn(() => ({ update: updateF })),
    } as unknown as ReturnType<typeof requireSupabase>);
    await toggleStepComplete("user-1", "s-1", false);
    expect(updateF).toHaveBeenCalledWith({ completed_at: null });
  });

  it("toggleStepComplete throws on a real error", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: { code: "500" } });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(toggleStepComplete("user-1", "s-1", true)).rejects.toMatchObject({ code: "500" });
  });
});
