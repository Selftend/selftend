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
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { ThemeProvider } from "expo-router";
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
import { KeyboardInsetPublisher } from "@/src/components/app/keyboard-inset-publisher";
import { ReminderPromptCard } from "@/src/features/notifications/reminder-prompt-card";
import { useColorSchemeDriver, useColorSchemeName } from "@/src/lib/color-scheme";
import { useStyleDriver, useStyleName } from "@/src/lib/style";
import { useDocumentThemeColor } from "@/src/lib/use-document-theme-color";
import { useDocumentThemeVars } from "@/src/lib/use-document-theme-vars";
import { AppProviders } from "@/src/providers/app-providers";
import { NAV_THEME, THEME_HEXES, THEME_VARIABLES, themeVarValues } from "@/lib/theme";
import { initSentry } from "@/src/lib/sentry";
import * as Sentry from "@sentry/react-native";

// Initialize before first render so startup crashes are captured. No-op
// without EXPO_PUBLIC_SENTRY_DSN or in dev.
initSentry();

SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  // The app's single driver: it hydrates the stored preference and pushes it
  // into NativeWind. It sits above the `if (!ready)` bail-out below so it keeps
  // running while the splash is up.
  useColorSchemeDriver();
  // The style axis's driver, and its own hydrate. Two axes, two guards: a single
  // shared flag would let a slow read on one settle the other, which is the
  // read-then-overwrite shape of #304/#343.
  useStyleDriver();
  const colorScheme = useColorSchemeName();
  const style = useStyleName();
  // Web only: mirror the tokens onto <html> so surfaces portalled outside this
  // root View - popovers, dialogs, selects, toasts - resolve the active palette
  // instead of the global.css fallback.
  useDocumentThemeVars(themeVarValues(colorScheme, style));
  // Web only: keep the browser chrome's theme-color and the document background
  // on the active palette. The first-paint script sets both once at load; this
  // is what follows a palette switch, an appearance switch, or an OS scheme
  // change afterwards instead of leaving the address bar on the load-time hue.
  useDocumentThemeColor(THEME_HEXES[style][colorScheme]["--background"]);
  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
    NotoSans_800ExtraBold,
    Nunito_800ExtraBold,
  });

  // Web: paint immediately - expo-font has already injected the @font-face rules, so the
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
        <ThemeProvider value={NAV_THEME[style][colorScheme]}>
          <View className="flex-1 bg-background" style={THEME_VARIABLES[style][colorScheme]}>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <AppErrorBoundary>
              {/* Layer 0 of the bottom-inset ladder (#1339): the soft keyboard
                  overlays the layout viewport on all three platforms, so the
                  bottom-anchored floaters below have to be told where it is. */}
              <KeyboardInsetPublisher />
              <AppShell />
              <CookieConsentBanner />
              <ReminderPromptCard />
              <AppToast />
            </AppErrorBoundary>
            <PortalHost />
          </View>
        </ThemeProvider>
      </AppProviders>
    </GestureHandlerRootView>
  );
});
