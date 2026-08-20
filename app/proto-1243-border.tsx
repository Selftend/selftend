// PROTOTYPE — throwaway, never merged to main. Answers #1243: with the neutral
// border back (the #1238 ruling), does variant C still hold — and does the pill
// bar still earn its place beside it?
//
// #1238 locked the MECHANISM (the toast takes back `Card`'s default
// `border-border`, both schemes). This route cannot reopen that. What it renders
// is the TREATMENT, because #1145 rejected the border by eye and #1238 restored
// it by argument, and nobody has ever looked at the combination.
//
// Three columns, because two would not answer the ticket's sharp question:
//
//   A  border-0 + bar   — variant C exactly as #1145 locked it
//   B  border   + bar   — the #1238 ruling
//   C  border   + NO bar — #1149 found "the icon is doing nearly all of the
//                          work — not the bar", and #1145 kept the bar as a
//                          "quiet confirming mark" on a card that then had no
//                          other edge. With a real boundary restored, the bar
//                          may be the element now doing no work — the very
//                          charge #1145's decision 2 levelled at the border.
//                          Render the answer rather than asserting it.
//
// Each column is clamped to 358px — a 390pt phone minus the host's `px-4` — so
// the "does it read busy?" judgement happens at the width the toast actually
// ships at, not at whatever a desktop column gives it. (Jest's 750px default and
// Desktop Chrome are both blind to the phone face; this route is not.)
//
// ☠️ One scheme per page load, and the class is NOT ours to set. tailwind.config
// sets `darkMode: "class"`, so NativeWind's `dark:` variant follows a `dark`
// class on documentElement that NativeWind OWNS — hand-adding it does not
// survive hydration. #1145 applied both schemes' vars to one page and therefore
// painted the LIGHT shadow under its dark column, overstating the very variant
// it chose. The capture drives `prefers-color-scheme` so the app's own driver
// sets the class, then ASSERTS it before reading a colour. Inherited from
// app/proto-1149-accent.tsx, which paid for this lesson twice.
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

/** The three treatments under comparison. `bar` and `border` are the two axes. */
const VARIANTS = [
  { key: "A", label: "A — no border + bar (#1145)", bar: true, border: false },
  { key: "B", label: "B — border + bar (#1238)", bar: true, border: true },
  { key: "C", label: "C — border, no bar", bar: false, border: true },
] as const;

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

/**
 * Variant C from #1145, with the two axes this ticket varies.
 *
 * `border: false` adds `border-0`, which is what #1145 locked. `border: true`
 * simply omits it, so `Card`'s DEFAULT `border-border rounded-xl border` applies
 * — the whole point of the #1238 ruling is that this is a deletion, not an
 * override, so the prototype must express it as one.
 */
function Toast({
  tone,
  withDescription,
  bar,
  border,
  probe,
}: {
  tone: Tone;
  withDescription: boolean;
  bar: boolean;
  border: boolean;
  probe: string;
}) {
  const t = TONE[tone];
  return (
    <Card
      testID={`${probe}-card`}
      className={`gap-0 py-4 pr-2 shadow-md dark:shadow-none ${border ? "" : "border-0"} ${
        bar ? "pl-3" : "pl-4"
      }`}
    >
      {bar ? (
        <View
          testID={`${probe}-bar`}
          className={`absolute bottom-3 left-3 top-3 w-1 rounded-full ${t.bar}`}
        />
      ) : null}
      <View className={`flex-row items-center gap-3 ${bar ? "pl-4" : ""}`}>
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
 * One style, one surface: the three variants side by side, each at phone width.
 *
 * `surface` is the ground the toast lands on. "oncard" is the ordinary case —
 * 104 files render `<Card>` and #1144/#1154 anchor the toast at the bottom over
 * scrolling content — and it is the one measuring 1.00 without a border.
 */
function SurfaceRow({ style, surface }: { style: StyleName; surface: "onbg" | "oncard" }) {
  return (
    <View className="gap-2">
      <Text className="text-muted-foreground text-xs">
        {surface === "onbg" ? "over the page background" : "over another card"}
      </Text>
      <View className="flex-row gap-4">
        {VARIANTS.map((v) => (
          <View key={v.key} className="w-[358px] gap-2">
            <Text className="text-muted-foreground text-[10px]">{v.label}</Text>
            <View
              testID={`${style}-${surface}-${v.key}-under`}
              className={`${surface === "onbg" ? "bg-background" : "bg-card"} gap-2 p-2`}
            >
              <Toast
                tone="success"
                withDescription={false}
                bar={v.bar}
                border={v.border}
                probe={`${style}-${surface}-${v.key}-success`}
              />
              <Toast
                tone="error"
                withDescription
                bar={v.bar}
                border={v.border}
                probe={`${style}-${surface}-${v.key}-error`}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StyleBlock({ style }: { style: StyleName }) {
  return (
    <View
      testID={`block-${style}`}
      style={THEME_VARIABLES[style][SCHEME]}
      className="bg-background gap-3 p-4"
    >
      <Text className="text-foreground text-xs font-semibold">
        {style} / {SCHEME}
      </Text>
      <SurfaceRow style={style} surface="onbg" />
      <SurfaceRow style={style} surface="oncard" />
    </View>
  );
}

export default function Proto1243() {
  return (
    <ScrollView testID="proto-1243">
      {STYLE_NAMES.map((style) => (
        <StyleBlock key={style} style={style} />
      ))}
    </ScrollView>
  );
}
