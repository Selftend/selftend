// Single source of truth for per-tool accent colours. Each tool/module maps to a
// calm hue from the shared token palette (think/act/be + aqua/mist/iris/ink/clay).
// Class strings are written out in full so NativeWind's compiler can see them.

interface ToolAccent {
  chip: string;
  /**
   * The published accent — icons, borders, decorative marks. Not legible as
   * small text.
   *
   * This map's one consumer (src/components/app/sidebar-nav.tsx) swaps the nav
   * glyph between this and `text-muted-foreground` with the row's active state,
   * so the glyph is a state indicator and owes WCAG 1.4.11's 3:1 — it cannot
   * fall back on the decorative exemption the way a purely ornamental glyph
   * can. The surface is `chip` (`bg-<hue>/10`) over the sidebar's `bg-card`,
   * where light mode binds: `ink` 4.62, `aqua` 4.61, `be` 4.55, `act` 3.52,
   * `clay` 3.39, `iris` 3.32 — and `think` 1.90, which is why `gratitude`
   * carries ink in both fields. Measured in test/accent-ink-call-sites.test.ts
   * (#412).
   */
  icon: string;
  /**
   * The same hue as small-text ink (#403). Split out from `icon` because this
   * map's one consumer paints both: the sidebar's icon (decorative, keeps
   * `icon`) and its nav label (14px text, takes `ink`).
   *
   * Every entry uses ink, passing hues included, because the label is only
   * tinted while the row is active — and an active row also paints `chip`, so
   * the text lands on `bg-<hue>/10` of its own hue. On that stack all eight
   * hues fail AA: the best is `ink` at 4.28:1, and `be`/`aqua`, which clear
   * 4.86 on the bare app background, drop to 4.22 and 4.27.
   *
   * `primary` keeps `text-primary`: there is no `--primary-ink`, and it is not
   * a `text-<hue>` site. It measures 4.39:1 on `bg-primary/10` — a near miss
   * that is out of #403's scope but worth its own ticket.
   */
  ink: string;
}

const TOOL_ACCENT: Record<string, ToolAccent> = {
  "module-cbt": { chip: "bg-primary/10", icon: "text-primary", ink: "text-primary" },
  "module-act": { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },
  mood: { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },
  "self-care": { chip: "bg-be/10", icon: "text-be", ink: "text-be-ink" },
  // `icon` is ink, not the accent (#412): `text-think` on `bg-think/10` over
  // the sidebar's card measures 1.90:1, well under 1.4.11's 3:1, and the
  // sidebar glyph carries active state so the decorative exemption is not
  // available to it. `think` is the only hue in this map that fails.
  gratitude: { chip: "bg-think/10", icon: "text-think-ink", ink: "text-think-ink" },
  habits: { chip: "bg-act/10", icon: "text-act", ink: "text-act-ink" },
  breathing: { chip: "bg-aqua/10", icon: "text-aqua", ink: "text-aqua-ink" },
  meditation: { chip: "bg-iris/10", icon: "text-iris", ink: "text-iris-ink" },
  journal: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },
  sleep: { chip: "bg-ink/10", icon: "text-ink", ink: "text-ink-ink" },
  grounding: { chip: "bg-clay/10", icon: "text-clay", ink: "text-clay-ink" },
};

const DEFAULT_TOOL_ACCENT: ToolAccent = {
  chip: "bg-primary/10",
  icon: "text-primary",
  ink: "text-primary",
};

export function toolAccent(toolId: string): ToolAccent {
  return TOOL_ACCENT[toolId] ?? DEFAULT_TOOL_ACCENT;
}
