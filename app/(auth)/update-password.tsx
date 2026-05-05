import { View } from "react-native";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";

export default function UpdatePasswordScreen() {
  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <ResetPasswordForm />
      </View>
    </MobileFormScreen>
  );
}
