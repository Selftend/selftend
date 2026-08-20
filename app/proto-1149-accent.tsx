// PROTOTYPE — throwaway, never merged to main. Answers #1149: does the settled
// #1145 accent treatment actually READ, in every style and both schemes?
//
// Public route (outside `(app)`) so it needs no sign-in. Renders variant C —
// the settled treatment — once per style, twice per style in fact: over the
// page background, and over another Card. The second is the common case (104
// files in this repo render `<Card`) and it is the one with no separation at
// all once `border-0` and `dark:shadow-none` are both in play.
//
// ☠️ Why this route renders ONE scheme per page load, unlike #1145's.
// tailwind.config.js sets `darkMode: "class"`, so NativeWind's `dark:` variant
// follows a `dark` class on an ancestor — NOT the `vars()` object. #1145 applied
// both schemes' vars on one page and therefore painted the LIGHT shadow under
// its dark column, overstating the very variant it chose. One page load per
// scheme is what lets the class be right, and is the whole reason this file
// exists rather than extending the #1145 route.
//
// ☠️ And the class is NOT ours to set. Hand-adding `dark` to documentElement in
// an init script does not survive hydration — NativeWind owns that classList and
// strips whatever its own state disagrees with. Measured on the first run here:
// the class was gone, and the dark column reported the light shadow, reproducing
// #1145's defect exactly. The capture drives `prefers-color-scheme` instead, so
// the app's own useColorSchemeDriver sets the class, and then ASSERTS the class
// is present before it reads a single colour.
//
// Copy is hardcoded English on purpose — a prototype route ships no i18n keys.

import { Pressable, ScrollView, View } from "react-native";

import { Card, CardDescription, CardTitle } from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import type { ColorScheme } from "@/src/lib/theme/contract";
import { STYLE_NAMES, type StyleName } from "@/src/lib/theme/styles";
import { THEME_VARIABLES } from "@/lib/theme";

declare global {
  var __PROTO_SCHEME__: string | undefined;
}

// Module scope, read once after the capture's addInitScript has run and before
// React renders. Not a hook: nothing here re-renders, and a clock-free constant
// keeps the React Compiler purity rule happy.
const SCHEME: ColorScheme = globalThis.__PROTO_SCHEME__ === "dark" ? "dark" : "light";

type Tone = "success" | "error";

// The settled #1145 tone table, verbatim. Every value is a token CLASS NAME,
// never a resolved colour — that is what makes it safe at module scope.
const TONE: Record<Tone, { bar: string; ink: string; icon: MaterialIconName }> = {
  success: { bar: "bg-primary", ink: "text-primary-ink", icon: "check-circle" },
  error: { bar: "bg-destructive", ink: "text-destructive", icon: "error" },
};

const COPY: Record<Tone, { title: string; description: string }> = {
  success: { title: "Saved", description: "Gratitude entry" },
  error: { title: "Something did not save", description: "Notifications are blocked." },
};

/** Variant C, exactly as #1145 locked it. */
function ToastC({
  tone,
  withDescription,
  probe,
}: {
  tone: Tone;
  withDescription: boolean;
  probe: string;
}) {
  const t = TONE[tone];
  return (
    <Card
      testID={`${probe}-card`}
      className="gap-0 border-0 py-4 pl-3 pr-2 shadow-md dark:shadow-none"
    >
      <View
        testID={`${probe}-bar`}
        className={`absolute bottom-3 left-3 top-3 w-1 rounded-full ${t.bar}`}
      />
      <View className="flex-row items-center gap-3 pl-4">
        <Icon testID={`${probe}-icon`} name={t.icon} className={`size-5 ${t.ink}`} />
        <View className="flex-1 gap-1">
          <CardTitle testID={`${probe}-title`}>{COPY[tone].title}</CardTitle>
          {withDescription ? <CardDescription>{COPY[tone].description}</CardDescription> : null}
        </View>
        <Pressable
          accessibilityLabel="Dismiss"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          className="size-9 items-center justify-center rounded-full"
          role="button"
        >
          <Icon testID={`${probe}-x`} name="close" className="size-5 text-muted-foreground" />
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * One style's block. The toast is rendered twice: over the page background, and
 * over a Card — the two surfaces it can land on when it is bottom-anchored.
 */
function StyleBlock({ style }: { style: StyleName }) {
  return (
    <View style={THEME_VARIABLES[style][SCHEME]} className="bg-background gap-3 p-4">
      <Text className="text-foreground text-xs font-semibold">
        {style} / {SCHEME}
      </Text>

      <Text className="text-muted-foreground text-xs">over the page background</Text>
      <View testID={`${style}-onbg-under`} className="bg-background gap-2 p-2">
        <ToastC tone="success" withDescription={false} probe={`${style}-onbg-success`} />
        <ToastC tone="error" withDescription probe={`${style}-onbg-error`} />
      </View>

      <Text className="text-muted-foreground text-xs">over another card</Text>
      <View testID={`${style}-oncard-under`} className="bg-card gap-2 p-2">
        <ToastC tone="success" withDescription={false} probe={`${style}-oncard-success`} />
        <ToastC tone="error" withDescription probe={`${style}-oncard-error`} />
      </View>
    </View>
  );
}

export default function Proto1149() {
  return (
    <ScrollView testID="proto-1149">
      {STYLE_NAMES.map((style) => (
        <StyleBlock key={style} style={style} />
      ))}
    </ScrollView>
  );
}
