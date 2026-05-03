import { Image, View } from "react-native";

import { SignInForm } from "@/components/sign-in-form";
import { Text } from "@/components/ui/text";

export function AuthLandingBlock() {
  return (
    <View className="gap-5">
      <View className="items-center gap-3">
        <Image
          source={require("../../assets/icon.png")}
          resizeMode="contain"
          style={{ width: 72, height: 72, borderRadius: 16 }}
        />
        <Text className="text-2xl font-semibold text-foreground">SelfTend</Text>
        <Text className="text-center text-muted-foreground">
          Calm, guided self-help tools for reflection and emotional support.
        </Text>
      </View>
      <SignInForm />
    </View>
  );
}
