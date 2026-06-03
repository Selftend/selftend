// Single source of truth for per-tool accent colours. Each tool/module maps to a
// calm hue from the shared token palette (think/act/be + aqua/mist/iris/ink/clay).
// Class strings are written out in full so NativeWind's compiler can see them.

interface ToolAccent {
  chip: string;
  icon: string;
}

const TOOL_ACCENT: Record<string, ToolAccent> = {
  "module-cbt": { chip: "bg-primary/10", icon: "text-primary" },
  "module-act": { chip: "bg-act/10", icon: "text-act" },
  mood: { chip: "bg-be/10", icon: "text-be" },
  "self-care": { chip: "bg-be/10", icon: "text-be" },
  gratitude: { chip: "bg-think/10", icon: "text-think" },
  habits: { chip: "bg-act/10", icon: "text-act" },
  breathing: { chip: "bg-aqua/10", icon: "text-aqua" },
  meditation: { chip: "bg-iris/10", icon: "text-iris" },
  journal: { chip: "bg-ink/10", icon: "text-ink" },
  sleep: { chip: "bg-ink/10", icon: "text-ink" },
  grounding: { chip: "bg-clay/10", icon: "text-clay" },
};

const DEFAULT_TOOL_ACCENT: ToolAccent = {
  chip: "bg-primary/10",
  icon: "text-primary",
};

export function toolAccent(toolId: string): ToolAccent {
  return TOOL_ACCENT[toolId] ?? DEFAULT_TOOL_ACCENT;
}
