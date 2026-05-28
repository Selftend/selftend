// The React Compiler (experiments.reactCompiler: true) transforms components in ways that
// react-native-android-widget's JSX-to-RemoteViews pipeline mistakes for "Invalid Hook Call".
// Opt the entire widget view file out of the compiler — these are not real React components.
"use no memo";

import { FlexWidget, TextWidget } from "react-native-android-widget";

type Theme = "light" | "dark";

const PALETTE = {
  light: { bg: "#FCFCFD" },
  dark: { bg: "#27222F" },
} as const;

// Mirrors src/components/app/mood-scale.tsx STEPS.
const MOOD_STEPS = [
  { score: 1, emoji: "😭" },
  { score: 2, emoji: "🙁" },
  { score: 3, emoji: "😐" },
  { score: 4, emoji: "😊" },
  { score: 5, emoji: "😁" },
] as const;

export function MoodCheckinWidgetView({ theme }: { theme: Theme }) {
  const c = PALETTE[theme];
  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: c.bg,
        borderRadius: 20,
      }}
    >
      {MOOD_STEPS.map((step) => (
        <TextWidget
          key={step.score}
          text={step.emoji}
          clickAction="OPEN_MOOD"
          clickActionData={{ score: step.score }}
          style={{ fontSize: 30, paddingHorizontal: 6, paddingVertical: 6 }}
        />
      ))}
    </FlexWidget>
  );
}

// Returns both theme variants so the native layer renders the one matching the system theme.
export function renderMoodCheckinWidget() {
  return {
    light: <MoodCheckinWidgetView theme="light" />,
    dark: <MoodCheckinWidgetView theme="dark" />,
  };
}
