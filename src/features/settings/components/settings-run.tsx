import { Children, type ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

interface SettingsRunProps {
  /** The run's name: `App`, `Your data`, `Help`, `Account`. */
  label: string;
  children: ReactNode;
  testID?: string;
}

/**
 * One labelled run of settings rows - a name, then its rows on a single card
 * separated by hairlines.
 *
 * Four of these replace seven `SettingsSectionCard`s. A card gave each section an
 * icon badge, a title and a description, which meant the page's structure was
 * carried three times over; a run carries it once, in the label, and lets the
 * rows be rows.
 *
 * `Children.toArray` drops `null`, so a platform-gated row (`App lock` on native,
 * `Cookies` on web) leaves no empty slot and no orphan hairline behind it.
 */
export function SettingsRun({ label, children, testID }: SettingsRunProps) {
  const rows = Children.toArray(children);

  return (
    <View className="gap-2">
      {/*
        `accessibilityRole="header"` rather than `variant="h2"`: the run label is
        an 11px eyebrow, and h2 would drag the display face and a 30px size along
        with the heading semantics. The role is the part that matters here - four
        runs a screen-reader user can jump between.
      */}
      <Text variant="eyebrow" accessibilityRole="header" className="px-1">
        {label}
      </Text>
      <View className="rounded-xl border border-border bg-card px-4" testID={testID}>
        {rows.map((row, index) => (
          <View
            key={index}
            // Hairlines BETWEEN rows only. A leading or trailing rule would read
            // as a fifth, empty row against the card's own border.
            className={cn(index > 0 && "border-t border-border")}
          >
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}
