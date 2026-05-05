import { View } from "react-native";

import { VerifyEmailForm } from "@/components/verify-email-form";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";

export default function VerifyEmailScreen() {
  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <VerifyEmailForm />
      </View>
    </MobileFormScreen>
  );
}
