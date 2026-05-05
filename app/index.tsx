import { Redirect } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { AuthLandingBlock } from "@/src/components/auth-landing-block";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";
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

  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <AuthLandingBlock />
      </View>
    </MobileFormScreen>
  );
}
