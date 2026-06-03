// See mood-checkin-widget-view.tsx for why this directive is required.
"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";

type Theme = "light" | "dark";

const PALETTE = {
  light: { bg: "#FCFCFD", chip: "#F0EDF6", chipFg: "#221D2A" },
  dark: { bg: "#27222F", chip: "#3A3344", chipFg: "#F4F2F8" },
} as const;

// Mirrors src/features/meditation/practices.ts MEDITATION_PRACTICES slugs (seated only).
// English labels for now (headless task has no i18n context); the in-app screen renders its
// own localized title once opened via /tools/meditation?practice=[slug].
const MINDFULNESS_OPTIONS = [
  { slug: "breath-awareness", emoji: "🌬️", label: "Breath" },
  { slug: "body-scan", emoji: "🧘", label: "Body scan" },
  { slug: "loving-kindness", emoji: "❤️", label: "Loving" },
  { slug: "observing-thoughts", emoji: "💭", label: "Thoughts" },
] as const;

function MindfulnessWidgetView({ theme }: { theme: Theme }) {
  const c = PALETTE[theme];
  const rows = [MINDFULNESS_OPTIONS.slice(0, 2), MINDFULNESS_OPTIONS.slice(2, 4)];

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        padding: 8,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      {rows.map((row, rowIdx) => (
        <FlexWidget
          key={rowIdx}
          style={{
            flex: 1,
            flexDirection: "row",
            marginVertical: 2,
          }}
        >
          {row.map((option) => (
            <FlexWidget
              key={option.slug}
              clickAction="OPEN_MINDFULNESS"
              clickActionData={{ slug: option.slug }}
              style={{
                flex: 1,
                marginHorizontal: 2,
                paddingVertical: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.chip,
                borderRadius: 14,
              }}
            >
              <TextWidget text={option.emoji} style={{ fontSize: 22 }} />
              <TextWidget
                text={option.label}
                style={{ fontSize: 11, fontWeight: "600", color: c.chipFg, marginTop: 2 }}
              />
            </FlexWidget>
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function renderMindfulnessWidget() {
  return {
    light: <MindfulnessWidgetView theme="light" />,
    dark: <MindfulnessWidgetView theme="dark" />,
  };
}
