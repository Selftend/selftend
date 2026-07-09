import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignInForm } from "@/src/components/app/sign-in-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { useSession } from "@/src/providers/session-provider";

export default function SignInScreen() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/(app)" />;
  }

  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <SignInForm />
      </View>
    </MobileFormScreen>
  );
}
