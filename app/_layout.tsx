import "../global.css";
import "react-native-reanimated";
import "@/src/i18n";

import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
  NotoSans_800ExtraBold,
} from "@expo-google-fonts/noto-sans";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { AppErrorBoundary } from "@/src/components/app-error-boundary";
import { AppToast } from "@/src/components/app-toast";
import { CookieConsentBanner } from "@/src/components/cookie-consent-banner";
import {
  getNativeWindColorScheme,
  resolveThemePreference,
  useSystemColorScheme,
} from "@/src/lib/color-scheme";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { DESKTOP_BREAKPOINT } from "@/src/constants/layout";
import { AppProviders } from "@/src/providers/app-providers";
import { useSession } from "@/src/providers/session-provider";
import { NAV_THEME, THEME_VARIABLES } from "@/lib/theme";
import { useSidebarStore } from "@/src/stores/sidebar-store";
import { useThemeStore } from "@/src/stores/theme-store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  const { preference, hydrate } = useThemeStore();
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = resolveThemePreference(preference, systemColorScheme);
  const nativeWindColorScheme = getNativeWindColorScheme(preference, systemColorScheme);
  const [fontsLoaded] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSans_800ExtraBold,
  });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const setColorSchemeRef = useRef(setColorScheme);
  setColorSchemeRef.current = setColorScheme;

  useEffect(() => {
    setColorSchemeRef.current(nativeWindColorScheme);
  }, [nativeWindColorScheme]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppProviders>
      <ThemeProvider value={NAV_THEME[colorScheme]}>
        <View className="flex-1 bg-background" style={THEME_VARIABLES[colorScheme]}>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <AppErrorBoundary>
            <AppShell />
            <CookieConsentBanner />
            <AppToast />
          </AppErrorBoundary>
          <PortalHost />
        </View>
      </ThemeProvider>
    </AppProviders>
  );
}

function AppShell() {
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
