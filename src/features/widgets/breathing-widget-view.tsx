// See mood-checkin-widget-view.tsx for why this directive is required.
"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";

type Theme = "light" | "dark";

const PALETTE = {
  light: { bg: "#FCFCFD", chip: "#EEEAF4", chipFg: "#221D2A" },
  dark: { bg: "#27222F", chip: "#3A3344", chipFg: "#F4F2F8" },
} as const;

// Mirrors src/constants/breathing.ts breathingPatterns slugs.
// Labels are English-only for now (headless task has no i18n context); the slugs match the
// app's /tools/breathing/[slug] route and the screen renders its own localized title.
const BREATHING_OPTIONS = [
  { slug: "box-breathing", label: "Box" },
  { slug: "4-7-8", label: "4-7-8" },
  { slug: "coherent-breathing", label: "Coherent" },
] as const;

export function BreathingWidgetView({ theme }: { theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      {BREATHING_OPTIONS.map((option) => (
        <FlexWidget
          key={option.slug}
          clickAction="OPEN_BREATHING"
          clickActionData={{ slug: option.slug }}
          style={{
            flex: 1,
            marginHorizontal: 4,
            paddingVertical: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: c.chip,
            borderRadius: 14,
          }}
        >
          <TextWidget
            text={option.label}
            style={{ fontSize: 14, fontWeight: "600", color: c.chipFg }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function renderBreathingWidget() {
  return {
    light: <BreathingWidgetView theme="light" />,
    dark: <BreathingWidgetView theme="dark" />,
  };
}
