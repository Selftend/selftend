import { Redirect } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SignUpForm } from "@/components/sign-up-form";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { session } = useSession();

  if (session) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow items-center justify-center p-6"
        keyboardDismissMode="interactive"
      >
        <View className="w-full max-w-sm">
          <SignUpForm />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
