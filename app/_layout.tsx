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
import { useEffect } from "react";
import { View } from "react-native";

import { AppShell } from "@/src/components/app/app-shell";
import { AppErrorBoundary } from "@/src/components/app/app-error-boundary";
import { AppToast } from "@/src/components/app/app-toast";
import { CookieConsentBanner } from "@/src/components/app/cookie-consent-banner";
import { useAppColorScheme } from "@/src/lib/color-scheme";
import { AppProviders } from "@/src/providers/app-providers";
import { NAV_THEME, THEME_VARIABLES } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useAppColorScheme();
  const [fontsLoaded] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSans_800ExtraBold,
  });

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
