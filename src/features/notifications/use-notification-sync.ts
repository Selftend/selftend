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

const REMINDER_TARGET_KEYS = new Set<string>(["cbt", "act", "meditation"]);

export function useNotificationSync(
  userId: string | null,
  preferences: UserPreferences | undefined,
) {
  const isSyncing = useRef(false);
  const pending = useRef(false);
  // Always hold the latest inputs so an in-flight sync reconciles against current values
  // instead of the stale closure captured when it started.
  const prefsRef = useRef(preferences);
  const uidRef = useRef(userId);
  prefsRef.current = preferences;
  uidRef.current = userId;

  useEffect(() => {
    if (Platform.OS === "web" || !preferences || !userId) return;

    async function sync() {
      // Coalesce concurrent requests: if a sync is already running, flag that another
      // pass is needed and let the running one repeat when it finishes — rather than
      // resetting the guard each effect re-run and racing two schedule/cancel passes.
      if (isSyncing.current) {
        pending.current = true;
        return;
      }
      isSyncing.current = true;
      try {
        do {
          pending.current = false;
          const prefs = prefsRef.current;
          const uid = uidRef.current;
          if (!prefs || !uid) break;

          const globalEnabled = prefs.notificationsEnabledGlobal;
          for (const target of NOTIFICATION_TARGETS) {
            if (target.status !== "live" || !target.schedulesOs) continue;
            if (!REMINDER_TARGET_KEYS.has(target.key)) continue;

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
        } while (pending.current);
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
