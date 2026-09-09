import { Platform, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { useWideFrame } from "@/src/features/settings/use-wide-frame";
import { getRunningVersion } from "@/src/lib/update-availability";
import { cn } from "@/lib/utils";

/**
 * The page's last line: the running version, and the one door to the repository.
 *
 * Phone stacks it and centres it; desktop lays it out as one line. The 640
 * breakpoint that used to live here as a private `WIDE_WIDTH` moved to
 * `useWideFrame` (#1830), so the page's type scale steps at the same width this
 * does — one number, one place.
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
  const wide = useWideFrame();
  const version = getRunningVersion();
  const openRepo = () => openExternalUrl(appEnv.githubRepoUrl);

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
        // The visible text is two words of colophon; a link's accessible NAME has
        // to say where it goes, and "open source" names a licence, not a
        // destination.
        accessibilityLabel={t("openSourceA11y")}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        // `openExternalUrl`, not a bare `Linking.openURL`: on web the helper opens
        // a new tab with `noopener,noreferrer`, where `Linking.openURL` navigates
        // the app's own tab away - and it logs the native rejection that a `void`
        // would swallow. Every other outbound link in the app already uses it.
        onPress={openRepo}
        // No `href`, so on web this is a `<div role="link">` that react-native-web
        // leaves to the browser on Enter as though it were an anchor. The link
        // brings its own Enter handler (#1730).
        {...enterKeyActivationProps(openRepo)}
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
