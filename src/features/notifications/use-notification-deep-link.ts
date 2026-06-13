import { useEffect } from "react";
import { Platform } from "react-native";
import { router, type Href } from "expo-router";

import { addReminderResponseListener, getInitialReminderUrl } from "@/src/lib/notifications";

/**
 * Routes the app to a reminder's target screen when its notification is tapped — for a cold
 * launch (app opened by the tap) and for warm taps while the app runs. Native-only; web
 * reminder taps are handled by the push service worker (`public/selftend-push-worker.js`).
 */
export function useNotificationDeepLink() {
  useEffect(() => {
    if (Platform.OS === "web") return;

    let active = true;

    void getInitialReminderUrl()
      .then((url) => {
        if (active && url) router.navigate(url as Href);
      })
      .catch(() => {});

    const subscription = addReminderResponseListener((url) => {
      router.navigate(url as Href);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
