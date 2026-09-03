import { render, screen } from "@testing-library/react-native";

import { SettingsGroupLabel } from "@/src/features/settings/components/settings-group-label";

/**
 * The one definition of the settings group eyebrow (#1828). `SettingsRun` and
 * the appearance group both render through it, so the audit's D7 scale is one
 * edit here rather than a sweep with a site that has to be left alone.
 */
describe("SettingsGroupLabel", () => {
  it("names the group as a heading, so a screen reader can jump to it", () => {
    render(<SettingsGroupLabel>Appearance</SettingsGroupLabel>);

    expect(screen.getByRole("header", { name: "Appearance" })).toBeTruthy();
  });

  /**
   * ☠️ The level is load-bearing and cannot be left to the ARIA default. ARIA
   * says a level-less heading is 2; `react-native-web` never asks ARIA - with no
   * `aria-level` it swaps in a literal `<h1>`. Drop this prop and the five group
   * labels become five more `h1`s beside the hero's.
   */
  it("says level 2 out loud, because the default is h1 and not h2", () => {
    render(<SettingsGroupLabel>Appearance</SettingsGroupLabel>);

    expect(screen.getByText("Appearance").props["aria-level"]).toBe(2);
  });

  /**
   * D7: the design kit's `.eyebrow` is 11px/600/0.1em. `Text variant="eyebrow"`
   * is 11px / 700 / 0.14em - the page eyebrow's scale, and it stays that.
   */
  it("renders at the kit's eyebrow scale - 11px, 600, 0.1em - not the page eyebrow's", () => {
    render(<SettingsGroupLabel>Appearance</SettingsGroupLabel>);

    const classes = String(screen.getByText("Appearance").props.className ?? "")
      .split(/\s+/)
      .filter(Boolean);

    expect(classes).toContain("text-[11px]");
    expect(classes).toContain("font-semibold");
    expect(classes).toContain("tracking-[0.1em]");
    expect(classes).toContain("uppercase");
    expect(classes).toContain("text-muted-foreground");
    expect(classes).not.toContain("font-bold");
    expect(classes).not.toContain("tracking-[0.14em]");
  });

  /**
   * ☠️ Why the classes are spelled out instead of `variant="eyebrow"` plus an
   * override. `resolveFontFamily` reads the RAW class list, not the
   * tailwind-merge output, and tests `font-bold` before `font-semibold` - so an
   * eyebrow variant overridden to 600 would still load the 700 face. The
   * rendered weight would be right and the actual glyphs wrong.
   */
  it("loads the 600 face, not the 700 one", () => {
    render(<SettingsGroupLabel>Appearance</SettingsGroupLabel>);

    expect(screen.getByText("Appearance").props.style).toEqual(
      expect.arrayContaining([{ fontFamily: "NotoSans_600SemiBold" }]),
    );
  });

  it("takes an extra class without losing its own", () => {
    render(<SettingsGroupLabel className="px-1">App</SettingsGroupLabel>);

    const classes = String(screen.getByText("App").props.className ?? "")
      .split(/\s+/)
      .filter(Boolean);

    expect(classes).toContain("px-1");
    expect(classes).toContain("font-semibold");
  });
});
