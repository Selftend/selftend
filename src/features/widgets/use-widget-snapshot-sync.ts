import { useEffect, useMemo, useRef } from "react";
import { AppState, Platform } from "react-native";
import { useTranslation } from "react-i18next";

import { currentDateKey } from "@/src/utils/date";
import { useMoodLogs } from "@/src/features/mood/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useMeditationSessions } from "@/src/features/meditation/queries";
import { useActivities } from "@/src/features/activities/queries";
import { useGratitudeEntries } from "@/src/features/gratitude/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { useGroundingSessions } from "@/src/features/grounding/queries";
import { useBreathingSessions } from "@/src/features/breathing/queries";
import {
  useCommittedActions,
  useAllActionSteps,
  useDefusionLogs,
} from "@/src/features/act/queries";

import { useThemeStore } from "@/src/stores/theme-store";
import { buildSnapshot, buildSignedOutSnapshot } from "@/src/features/widgets/snapshot-builder";
import { writeSnapshot } from "@/src/features/widgets/snapshot-store";
import { changedWidgetIds } from "@/src/features/widgets/diff-snapshots";
import { WIDGET_CATALOG } from "@/src/features/widgets/widget-catalog";
import type { Snapshot, WidgetData } from "@/src/features/widgets/snapshot-types";

/** Reuses the SAME data hooks the in-app widgets use; assembles the snapshot and pushes updates.
 *  Native widget APIs are loaded lazily behind a Platform guard so the web/iOS bundles stay clean. */
export function useWidgetSnapshotSync(userId: string | null) {
  const { t, i18n } = useTranslation("navigation");
  const { t: ta } = useTranslation("act");
  const themePref = useThemeStore((s) => s.preference);

  // The widget snapshot sync only does anything on Android (the effect below early-returns
  // elsewhere), yet this hook is mounted unconditionally in the protected layout - so on
  // iOS and web these 11 list queries were subscribed, fetched, and re-fetched on every
  // foreground for data that is never used (#61). Disable them off-Android by passing a null
  // userId (each hook is `enabled: Boolean(userId)`). NOTE: the remaining Android-only win -
  // also disabling these when the user has placed NO launcher widget - needs a persisted
  // has-launcher-widgets flag driven by the widget-task-handler's add/delete events and must
  // be validated on-device; left as a follow-up rather than guessed at blind.
  const widgetUserId = Platform.OS === "android" ? userId : null;

  const moodLogs = useMoodLogs(widgetUserId, 30).data;
  const sleepLogs = useSleepLogs(widgetUserId, 30).data;
  const meditationSessions = useMeditationSessions(widgetUserId).data;
  const activities = useActivities(widgetUserId).data;
  const gratitudeEntries = useGratitudeEntries(widgetUserId, 500).data;
  const journalEntries = useJournalEntries(widgetUserId).data;
  const groundingSessions = useGroundingSessions(widgetUserId).data;
  const breathingSessions = useBreathingSessions(widgetUserId).data;
  const committedActions = useCommittedActions(widgetUserId, "active").data;
  const actionSteps = useAllActionSteps(widgetUserId).data;
  const defusionLogs = useDefusionLogs(widgetUserId, 30).data;

  const data: WidgetData = useMemo(
    () => ({
      moodLogs: moodLogs ?? [],
      sleepLogs: sleepLogs ?? [],
      meditationSessions: meditationSessions ?? [],
      activities: activities ?? [],
      gratitudeEntries: gratitudeEntries ?? [],
      journalEntries: journalEntries ?? [],
      groundingSessions: groundingSessions ?? [],
      breathingSessions: breathingSessions ?? [],
      committedActions: committedActions ?? [],
      actionSteps: actionSteps ?? [],
      defusionLogs: defusionLogs ?? [],
    }),
    [
      moodLogs,
      sleepLogs,
      meditationSessions,
      activities,
      gratitudeEntries,
      journalEntries,
      groundingSessions,
      breathingSessions,
      committedActions,
      actionSteps,
      defusionLogs,
    ],
  );

  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    let cancelled = false;

    async function sync() {
      const { requestWidgetUpdate } =
        require("react-native-android-widget") as typeof import("react-native-android-widget");
      // Cast the dynamic requires to their real module types so tsc type-checks the
      // renderWidget(...) call shape - this is what catches a wrong/stale arg (the
      // original bug passed a nonexistent `shortcuts` and omitted the required `config`).

      const { renderWidget } =
        require("@/src/features/widgets/render-widget") as typeof import("@/src/features/widgets/render-widget");

      const { readConfig } =
        require("@/src/features/widgets/widget-config-store") as typeof import("@/src/features/widgets/widget-config-store");

      const next = userId
        ? buildSnapshot(data, {
            t,
            ta,
            locale: i18n.language,
            dateKey: currentDateKey(),
            appThemePref: themePref,
          })
        : buildSignedOutSnapshot(i18n.language, currentDateKey(), themePref);

      const changed = changedWidgetIds(prevRef.current, next);
      await writeSnapshot(next);
      prevRef.current = next;
      if (cancelled) return;

      const changedNames = WIDGET_CATALOG.filter((w) => changed.includes(w.id)).map((w) => w.name);
      const namesToUpdate = userId ? changedNames : WIDGET_CATALOG.map((w) => w.name);
      await Promise.all(
        namesToUpdate.map((widgetName: string) =>
          requestWidgetUpdate({
            widgetName,
            // Read each instance's saved config (theme/opacity/shortcuts/statKeys) and pass
            // it through, exactly like the OS task-handler path. Passing the wrong key here
            // left `config` undefined, so render-widget fell back to DEFAULT_CONFIG and wiped
            // the user's per-widget customization on every in-app data sync.
            renderWidget: async (info) =>
              renderWidget({
                widgetName: info.widgetName,
                width: info.width,
                height: info.height,
                snapshot: next,
                config: await readConfig(info.widgetId),
              }),
            widgetNotFound: () => {},
          }).catch(() => {}),
        ),
      );
    }

    // Snapshot build / writeSnapshot can throw; swallow so a sync failure never becomes
    // an unhandled rejection (the per-widget requestWidgetUpdate calls are already guarded).
    void sync().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data, userId, i18n.language, t, ta, themePref]);

  // On app foreground, force a full refresh on the next data tick (also handles midnight rollover).
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") prevRef.current = null;
    });
    return () => sub.remove();
  }, []);
}
