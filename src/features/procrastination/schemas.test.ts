import {
  procrastinationTaskFormSchema,
  taskStepSchema,
} from "@/src/features/procrastination/schemas";

describe("taskStepSchema", () => {
  it("accepts a valid step", () => {
    expect(taskStepSchema.safeParse({ description: "Outline", estimatedMinutes: 10 }).success).toBe(
      true,
    );
  });

  it("rejects a short description", () => {
    expect(taskStepSchema.safeParse({ description: "ab", estimatedMinutes: 10 }).success).toBe(
      false,
    );
  });

  it("accepts a null estimate but rejects negative numbers", () => {
    expect(
      taskStepSchema.safeParse({ description: "outline", estimatedMinutes: null }).success,
    ).toBe(true);
    expect(taskStepSchema.safeParse({ description: "outline", estimatedMinutes: -1 }).success).toBe(
      false,
    );
  });
});

describe("procrastinationTaskFormSchema", () => {
  const base = {
    taskDescription: "Write report",
    avoidanceReason: "",
    fearThought: "",
    challengedThought: "",
    deadline: null,
    reward: "",
    steps: [{ description: "outline", estimatedMinutes: null }],
  };

  it("accepts a valid task", () => {
    expect(procrastinationTaskFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a short task description", () => {
    expect(
      procrastinationTaskFormSchema.safeParse({ ...base, taskDescription: "ab" }).success,
    ).toBe(false);
  });

  it("rejects an empty steps array", () => {
    expect(procrastinationTaskFormSchema.safeParse({ ...base, steps: [] }).success).toBe(false);
  });
});
