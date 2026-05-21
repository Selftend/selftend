import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import type { UserPreferences } from "@/src/features/modules/types";
import {
  NOTIFICATION_TARGETS,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { cancelReminder, scheduleReminder, type ReminderTarget } from "@/src/lib/notifications";

export function useNotificationSync(
  userId: string | null,
  preferences: UserPreferences | undefined,
) {
  const isSyncing = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web" || !preferences || !userId) return;

    const prefs = preferences;
    const uid = userId;

    async function sync() {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        const globalEnabled = prefs.notificationsEnabledGlobal ?? true;

        for (const target of NOTIFICATION_TARGETS) {
          if (target.status !== "live" || !target.schedulesOs) continue;

          const osTarget = target.key as ReminderTarget;
          const enabled = globalEnabled && readEnabled(prefs, target);

          if (enabled) {
            await scheduleReminder(
              osTarget,
              readHour(prefs, target),
              readMinute(prefs, target),
              uid,
            );
          } else {
            await cancelReminder(osTarget, uid);
          }
        }
      } catch {
        // Background reconciliation — silently swallow errors.
      } finally {
        isSyncing.current = false;
      }
    }

    void sync();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void sync();
    });

    return () => subscription.remove();
  }, [preferences, userId]);
}
