import "../global.css";
import "react-native-reanimated";

import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/src/providers/app-providers";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="crisis" />
        <Stack.Screen name="account-deletion" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <PortalHost />
    </AppProviders>
  );
}
