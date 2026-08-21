import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { GetTheAppSection } from "@/src/components/app/get-the-app-section";
import { SignInForm } from "@/src/components/app/sign-in-form";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

export function AuthLandingBlock() {
  const { t } = useTranslation(["auth", "common", "policies"]);
  // Recording is opt-out, so these record like any other cross-link (#1265, O3)
  // even though the landing sits at the root and every destination here already
  // has the root as its Up - the Escape's off-trail test simply ignores an
  // Origin that leads where Up already goes. Deciding that per call site is what
  // makes an Origin rule rot: the next link added here would forget.
  const pushWithOrigin = usePushWithOrigin();

  return (
    <View className="gap-5">
      <View className="items-center gap-3">
        <Image
          source={require("../../../assets/icon.png")}
          resizeMode="contain"
          style={{ width: 72, height: 72, borderRadius: 16 }}
        />
        <Text className="text-2xl font-semibold text-foreground">{t("auth:landing.title")}</Text>
        <Text className="text-center text-muted-foreground">{t("auth:landing.subtitle")}</Text>
      </View>
      <SignInForm />
      <GetTheAppSection />
      <View className="items-center gap-2 pt-1">
        <Text className="text-center text-xs text-muted-foreground">
          {t("common:safety.description")}
        </Text>
        <View className="flex-row flex-wrap items-center justify-center">
          <Button onPress={() => pushWithOrigin("/crisis")} variant="link" size="sm">
            <Text className="text-xs">{t("common:safety.openCrisis")}</Text>
          </Button>
          <Button onPress={() => pushWithOrigin("/terms")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:terms.pageTitle")}</Text>
          </Button>
          <Button onPress={() => pushWithOrigin("/privacy")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:privacy.pageTitle")}</Text>
          </Button>
          <Button onPress={() => pushWithOrigin("/cookies")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:cookies.pageTitle")}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
