import { angerLogFormSchema } from "@/src/features/anger/schemas";
import { coreBeliefFormSchema } from "@/src/features/beliefs/schemas";
import {
  exposureHierarchyFormSchema,
  exposureSessionFormSchema,
} from "@/src/features/exposure/schemas";
import { procrastinationTaskFormSchema } from "@/src/features/procrastination/schemas";
import { challengePlanFormSchema, recoveryPlanFormSchema } from "@/src/features/recovery/schemas";
import { worryEntryFormSchema } from "@/src/features/worry/schemas";

describe("newer CBT strategy schemas", () => {
  it("keeps core belief strength ratings inside the 0-100 range", () => {
    const parsed = coreBeliefFormSchema.safeParse({
      alternativeBelief: "I can handle this with support.",
      alternativeBeliefStrength: 40,
      beliefStatement: "I am not capable.",
      evidenceAgainst: ["I have handled similar things."],
      evidenceFor: ["This feels hard."],
      nextReviewDate: null,
      originalBeliefStrength: 101,
      reinforcementPlan: "",
      triggeringSituations: ["Work deadline"],
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one exposure step and valid SUDS ratings", () => {
    const parsed = exposureHierarchyFormSchema.safeParse({
      anxietyType: "social",
      items: [{ description: "Say hello to a neighbor", sudsRating: 40 }],
      title: "Social practice",
    });

    expect(parsed.success).toBe(true);
    expect(
      exposureSessionFormSchema.safeParse({
        durationMinutes: 10,
        notes: "",
        postSuds: 20,
        preSuds: 120,
        safetyBehaviorDescription: "",
        safetyBehaviorsUsed: false,
      }).success,
    ).toBe(false);
  });

  it("distinguishes hypothetical worries from real-problem worries", () => {
    expect(
      worryEntryFormSchema.safeParse({
        actionSteps: [],
        copingStatement: "I can let this be uncertain.",
        evidenceAgainst: [],
        evidenceFor: [],
        probabilityEstimate: null,
        worryCategory: "hypothetical",
        worryStatement: "What if something goes wrong?",
      }).success,
    ).toBe(true);

    expect(
      worryEntryFormSchema.safeParse({
        actionSteps: [],
        copingStatement: "",
        evidenceAgainst: [],
        evidenceFor: [],
        probabilityEstimate: 60,
        worryCategory: "real_problem",
        worryStatement: "I need to reply to this bill.",
      }).success,
    ).toBe(false);
  });

  it("requires actionable procrastination steps", () => {
    const parsed = procrastinationTaskFormSchema.safeParse({
      avoidanceReason: "",
      challengedThought: "",
      deadline: null,
      fearThought: "",
      reward: "",
      steps: [{ description: "Open the document", estimatedMinutes: 10 }],
      taskDescription: "Prepare the form",
    });

    expect(parsed.success).toBe(true);
  });

  it("keeps anger ratings inside the 1-10 range", () => {
    const parsed = angerLogFormSchema.safeParse({
      alternativeInterpretation: "",
      arousalLevel: 0,
      behaviorChosen: "",
      consequence: "",
      interpretation: "",
      notes: "",
      outcomeRating: null,
      timeOutTaken: false,
      triggerText: "A sharp comment",
      urge: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts recovery notes and requires usable challenge plans", () => {
    expect(
      recoveryPlanFormSchema.safeParse({
        maintenanceCommitments: ["Weekly review"],
        personalSlogan: "Notice, choose, begin again.",
        recoveryKeys: ["Walk before deciding"],
        strategyIntegrationNotes: {
          thoughts: "Thought records help me slow down.",
        },
      }).success,
    ).toBe(true);

    expect(
      challengePlanFormSchema.safeParse({
        challengeDescription: "Stressful week",
        copingSteps: [],
      }).success,
    ).toBe(false);
  });
});
