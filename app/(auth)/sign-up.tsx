import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignUpForm } from "@/src/components/app/sign-up-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { isGuestAccount } from "@/src/features/profile/guest";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { session, user } = useSession();

  // Conversion (#1443): only a REGISTERED session redirects. A guest reaching
  // sign-up is exactly who this screen now serves - the unconditional redirect
  // would make registration unreachable for them - so a guest session falls
  // through to the form, which renders its conversion mode.
  //
  // ⚠️ `isGuestAccount` since #1896, so a JUST-CONVERTED user - whose JWT still
  // claims `is_anonymous` - is redirected away rather than shown the conversion
  // form a second time. `SignUpForm`'s own `isConversion` stays on the flag, and
  // this redirect is what keeps it unreachable where it would be wrong.
  if (session && !isGuestAccount(user)) {
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
