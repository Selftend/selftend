import { Redirect } from "expo-router";
import { View } from "react-native";

import { SignInForm } from "@/src/components/app/sign-in-form";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { isGuestAccount } from "@/src/features/profile/guest";
import { useSession } from "@/src/providers/session-provider";

export default function SignInScreen() {
  const { session, user } = useSession();

  // Guests pass through (#1443): the conversion form's "Sign in instead"
  // collision link lands here with the email prefilled, and an unconditional
  // redirect would bounce the guest straight back into the app. A guest
  // actually signing in over their data is guarded inside the form by the
  // warn-and-abandon confirm (#1444, `useGuestAbandonGuard`).
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
        <SignInForm />
      </View>
    </MobileFormScreen>
  );
}
