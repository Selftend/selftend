import { View } from "react-native";

import { VerifyEmailForm } from "@/src/components/app/verify-email-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";

export default function VerifyEmailScreen() {
  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <VerifyEmailForm />
      </View>
    </MobileFormScreen>
  );
}
