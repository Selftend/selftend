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
 * (the edge function reads user_preferences plus the per-routine reminder fields on the
 * routines rows), so the client only ensures the channel is registered when reminders are on
 * and disabled when the global master is off - plus a one-time cleanup of any local
 * notifications scheduled by the pre-push build.
 *
 * `anyRoutineReminderEnabled` folds the per-routine opt-ins into the "any reminder enabled"
 * condition (routine reminders live on routines rows, not in user_preferences).
 */
export function useNotificationSync(
  userId: string | null,
  preferences: UserPreferences | undefined,
  anyRoutineReminderEnabled = false,
) {
  const cleanedUp = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !preferences || !userId) return;
    // Narrowed locals (TS doesn't carry the guard into the nested closure).
    // No latest-value refs needed: every input is an effect dependency, so this
    // closure (and the AppState listener re-registered with it) is always fresh.
    const prefs = preferences;
    const uid = userId;

    async function sync() {
      try {
        if (!cleanedUp.current) {
          cleanedUp.current = true;
          await clearLegacyLocalReminders();
        }

        const routineReminderOn = prefs.notificationsEnabledGlobal && anyRoutineReminderEnabled;
        if (anyReminderEnabled(prefs) || routineReminderOn) {
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
  }, [preferences, userId, anyRoutineReminderEnabled]);
}
