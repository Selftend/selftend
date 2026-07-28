export type WidgetTint =
  "primary" | "act" | "be" | "aqua" | "mist" | "iris" | "ink" | "clay" | "think" | "destructive";

interface TintClasses {
  chip: string;
  /**
   * The published accent — icons and decorative marks. Not legible as small
   * text.
   *
   * Every consumer of *this* field paints the same thing: a module identity
   * glyph inside a `chip`, immediately beside that module's own name in text.
   * (The two sites where the tint is the colour of text take `ink` instead -
   * WidgetCardHeader's module label and add-widget-modal's add button.) None of
   * them lets the tint carry state or information, and `<Icon>` is
   * `aria-hidden`, so
   * these are decorative graphics under WCAG 1.4.11 rather than graphics
   * "required to understand the content". That is what the row below rests on —
   * not the ratio, which varies a lot by consumer. Measured light-mode figures,
   * accent on `bg-<tint>/10` (#412):
   *
   *   widget-card-header / add-to-home / modal category header  3.33 – 4.62
   *   widget-config-screen, unselected row                      3.08 – 4.28
   *   widget-config-screen, selected row (chip on `bg-primary/10`)  2.72 – 3.77
   *   add-widget-modal PreviewBlock (chip nested in chip)       2.79 – 3.80
   *
   * So `mist`, `iris`, `act` and `clay` do drop under 3:1 on the last two
   * surfaces. They stay because nothing is lost when the glyph is not seen, not
   * because they clear a floor. **A consumer that makes this tint carry state
   * or meaning invalidates the whole row** and has to re-measure against 3:1.
   *
   * `think` was swept to ink regardless: at 1.90 falling to 1.56 it is not
   * legible as a mark at all, decorative or otherwise.
   */
  icon: string;
  /**
   * The same tint as small-text ink (#403). Five of this map's seven consumer
   * sites paint an `<Icon>` and keep `icon`; the two that are text take this -
   * WidgetCardHeader's module label and the add-widget modal's add button. Both
   * sit inside `chip`, so the ink they need is measured against `bg-<tint>/10`
   * of their own hue, not the bare app surface.
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
  // `icon` is ink, not the accent (#412). The `gratitude-latest` widget ships on
  // this tint by default, so its header glyph was a 1.90:1 mark on `bg-think/10`
  // over the card, dropping to 1.56 on the config screen's selected row. The
  // decorative exemption would technically permit it; a glyph nobody can make
  // out is still a defect, so this row takes the ink both consumers can see.
  think: { chip: "bg-think/10", icon: "text-think-ink", ink: "text-think-ink" },
  destructive: {
    chip: "bg-destructive/10",
    icon: "text-destructive",
    ink: "text-destructive",
  },
};

export function tintClasses(tint: WidgetTint): TintClasses {
  return TINT_CLASSES[tint];
}
