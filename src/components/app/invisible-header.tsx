import { Link } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { UserMenu } from "@/src/components/app/user-menu";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useTourTargetRef } from "@/src/features/tours/tour-targets";

interface InvisibleHeaderProps {
  onMenuPress: () => void;
}

/**
 * The signed-in chrome (#658/#667): a transparent bar in normal flow — content
 * is pushed down, never overlapped — with a floating-circle hamburger on the
 * left, the logo + wordmark centered as the home link, and the UserMenu as a
 * floating circle on the right. Identical at every width; the hamburger opens
 * the navigation panel as an overlay.
 */
export function InvisibleHeader({ onMenuPress }: InvisibleHeaderProps) {
  const { t } = useTranslation("navigation");
  const insets = useSafeAreaInsets();
  const navTargetRef = useTourTargetRef("home-navigation");

  return (
    <View
      testID="invisible-header"
      className="flex-row items-center justify-between px-3 py-2"
      style={{ marginTop: insets.top }}
    >
      {/* Centered brand layer UNDER the buttons; box-none must stay the View
          PROP (not a style entry) or this absolute layer swallows their taps. */}
      <View
        testID="invisible-header-brand-layer"
        pointerEvents="box-none"
        className="absolute inset-0 items-center justify-center"
      >
        <Link href="/(app)" asChild>
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
      <View className="rounded-full border border-border bg-card shadow-md">
        <UserMenu />
      </View>
    </View>
  );
}
