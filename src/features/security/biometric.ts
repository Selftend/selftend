import { Platform } from "react-native";
import { authenticateAsync, hasHardwareAsync, isEnrolledAsync } from "expo-local-authentication";

// Thin wrapper around expo-local-authentication. Native-only: on web both
// functions no-op to `false` so the app never shows a lock there.

export async function isBiometricAvailable(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  return (await hasHardwareAsync()) && (await isEnrolledAsync());
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  // disableDeviceFallback:false keeps the device passcode fallback ON, so users
  // without (or who fail) biometrics can still unlock with their passcode.
  const result = await authenticateAsync({ promptMessage, disableDeviceFallback: false });
  return result.success;
}
