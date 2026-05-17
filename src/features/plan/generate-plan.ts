import type { CarePlanItemInput } from "@/src/features/plan/types";

export type PlanConcern =
  | "anxiety"
  | "stress"
  | "low_mood"
  | "sleep"
  | "negative_thoughts"
  | "self_compassion"
  | "emotional_regulation";

export type PlanTool =
  | "mood"
  | "cbt"
  | "breathing"
  | "meditation"
  | "gratitude"
  | "journal"
  | "habits";

export type PlanRoutine = "light" | "standard" | "custom";

interface ToolDef {
  toolId: PlanTool;
  title: string;
  route: string;
  frequency: CarePlanItemInput["frequency"];
}

export const TOOL_DEFS: Record<PlanTool, ToolDef> = {
  mood: {
    toolId: "mood",
    title: "Mood check-in",
    route: "/tools/mood-tracker/new",
    frequency: "daily",
  },
  cbt: {
    toolId: "cbt",
    title: "CBT thought record",
    route: "/modules/cbt/new",
    frequency: "as_needed",
  },
  breathing: {
    toolId: "breathing",
    title: "Breathing exercise",
    route: "/tools/breathing",
    frequency: "daily",
  },
  meditation: {
    toolId: "meditation",
    title: "Meditation session",
    route: "/tools/meditation",
    frequency: "daily",
  },
  gratitude: {
    toolId: "gratitude",
    title: "Gratitude log",
    route: "/tools/gratitude-log/new",
    frequency: "daily",
  },
  journal: {
    toolId: "journal",
    title: "Journal entry",
    route: "/tools/journal/new",
    frequency: "daily",
  },
  habits: {
    toolId: "habits",
    title: "Habit / activity",
    route: "/modules/cbt/activities",
    frequency: "weekly",
  },
};

const ROUTINE_CAPS: Record<PlanRoutine, number> = {
  light: 3,
  standard: 5,
  custom: Infinity,
};

export function generatePlan(
  concerns: PlanConcern[],
  selectedTools: PlanTool[],
  routine: PlanRoutine,
): CarePlanItemInput[] {
  const cap = ROUTINE_CAPS[routine];

  // Determine tool priority based on concerns
  const priorityOrder: PlanTool[] = ["mood"];

  if (concerns.includes("anxiety") || concerns.includes("stress")) {
    priorityOrder.push("breathing", "meditation");
  }
  if (concerns.includes("low_mood") || concerns.includes("self_compassion")) {
    priorityOrder.push("gratitude", "journal");
  }
  if (concerns.includes("negative_thoughts")) {
    priorityOrder.push("cbt");
  }
  if (concerns.includes("emotional_regulation")) {
    priorityOrder.push("breathing", "meditation", "journal");
  }
  if (concerns.includes("sleep")) {
    priorityOrder.push("meditation", "journal");
  }
  priorityOrder.push("habits");

  // Merge priority with user's explicit tool selections
  const orderedTools: PlanTool[] = [];
  for (const tool of priorityOrder) {
    if (selectedTools.includes(tool) && !orderedTools.includes(tool)) {
      orderedTools.push(tool);
    }
  }
  // Append any user-selected tools not already in the priority list
  for (const tool of selectedTools) {
    if (!orderedTools.includes(tool)) {
      orderedTools.push(tool);
    }
  }

  const sliced = orderedTools.slice(0, cap);

  return sliced.map((toolId, index) => {
    const def = TOOL_DEFS[toolId];
    return {
      title: def.title,
      toolId: def.toolId,
      route: def.route,
      frequency: def.frequency,
      reminderEnabled: false,
      order: index,
      active: true,
    };
  });
}
