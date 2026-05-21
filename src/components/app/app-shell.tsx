import { Stack } from "expo-router";
import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/src/components/app/app-header";
import { SidebarNav } from "@/src/components/app/sidebar-nav";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { DESKTOP_BREAKPOINT } from "@/src/constants/layout";
import { useSession } from "@/src/providers/session-provider";
import { useSidebarStore } from "@/src/stores/sidebar-store";

export function AppShell() {
  const { t } = useTranslation("navigation");
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const { session } = useSession();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const close = useSidebarStore((s) => s.close);
  const showMobileNav = Boolean(session) && !isDesktop;

  useEffect(() => {
    if (!showMobileNav) {
      close();
    }
  }, [close, showMobileNav]);

  return (
    <View className="flex-1 bg-background">
      <AppHeader showHamburger={showMobileNav} onMenuPress={toggle} />
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="cookies" />
          <Stack.Screen name="crisis" />
          <Stack.Screen name="account-deletion" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </View>

      {showMobileNav && isOpen ? (
        <View className="absolute inset-0 z-50 flex-row">
          <SidebarNav includeTopInset onSelect={close} />
          <Pressable
            accessibilityLabel={t("header.closeNav")}
            accessibilityRole="button"
            className="flex-1 bg-black/50"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={close}
            role="button"
          />
        </View>
      ) : null}
    </View>
  );
}
