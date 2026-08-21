import { type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { CHROME_MARK } from "@/src/lib/theme/chrome";

// A shared tool is a plain link. It used to be a union - `helpKey` meant "open
// the route", `infoKey` meant "pop a guide modal instead" - and the row branched
// on which one was present. Every chip opens its tool now, so there is nothing
// left to discriminate.
export interface SharedTool {
  key: string;
  route: Href;
  icon: MaterialIconName;
  labelKey: string;
}

interface SharedToolsRowProps {
  // Resolved copy, not a key. The row is module-agnostic and the heading is the
  // one thing that is not - CBT says "Uses these shared tools" out of `cbt.json`
  // - so the caller translates it, the way `PillarCard` takes its title.
  heading: string;
  tools: SharedTool[];
}

// The pill glyphs took the owning pillar's hue (#587). It never distinguished
// anything the row did not already say - every pill in a row shared one tint, so
// the colour repeated the heading above it - and it cost this file a per-hue
// exception: `think` read 2.03:1 on `bg-card` and could not be seen as think at
// all, so it alone had to take the ink.
//
// Every pill now opens its tool. It used to be split - breathing navigated,
// the other eight popped a guide modal that closed straight back to this page -
// and each pill carried a second, trailing icon (`open-in-new` vs `help-outline`)
// whose whole job was to warn you which kind you were about to press. Every one
// of those guides is already rendered by the tool screen itself, so the detour
// is gone, and the icon that announced it has nothing left to distinguish.
//
// It lives here rather than under `features/cbt` because nothing in it is CBT's:
// it takes its heading and its tools as props. CBT is its only caller today.
// Whether ACT's `Also try` row (`features/act/related-tools.tsx`) converges onto
// it is #1216, and is not decided.
export function SharedToolsRow({ heading, tools }: SharedToolsRowProps) {
  const { t } = useTranslation("navigation");
  // A chip leaves the module for a tool rooted under `/tools`, so the tool's own
  // Up climbs to `/tools` and never back to the module the user was working in.
  // These are the nine off-trail pushes #1192 landed hours after the escape rule
  // was charted - the growth that made recording opt-out rather than opt-in.
  const pushWithOrigin = usePushWithOrigin();

  return (
    <View className="ml-1 flex-row flex-wrap items-center gap-2">
      <View className="flex-row items-center gap-1">
        <Icon name="auto-awesome" size={11} className="text-muted-foreground" />
        <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-wider">
          {heading}
        </Text>
      </View>
      {tools.map((tool) => (
        <Pressable
          key={tool.key}
          accessibilityRole="button"
          hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
          onPress={() => pushWithOrigin(tool.route)}
          className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 active:bg-accent/40"
        >
          <Icon name={tool.icon} size={13} className={CHROME_MARK} />
          <Text className="text-xs font-medium">{t(tool.labelKey)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
