// See mood-checkin-widget-view.tsx for why this directive is required.
"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";

type Theme = "light" | "dark";

const PALETTE = {
  light: { bg: "#FCFCFD", chip: "#E5F0EE", chipFg: "#221D2A" },
  dark: { bg: "#27222F", chip: "#2F3A3A", chipFg: "#F4F2F8" },
} as const;

// Mirrors src/constants/grounding.ts groundingTechniques slugs.
// Labels are English-only for now (headless task has no i18n context); the slugs match the
// app's /tools/grounding/[slug] route and the screen renders its own localized title.
const GROUNDING_OPTIONS = [
  { slug: "54321", label: "5-4-3-2-1" },
  { slug: "cold-water", label: "Cold water" },
  { slug: "feet-floor", label: "Feet on floor" },
] as const;

function GroundingWidgetView({ theme }: { theme: Theme }) {
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
      {GROUNDING_OPTIONS.map((option) => (
        <FlexWidget
          key={option.slug}
          clickAction="OPEN_GROUNDING"
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
            style={{ fontSize: 13, fontWeight: "600", color: c.chipFg }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function renderGroundingWidget() {
  return {
    light: <GroundingWidgetView theme="light" />,
    dark: <GroundingWidgetView theme="dark" />,
  };
}
