import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { SignInForm } from "@/src/components/app/sign-in-form";
import { Text } from "@/src/components/react-native-reusables/text";

export function AuthLandingBlock() {
  const { t } = useTranslation("auth");

  return (
    <View className="gap-5">
      <View className="items-center gap-3">
        <Image
          source={require("../../../assets/icon.png")}
          resizeMode="contain"
          style={{ width: 72, height: 72, borderRadius: 16 }}
        />
        <Text className="text-2xl font-semibold text-foreground">{t("landing.title")}</Text>
        <Text className="text-center text-muted-foreground">{t("landing.subtitle")}</Text>
      </View>
      <SignInForm />
    </View>
  );
}
