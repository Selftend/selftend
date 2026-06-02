import { router } from "expo-router";
import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SignInForm } from "@/src/components/app/sign-in-form";
import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";

export function AuthLandingBlock() {
  const { t } = useTranslation(["auth", "common", "policies"]);

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
      <View className="items-center gap-2 pt-1">
        <Text className="text-center text-xs text-muted-foreground">
          {t("common:safety.description")}
        </Text>
        <View className="flex-row flex-wrap items-center justify-center">
          <Button onPress={() => router.push("/crisis")} variant="link" size="sm">
            <Text className="text-xs">{t("common:safety.openCrisis")}</Text>
          </Button>
          <Button onPress={() => router.push("/terms")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:terms.pageTitle")}</Text>
          </Button>
          <Button onPress={() => router.push("/privacy")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:privacy.pageTitle")}</Text>
          </Button>
          <Button onPress={() => router.push("/cookies")} variant="link" size="sm">
            <Text className="text-xs">{t("policies:cookies.pageTitle")}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
