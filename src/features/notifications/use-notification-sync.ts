import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import type { UserPreferences } from "@/src/features/modules/types";
import { NOTIFICATION_TARGETS, readEnabled } from "@/src/features/notifications/registry";
import {
  cancelAllReminders,
  clearLegacyLocalReminders,
  scheduleReminder,
} from "@/src/lib/notifications";

function anyReminderEnabled(prefs: UserPreferences): boolean {
  if (!prefs.notificationsEnabledGlobal) return false;
  return NOTIFICATION_TARGETS.some(
    (target) => target.status === "live" && target.schedulesOs && readEnabled(prefs, target),
  );
}

/**
 * Keeps this device's reminder channel in sync with preferences. Delivery is server-driven
 * (the edge function reads user_preferences), so the client only ensures the channel is
 * registered when reminders are on and disabled when the global master is off — plus a one-time
 * cleanup of any local notifications scheduled by the pre-push build.
 */
export function useNotificationSync(
  userId: string | null,
  preferences: UserPreferences | undefined,
) {
  const cleanedUp = useRef(false);
  const prefsRef = useRef(preferences);
  const uidRef = useRef(userId);
  prefsRef.current = preferences;
  uidRef.current = userId;

  useEffect(() => {
    if (Platform.OS === "web" || !preferences || !userId) return;

    async function sync() {
      const prefs = prefsRef.current;
      const uid = uidRef.current;
      if (!prefs || !uid) return;

      try {
        if (!cleanedUp.current) {
          cleanedUp.current = true;
          await clearLegacyLocalReminders();
        }

        if (anyReminderEnabled(prefs)) {
          // Native is server-driven: this just ensures the device push token is registered.
          // The target/hour/minute args are ignored on native.
          await scheduleReminder("cbt", 0, 0, uid);
        } else if (!prefs.notificationsEnabledGlobal) {
          await cancelAllReminders(uid);
        }
      } catch {
        // Best-effort background reconciliation.
      }
    }

    void sync();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void sync();
    });

    return () => subscription.remove();
  }, [preferences, userId]);
}
