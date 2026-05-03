import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ResetPasswordScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow items-center justify-center p-6"
        keyboardDismissMode="interactive"
      >
        <View className="w-full max-w-sm">
          <ForgotPasswordForm />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
