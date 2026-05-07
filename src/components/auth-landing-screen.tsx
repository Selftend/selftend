import { View } from "react-native";

import { AuthLandingBlock } from "@/src/components/auth-landing-block";
import { MobileFormScreen } from "@/src/components/mobile-form-screen";

export function AuthLandingScreen() {
  return (
    <MobileFormScreen contentClassName="items-center justify-center">
      <View className="w-full max-w-sm">
        <AuthLandingBlock />
      </View>
    </MobileFormScreen>
  );
}
