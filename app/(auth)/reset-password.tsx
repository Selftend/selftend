import { View } from "react-native";

import { ForgotPasswordForm } from "@/src/components/app/forgot-password-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";

export default function ResetPasswordScreen() {
  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <ForgotPasswordForm />
      </View>
    </MobileFormScreen>
  );
}
