import { Link } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { UserMenu } from "@/src/components/app/user-menu";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useTourTargetRef } from "@/src/features/tours/tour-targets";

/**
 * How tall the header row is, below the status-bar inset - its `py-2` (8px each
 * side) plus its tallest child, which is 48px either way: signed in that is the
 * hamburger's `p-3` around a `size-6` icon (12 + 24 + 12), signed out it is the
 * `size-12` spacer that stands in for it - both branches are pinned below. The
 * UserMenu's `size-8` trigger is shorter than both, so it never decides the row;
 * that one is not pinned, because the header suite stubs UserMenu out.
 *
 * Exported because #660's rule - "the top of the screen belongs to the
 * invisible header" - needs a NUMBER at exactly one other place: the toast
 * clamps its climb so its top edge never crosses under this bar (#1340). A
 * measured height would be better still, but the toast is root-mounted outside
 * AppShell and has no handle on the header; `invisible-header.test.tsx` pins
 * the classes this arithmetic reads, so the constant cannot drift silently.
 */
export const INVISIBLE_HEADER_HEIGHT = 64;

interface InvisibleHeaderProps {
  /**
   * Opens the navigation panel. Omit when signed out — there is no nav, so
   * the hamburger slot renders an invisible spacer of the same size, keeping
   * the row structure (and the UserMenu position) identical everywhere.
   */
  onMenuPress?: () => void;
  /** Where the centered brand links: "/(app)" signed in, "/" signed out. */
  homeHref: "/" | "/(app)";
}

/**
 * The app's one chrome (#658/#667/#669): a transparent bar in normal flow —
 * content is pushed down, never overlapped — with a floating-circle hamburger
 * on the left (signed in only), the logo + wordmark centered as the home
 * link, and the UserMenu as a floating circle on the right. Identical at
 * every width and on every surface; the hamburger opens the navigation panel
 * as an overlay.
 */
export function InvisibleHeader({ onMenuPress, homeHref }: InvisibleHeaderProps) {
  const { t } = useTranslation("navigation");
  const insets = useSafeAreaInsets();
  const navTargetRef = useTourTargetRef("home-navigation");

  return (
    <View
      testID="invisible-header"
      className="flex-row items-center justify-between px-3 py-2"
      style={{ marginTop: insets.top }}
    >
      {/* DOM order is the web Tab order (#673): hamburger first, then the
          brand home link, then the UserMenu — matching the visual
          left-to-right layout. The absolute brand layer sits between the two
          buttons in the DOM without disturbing the row's justify-between. */}
      {onMenuPress ? (
        <View ref={navTargetRef}>
          <Pressable
            accessibilityLabel={t("header.openNav")}
            accessibilityRole="button"
            role="button"
            onPress={onMenuPress}
            className="rounded-full border border-border bg-card p-3 shadow-md active:bg-muted/50 web:hover:bg-muted/50"
          >
            <Icon name="menu" className="size-6 text-foreground" />
          </Pressable>
        </View>
      ) : (
        <View testID="invisible-header-nav-spacer" className="size-12" />
      )}
      {/* Centered brand layer; box-none must stay the View PROP (not a style
          entry) or this absolute layer swallows the buttons' taps. */}
      <View
        testID="invisible-header-brand-layer"
        pointerEvents="box-none"
        className="absolute inset-0 items-center justify-center"
      >
        {/* Singular for the same reason as the nav panel (#989): the wordmark is a
            "go to the top" affordance, not a drill-down, so it must reuse the Home
            already in the stack rather than push a second one. */}
        <Link href={homeHref} dangerouslySingular asChild>
          <Pressable
            accessibilityLabel={t("header.goHome")}
            accessibilityRole="link"
            role="link"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            className="flex-row items-center gap-2 rounded-md p-1.5"
          >
            <Image
              accessible={false}
              source={require("../../../assets/icon.png")}
              resizeMode="contain"
              style={{ width: 28, height: 28, borderRadius: 6 }}
            />
            <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
              {t("header.appName")}
            </Text>
          </Pressable>
        </Link>
      </View>
      <View className="rounded-full border border-border bg-card shadow-md">
        <UserMenu />
      </View>
    </View>
  );
}
