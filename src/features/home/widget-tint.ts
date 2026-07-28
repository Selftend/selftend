export type WidgetTint =
  "primary" | "act" | "be" | "aqua" | "mist" | "iris" | "ink" | "clay" | "think" | "destructive";

interface TintClasses {
  chip: string;
  /** The published accent — icons and decorative marks. Not legible as small text. */
  icon: string;
  /**
   * The same tint as small-text ink (#403). Six of this map's seven consumer
   * sites paint an `<Icon>` and keep `icon`; only WidgetCardHeader's module
   * label is text, and it sits inside `chip` — so the ink it needs is measured
   * against `bg-<tint>/10` of its own hue, not the bare app surface.
   *
   * On that stack every hue fails AA, which is why passing hues take ink too:
   * `ink` 4.28, `aqua` 4.27, `be` 4.22, down to `think` at 1.76.
   *
   * `primary` and `destructive` keep their accent — neither has an `-ink`
   * token and neither is a `text-<hue>` site. Both are near misses on their
   * own /10 tint (4.39 and 4.03) and belong to a separate ticket.
   */
  ink: string;
}

const TINT_CLASSES: Record<WidgetTint, TintClasses> = {
  primary: { chip: "bg-primary/10", icon: "text-primary", ink: "text-primary" },
  act: { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },
  be: { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },
  aqua: { chip: "bg-aqua/10", icon: "text-aqua", ink: "text-aqua-ink" },
  mist: { chip: "bg-mist/10", icon: "text-mist", ink: "text-mist-ink" },
  iris: { chip: "bg-iris/10", icon: "text-iris", ink: "text-iris-ink" },
  ink: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },
  clay: { chip: "bg-clay/10", icon: "text-clay", ink: "text-clay-ink" },
  think: { chip: "bg-think/10", icon: "text-think", ink: "text-think-ink" },
  destructive: {
    chip: "bg-destructive/10",
    icon: "text-destructive",
    ink: "text-destructive",
  },
};

export function tintClasses(tint: WidgetTint): TintClasses {
  return TINT_CLASSES[tint];
}
