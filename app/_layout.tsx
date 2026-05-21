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
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { AppShell } from "@/src/components/app/app-shell";
import { AppErrorBoundary } from "@/src/components/app/app-error-boundary";
import { AppToast } from "@/src/components/app/app-toast";
import { CookieConsentBanner } from "@/src/components/app/cookie-consent-banner";
import {
  getNativeWindColorScheme,
  resolveThemePreference,
  useSystemColorScheme,
} from "@/src/lib/color-scheme";
import { AppProviders } from "@/src/providers/app-providers";
import { NAV_THEME, THEME_VARIABLES } from "@/lib/theme";
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
