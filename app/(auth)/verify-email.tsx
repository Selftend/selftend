import { View } from "react-native";

import { VerifyEmailForm } from "@/src/components/app/verify-email-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";

export default function VerifyEmailScreen() {
  return (
    <MobileFormScreen
      contentClassName="items-center justify-center"
      // The Escape (#1254): `(auth)` is in scope like every other screen - a
      // carve-out is precisely the shape that rots. An auth screen is a leaf
      // off the root, so the arrow leads to `/` and announces "Back to Home";
      // the one-crumb trail stays hidden, and the bar carries the Escape alone.
      topBar={<ScreenTopBar />}
    >
      <View className="w-full max-w-sm">
        <VerifyEmailForm />
      </View>
    </MobileFormScreen>
  );
}
