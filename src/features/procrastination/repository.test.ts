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

  it("returns null when getTask finds nothing", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqId = jest.fn(() => ({ maybeSingle }));
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const select = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ select }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await expect(getTask("user-1", "missing")).resolves.toBeNull();
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

  it("updateTaskStatus updates just status", async () => {
    const eqId = jest.fn().mockResolvedValue({ error: null });
    const eqUser = jest.fn(() => ({ eq: eqId }));
    const update = jest.fn(() => ({ eq: eqUser }));
    const from = jest.fn(() => ({ update }));
    mockRequireSupabase.mockReturnValue({ from } as unknown as ReturnType<typeof requireSupabase>);

    await updateTaskStatus("user-1", "t-1", "completed");
    expect(update).toHaveBeenCalledWith({ status: "completed" });
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

    await listSteps("user-1", "t-1");
    expect(eqT).toHaveBeenCalledWith("task_id", "t-1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
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
});
