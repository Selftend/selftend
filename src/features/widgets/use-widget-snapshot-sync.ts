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

  const moodLogs = useMoodLogs(userId, 30).data;
  const sleepLogs = useSleepLogs(userId, 30).data;
  const meditationSessions = useMeditationSessions(userId).data;
  const activities = useActivities(userId).data;
  const gratitudeEntries = useGratitudeEntries(userId, 500).data;
  const journalEntries = useJournalEntries(userId).data;
  const groundingSessions = useGroundingSessions(userId).data;
  const breathingSessions = useBreathingSessions(userId).data;
  const committedActions = useCommittedActions(userId, "active").data;
  const actionSteps = useAllActionSteps(userId).data;
  const defusionLogs = useDefusionLogs(userId, 30).data;

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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requestWidgetUpdate } = require("react-native-android-widget");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { renderWidget } = require("@/src/features/widgets/render-widget");

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
            renderWidget: (info: { widgetName: string; width: number; height: number }) =>
              renderWidget({
                widgetName: info.widgetName,
                width: info.width,
                height: info.height,
                snapshot: next,
                shortcuts: null,
              }),
            widgetNotFound: () => {},
          }).catch(() => {}),
        ),
      );
    }

    void sync();
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
