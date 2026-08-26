import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import { Text } from "@/src/components/react-native-reusables/text";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { useAccentHsl } from "@/src/lib/theme-palette";

// Shell B (#777): the focus surface breathing, grounding and meditation run
// their live sessions on. The design drew it as a hardcoded dark-violet
// triple (260 22% 10%, dark-only); what shipped instead is theme-derived - a
// neutral base under a low-alpha wash of the ACTIVE style's accent, so it
// follows both the user's palette and their light/dark choice.
//
// The base differs by scheme, and the difference is measured, not aesthetic:
// dark washes the page background (the calm low-luminance surface #777 asks
// for), but light washes the CARD. Sage-garden's muted text has only 4.65:1
// of headroom on its light background, and even a 0.04 accent wash pulls it
// to 4.43 - under AA - while every style's card carries the same wash at 4.8+.
// Both halves are exported for test/focus-surface-contrast.test.ts, which
// composites the wash over every style's base and holds foreground and muted
// text to AA on the result.
//
// No breadcrumb, no h1: the Escape and a minimal eyebrow-and-progress row are
// the only frame (#1256, R1/R3 on the #1167 spec). The shell used to claim it
// "removes the affordances that would invite a casual exit" - that was never
// true: the shell is a ROUTE, not a modal, so `InvisibleHeader` (hamburger,
// brand home link, user menu) already renders above every session, and the
// only exit the shell ever withheld was the one that keeps the user's place.
// What an OS/web back action does mid-session (pause + finish-or-continue) is
// still the screen's job, not the shell's: the Escape leaves through
// `router.replace`, so the screens' `beforeRemove` guards catch it exactly
// like every other uninvited exit.
export const FOCUS_WASH_ALPHA = { light: 0.04, dark: 0.07 } as const;
export const FOCUS_WASH_BASE = { light: "--card", dark: "--background" } as const;

interface FocusSessionShellProps {
  /** The quiet label naming what's running - the top row's left side. */
  eyebrow: string;
  /** The progress read-out - the top row's right side ("Cycle 1 of 8 · 2:08 left"). */
  trailing?: string;
  children: ReactNode;
}

export function FocusSessionShell({ eyebrow, trailing, children }: FocusSessionShellProps) {
  const scheme = useColorSchemeName();
  const accent = useAccentHsl();

  return (
    // The class pair mirrors FOCUS_WASH_BASE - the contrast gate measures the
    // token the class paints, so the two must move together.
    <SafeAreaView className={scheme === "dark" ? "flex-1 bg-background" : "flex-1 bg-card"}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: accent(FOCUS_WASH_ALPHA[scheme]) }]}
        testID="focus-surface-wash"
      />
      <ScrollView contentContainerClassName="grow px-6 pb-8 pt-3">
        <View className="w-full max-w-[620px] grow self-center">
          <View className="flex-row items-center justify-between gap-3">
            {/* The Escape renders unconditionally - never wrap it in a
                condition (#1250). The arrow, not the close glyph: a session is
                not a create/edit form, and its Up ("Back to Grounding",
                "Back to Meditation") is exactly where leaving should land. */}
            <View className="shrink flex-row items-center gap-2">
              <ScreenEscape />
              <Text variant="eyebrow" numberOfLines={1} className="shrink">
                {eyebrow}
              </Text>
            </View>
            {trailing ? (
              <Text variant="muted" className="shrink-0 text-xs tabular-nums">
                {trailing}
              </Text>
            ) : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
