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
    border: "#DCD9E2", // --border 260 14% 87%
    mutedBg: "#F2F0F4", // --muted 260 14% 95%
  },
  dark: {
    bg: "#15121C", // --background 260 20% 9%
    card: "#27222F", // --card 260 16% 16%
    fg: "#F4F2F8", // --foreground 260 30% 96%
    muted: "#B4AFC0", // --muted-foreground 260 12% 72%
    chip: "#37343D", // --secondary 260 8% 22%
    accent: "#AD84EB", // --primary 264 72% 72%
    border: "#3B3645", // --border 260 12% 24%
    mutedBg: "#2C2833", // --muted 260 12% 18%
  },
} as const;

export type TintName = "primary" | "act" | "be" | "aqua" | "think" | "iris" | "ink" | "clay";

/** In-app card tint colors (global.css HSL → hex). Chip backgrounds use withAlpha(tint, 0.1). */
export const TINTS: Record<Theme, Record<TintName, string>> = {
  light: {
    primary: "#7C49D4", // 262 62% 56%
    act: "#348D70", // 160 46% 38%
    be: "#BB3578", // 330 56% 47%
    aqua: "#2C728C", // 196 52% 36%
    think: "#DFAC2A", // 43 74% 52%
    iris: "#A968CA", // 280 48% 60%
    ink: "#5462C0", // 232 46% 54%
    clay: "#C2693D", // 20 52% 50%
  },
  dark: {
    primary: "#AD84EB", // 264 72% 72%
    act: "#4CCDA2", // 160 56% 55%
    be: "#E48BB8", // 330 62% 72%
    aqua: "#66B8D6", // 196 58% 62%
    think: "#F2C759", // 43 86% 65%
    iris: "#CA96E3", // 280 58% 74%
    ink: "#909AE0", // 232 56% 72%
    clay: "#DC9774", // 20 60% 66%
  },
};

/** Apply opacity (0..1) to a #RRGGBB hex, returning #RRGGBBAA (alpha LAST, as the
 *  widget library / React Native expect - alpha-first reads as the wrong color). */
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
