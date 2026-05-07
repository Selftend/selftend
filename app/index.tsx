import { Redirect } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AuthLandingScreen } from "@/src/components/auth-landing-screen";
import { LoadingState } from "@/src/components/screen-state";
import { useSession } from "@/src/providers/session-provider";

export default function IndexScreen() {
  const { t } = useTranslation("common");
  const { session, status } = useSession();

  if (status === "loading") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("loading")} description={t("preparingWorkspace")} />
        </View>
      </SafeAreaView>
    );
  }

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <AuthLandingScreen />;
}
