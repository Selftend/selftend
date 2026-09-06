import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignUpForm } from "@/src/components/app/sign-up-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { isGuestAccount } from "@/src/features/auth/guest-account";
import { useSession } from "@/src/providers/session-provider";

export default function SignUpScreen() {
  const { session, user } = useSession();

  // Conversion (#1443): only a REGISTERED session redirects. A guest reaching
  // sign-up is exactly who this screen now serves - the unconditional redirect
  // would make registration unreachable for them - so a guest session falls
  // through to the form, which renders its conversion mode.
  //
  // ☠️ #1896: this reads `isGuestAccount`, but `SignUpForm`'s own `isConversion`
  // deliberately still reads the FLAG. They are different questions - "is this
  // session a guest right now" against "is this submission an upgrade of an
  // anonymous row" - and the form is mid-submission when they diverge. The
  // redirect firing on a successful conversion is harmless: the form's success
  // path is already `router.replace("/(app)")`, the same destination.
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
