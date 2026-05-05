import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignUpForm } from "@/components/sign-up-form";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <SignUpForm />
      </View>
    </MobileFormScreen>
  );
}
