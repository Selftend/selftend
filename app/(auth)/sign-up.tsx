import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignUpForm } from "@/src/components/app/sign-up-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { session, user } = useSession();

  // Conversion (#1443): only a REGISTERED session redirects. A guest reaching
  // sign-up is exactly who this screen now serves - the unconditional redirect
  // would make registration unreachable for them - so an `is_anonymous`
  // session falls through to the form, which renders its conversion mode.
  if (session && !user?.is_anonymous) {
    return <Redirect href="/(app)" />;
  }

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
        <SignUpForm />
      </View>
    </MobileFormScreen>
  );
}
