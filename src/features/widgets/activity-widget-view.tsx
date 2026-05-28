// See mood-checkin-widget-view.tsx for why this directive is required.
"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";

type Theme = "light" | "dark";

const PALETTE = {
  light: { bg: "#FCFCFD", chip: "#FFF1E5", chipFg: "#221D2A" },
  dark: { bg: "#27222F", chip: "#3F2F1F", chipFg: "#F4F2F8" },
} as const;

// Mirrors src/constants/life-domains.ts lifeDomains.
// English labels for now (headless task has no i18n context); the new-activity screen accepts
// ?domain=X and pre-fills a value-linked note prompt in the user's app language.
const ACTIVITY_DOMAINS = [
  { domain: "work", emoji: "💼", label: "Work" },
  { domain: "relationships", emoji: "🤝", label: "Relations" },
  { domain: "health", emoji: "💪", label: "Health" },
  { domain: "leisure", emoji: "🎨", label: "Leisure" },
  { domain: "personalGrowth", emoji: "🌱", label: "Growth" },
  { domain: "other", emoji: "✨", label: "Other" },
] as const;

export function ActivityWidgetView({ theme }: { theme: Theme }) {
  const c = PALETTE[theme];
  const rows = [ACTIVITY_DOMAINS.slice(0, 3), ACTIVITY_DOMAINS.slice(3, 6)];

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
              key={option.domain}
              clickAction="OPEN_ACTIVITY"
              clickActionData={{ domain: option.domain }}
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

export function renderActivityWidget() {
  return {
    light: <ActivityWidgetView theme="light" />,
    dark: <ActivityWidgetView theme="dark" />,
  };
}
