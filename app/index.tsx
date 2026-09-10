import { Redirect } from "expo-router";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AuthLandingScreen } from "@/src/components/app/auth-landing-screen";
import LandingScreen from "@/src/components/app/landing/landing-screen";
import { LoadingState } from "@/src/components/app/screen-state";
import { useSession } from "@/src/providers/session-provider";

export default function IndexScreen() {
  const { t } = useTranslation("common");
  const { session, status } = useSession();

  if (status === "loading") {
    // Web: the exported `/` file IS the landing page - the session seeds
    // "ready" at export (#2293) - so the hydration render has to be the landing
    // too. A spinner here would mismatch the file's body, and React would throw
    // the server-rendered page away and re-render it from scratch. A signed-in
    // visitor sees the landing for the instant the stored session takes to
    // resolve, then the redirect below; that instant used to show the spinner.
    if (Platform.OS === "web") {
      return <LandingScreen />;
    }

    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("loading")} description={t("preparingWorkspace")} />
        </View>
      </SafeAreaView>
    );
  }

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return Platform.OS === "web" ? <LandingScreen /> : <AuthLandingScreen />;
}
