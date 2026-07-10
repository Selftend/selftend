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

describe("validation messages are i18n keys", () => {
  it("emits keys for a missing task description, empty step, and empty step list", () => {
    const result = procrastinationTaskFormSchema.safeParse({
      taskDescription: "",
      avoidanceReason: "",
      fearThought: "",
      challengedThought: "",
      deadline: null,
      reward: "",
      steps: [{ description: "", estimatedMinutes: null }],
    });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain("tasks.validation.taskDescription");
    expect(messages).toContain("tasks.validation.stepDescription");

    const noSteps = procrastinationTaskFormSchema.safeParse({
      taskDescription: "A real task",
      avoidanceReason: "",
      fearThought: "",
      challengedThought: "",
      deadline: null,
      reward: "",
      steps: [],
    });
    expect(noSteps.success).toBe(false);
    expect(noSteps.error!.issues.map((issue) => issue.message)).toContain("tasks.validation.steps");
  });
});
