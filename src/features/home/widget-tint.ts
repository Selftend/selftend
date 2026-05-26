export type WidgetTint =
  | "primary"
  | "act"
  | "be"
  | "aqua"
  | "mist"
  | "iris"
  | "ink"
  | "clay"
  | "think"
  | "destructive";

export interface TintClasses {
  chip: string;
  icon: string;
}

const TINT_CLASSES: Record<WidgetTint, TintClasses> = {
  primary: { chip: "bg-primary/10", icon: "text-primary" },
  act: { chip: "bg-act/10", icon: "text-act" },
  be: { chip: "bg-be/10", icon: "text-be" },
  aqua: { chip: "bg-aqua/10", icon: "text-aqua" },
  mist: { chip: "bg-mist/10", icon: "text-mist" },
  iris: { chip: "bg-iris/10", icon: "text-iris" },
  ink: { chip: "bg-ink/10", icon: "text-ink" },
  clay: { chip: "bg-clay/10", icon: "text-clay" },
  think: { chip: "bg-think/10", icon: "text-think" },
  destructive: { chip: "bg-destructive/10", icon: "text-destructive" },
};

export function tintClasses(tint: WidgetTint): TintClasses {
  return TINT_CLASSES[tint];
}
