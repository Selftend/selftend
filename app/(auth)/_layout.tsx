import { Stack } from "expo-router";
import { View } from "react-native";

import { AndroidDownloadBar } from "@/src/components/app/android-download-bar";

export default function AuthLayout() {
  return (
    <View className="flex-1">
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* `dangerouslySingular` per the rule in `protected-layout.tsx` (#1027). This
              group declared nothing at all, so every screen here was auto-registered with
              default options - and these routes push at EACH OTHER: sign-in offers
              "Create account", sign-up offers "Sign in", and the forgot-password form
              offers it too. Sign-in → sign-up → sign-in therefore mounted sign-in TWICE,
              leaving a hidden second copy of the form holding whatever had been typed
              into it. Deduplicating them means fewer live instances holding credentials,
              not more.

              TWO stay plain, and only one of them is derivable:

              - `verify-email` is keyed by `?email=` - sign-up hands it the address it just
                registered - and `getSingularId` reads path segments only, so two different
                addresses would collapse into one instance.
              - ☠️ `auth-callback`'s MOUNT IS THE WORK: it reads the callback URL, completes
                the redirect behind a `useRef` guard that fires once, and scrubs the auth
                material out of history. Reusing that instance for a second, different code
                would silently skip processing it. It reads `window.location.href` rather
                than `useLocalSearchParams`, so `nav-singular.test.ts` cannot derive this -
                it is restated there in `MUST_REMOUNT`. */}
          <Stack.Screen name="sign-in" dangerouslySingular />
          <Stack.Screen name="sign-up" dangerouslySingular />
          <Stack.Screen name="reset-password" dangerouslySingular />
          <Stack.Screen name="update-password" dangerouslySingular />
          <Stack.Screen name="verify-email" />
          <Stack.Screen name="auth-callback" />
        </Stack>
      </View>
      {/* Public/auth routes only (#388 section 4): an Android browser gets a
          one-line, forever-dismissible offer to grab the Play build. */}
      <AndroidDownloadBar />
    </View>
  );
}
