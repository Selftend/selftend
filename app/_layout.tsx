import "../global.css";
import "react-native-reanimated";
import "@/src/i18n";

// Per-variant subpaths, not the "@expo-google-fonts/noto-sans" barrel: the barrel
// eagerly require()s all 18 variant TTFs (~11 MB), so Metro bundles ~8 MB of fonts we
// never load. Each subpath ships only its one weight.
import { NotoSans_400Regular } from "@expo-google-fonts/noto-sans/400Regular";
import { NotoSans_500Medium } from "@expo-google-fonts/noto-sans/500Medium";
import { NotoSans_600SemiBold } from "@expo-google-fonts/noto-sans/600SemiBold";
import { NotoSans_700Bold } from "@expo-google-fonts/noto-sans/700Bold";
import { NotoSans_800ExtraBold } from "@expo-google-fonts/noto-sans/800ExtraBold";
import { ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { PortalHost } from "@rn-primitives/portal";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSans_800ExtraBold,
  });

  // Web: paint immediately — expo-font has already injected the @font-face rules, so the
  // browser swaps Noto Sans in when the files arrive (brief FOUT) instead of blocking the
  // entire first paint on a runtime download of 5 × ~620 KB TTFs. Native: keep the splash
  // until the fonts are registered. The error escape hatch avoids a permanent blank screen
  // if a font fails to load.
  const ready = Platform.OS === "web" || fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
