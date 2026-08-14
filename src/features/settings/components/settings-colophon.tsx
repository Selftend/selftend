import * as Linking from "expo-linking";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { appEnv } from "@/src/lib/env";
import { getRunningVersion } from "@/src/lib/update-availability";
import { cn } from "@/lib/utils";

/**
 * Phone stacks the colophon and centres it; desktop lays it out as one line.
 * Same 640 breakpoint and the same `useWindowDimensions` source the tool and
 * reminder rows use.
 */
const WIDE_WIDTH = 640;

/**
 * The page's last line: the running version, and the one door to the repository.
 *
 * **Two nodes rather than one string**, which is a correction to the spec's
 * `"Selftend v{{version}} · open source"`. Two things make a single key
 * impossible:
 *
 *   - The version renders **when known** and the repo link renders **always**, so
 *     on a build with no resolvable version a one-string colophon would read
 *     `Selftend v · open source`.
 *   - It has to **stack on phone**: the Bulgarian line measures 372px against the
 *     354px a 390dp frame leaves, and one `Text` cannot stack half of itself.
 *
 * So the separator is its own node, rendered only when there is something on both
 * sides of it, and only on the frame that puts them side by side.
 */
export function SettingsColophon() {
  const { t } = useTranslation("settings");
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_WIDTH;
  const version = getRunningVersion();

  return (
    <View
      testID="settings-colophon"
      className={cn(
        "pt-2",
        wide ? "flex-row items-center justify-center gap-2" : "items-center gap-1",
      )}
    >
      {version ? (
        <Text variant="muted" className="text-xs">
          {t("account.version", { version })}
        </Text>
      ) : null}
      {version && wide ? (
        <Text
          variant="muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="text-xs"
        >
          ·
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="link"
        role="link"
        accessibilityLabel={t("openSource")}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => void Linking.openURL(appEnv.githubRepoUrl)}
        testID="settings-open-source"
        className={cn("active:opacity-70", Platform.select({ web: "hover:opacity-80" }))}
      >
        <Text variant="muted" className="text-xs underline">
          {t("openSource")}
        </Text>
      </Pressable>
    </View>
  );
}
