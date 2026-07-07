import { Linking, Platform } from "react-native";

/**
 * Open an external URL with the right mechanism per platform.
 * Web: new tab with noopener (matches the previous inline pattern in user-menu).
 * Native: fire-and-forget Linking.openURL; rejections (no handler for the
 * scheme) are logged, never thrown — an external link must not crash the app.
 */
export function openExternalUrl(url: string): void {
  if (!url) return;

  if (Platform.OS === "web") {
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  Linking.openURL(url).catch((error: unknown) => {
    console.warn(`[linking] Failed to open URL: ${url}`, error);
  });
}
