export type Theme = "light" | "dark";

// The app's global.css design tokens (lavender/purple), resolved from HSL to hex.
export const PALETTE = {
  light: {
    bg: "#F4F2F8", // --background 260 28% 96%
    card: "#FCFCFD", // --card 260 28% 99%
    fg: "#221D2A", // --foreground 260 18% 14%
    muted: "#686374", // --muted-foreground 260 8% 42%
    chip: "#EAE9EC", // --secondary 260 8% 92%
    accent: "#7C49D4", // --primary 262 62% 56%
  },
  dark: {
    bg: "#15121C", // --background 260 20% 9%
    card: "#27222F", // --card 260 16% 16%
    fg: "#F4F2F8", // --foreground 260 30% 96%
    muted: "#B4AFC0", // --muted-foreground 260 12% 72%
    chip: "#37343D", // --secondary 260 8% 22%
    accent: "#AD84EB", // --primary 264 72% 72%
  },
} as const;

/** Apply opacity (0..1) to a #RRGGBB hex, returning #RRGGBBAA (alpha LAST, as the
 *  widget library / React Native expect — alpha-first reads as the wrong color). */
export function withAlpha(hex: string, opacity: number): `#${string}` {
  const clamped = Math.max(0, Math.min(1, opacity));
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex.replace("#", "")}${a}`;
}

/** Resolve which theme(s) to render given the per-widget pref + the app's theme pref. */
export function effectiveThemes(
  configTheme: "app" | "light" | "dark",
  appThemePref: "light" | "dark" | "system",
): ("light" | "dark")[] {
  if (configTheme === "light") return ["light"];
  if (configTheme === "dark") return ["dark"];
  if (appThemePref === "system") return ["light", "dark"];
  return [appThemePref];
}
