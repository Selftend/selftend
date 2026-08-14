import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

import {
  ensureReminderChannel,
  getReminderChannelStatus,
  peekReminderChannelStatus,
  type ReminderChannelStatus,
  type ReminderScheduleResult,
} from "@/src/lib/notifications";
import { onWindowFocus } from "@/src/lib/window-focus";

export interface ReminderChannel {
  /** What the channel can do right now, read without prompting. */
  status: ReminderChannelStatus;
  /** Registers the channel, prompting if it has to. Never called on a `granted` status. */
  ensure: () => Promise<ReminderScheduleResult>;
}

/**
 * The reminder channel as a piece of readable state, so a control knows which path it is on
 * **before** it is tapped (#981).
 *
 * Delivery is server-driven from `user_preferences`, so per-row saves never scheduled anything:
 * the permission prompt is channel-scoped and happens at most once. That makes the branch
 * knowable up front rather than discovered mid-save:
 *
 *   - `granted` - a column write is a pure column write. No channel call at all.
 *   - `prompt-needed` - the next enable is a *request*: it can be declined, so nothing is
 *     written until the channel confirms.
 *   - `blocked` / `unsupported` - the columns are still worth writing (the server reads them
 *     the moment a channel returns), and the screen says so at page level instead.
 *
 * Re-read on foreground, because permission is changed *outside* the app - in browser site
 * settings or the OS settings app - and coming back is the only moment we can notice.
 */
export function useReminderChannel(userId: string | null): ReminderChannel {
  const [status, setStatus] = useState<ReminderChannelStatus>(peekReminderChannelStatus);

  useEffect(() => {
    let active = true;
    const read = () => {
      void getReminderChannelStatus().then((next) => {
        if (active) setStatus(next);
      });
    };

    read();

    // On web this is the focus event, not a state value - see `onWindowFocus`.
    if (Platform.OS === "web") {
      const unsubscribe = onWindowFocus(read);
      return () => {
        active = false;
        unsubscribe();
      };
    }

    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") read();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const ensure = useCallback(async () => {
    const result = await ensureReminderChannel(userId);
    // Whatever the outcome, the permission state may have just changed - a granted prompt
    // makes every later row Path A, and a declined one has to reach the page-level notice.
    const next = await getReminderChannelStatus();
    setStatus(next);
    return result;
  }, [userId]);

  return { status, ensure };
}
