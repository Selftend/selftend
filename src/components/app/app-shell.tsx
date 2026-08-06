import { Stack } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/src/components/app/app-header";
import { InvisibleHeader } from "@/src/components/app/invisible-header";
import { SidebarNav } from "@/src/components/app/sidebar-nav";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { useSidebarStore } from "@/src/stores/sidebar-store";

export function AppShell() {
  const { t } = useTranslation("navigation");
  const { session } = useSession();
  const isOpen = useSidebarStore((s) => s.isOpen);
  const toggle = useSidebarStore((s) => s.toggle);
  const close = useSidebarStore((s) => s.close);
  // Signed in, the chrome is the invisible header at every width (#667); the
  // old top bar remains only on signed-out surfaces until #669 retires it.
  const signedIn = Boolean(session);

  useEffect(() => {
    if (!signedIn) {
      close();
    }
  }, [close, signedIn]);

  return (
    <View className="flex-1 bg-background">
      {signedIn ? <InvisibleHeader onMenuPress={toggle} /> : <AppHeader />}
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

      {signedIn && isOpen ? (
        <View testID="navigation-overlay" className="absolute inset-0 z-50 flex-row">
          {/* No close button: the panel opens at Home and the backdrop is the
              close affordance for pointer and screen-reader users alike. */}
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
