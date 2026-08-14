import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  getTourTarget,
  getTourTargetVersion,
  subscribeTourTargets,
} from "@/src/features/tours/tour-targets";
import { TourOverlay, type TourTargetRect } from "@/src/features/tours/tour-overlay";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

// Stop order = visual priority. targetKey is the registry key components register
// under; storageKey is what lands in shown_button_tours.
const HOME_TOUR_STOPS = [
  { storageKey: "home:edit", targetKey: "home-edit", i18nKey: "edit" },
  { storageKey: "home:navigation", targetKey: "home-navigation", i18nKey: "navigation" },
] as const;

const ALL_HOME_KEYS = HOME_TOUR_STOPS.map((s) => s.storageKey);

/**
 * The stops whose target is currently registered.
 *
 * `version` is a real argument rather than decoration. `getTourTarget` reads a module-level
 * store the React Compiler cannot see into, so a filter written inline in the component
 * gets memoized on the reactive values it happens to mention - `preferences` and
 * `pathname` - and then never re-runs when a target registers LATE. That was harmless
 * while every home target mounted on the first render; #979 made home's edit cluster mount
 * only after the widget query settles, and the tip froze on the next stop in the queue.
 *
 * Naming the version here puts it in the memo key, which is the whole point. The bug is
 * invisible to jest, where the compiler never runs - the e2e is what caught it.
 */
function registeredStops(version: number) {
  void version;
  return HOME_TOUR_STOPS.filter((stop) => getTourTarget(stop.targetKey) !== null);
}

export function HomeTour(): React.JSX.Element | null {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const pathname = usePathname();
  const userId = user?.id ?? null;
  const { data: preferences } = useUserPreferences(userId);
  const updateShownButtonTours = useUpdateShownButtonTours(userId);
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);

  // Re-evaluate when targets register/unregister (e.g. hamburger mounts late).
  const registryVersion = useSyncExternalStore(
    subscribeTourTargets,
    () => getTourTargetVersion(),
    () => 0,
  );

  const shown = preferences?.shownButtonTours ?? [];
  const queue =
    preferences?.appOnboardingCompleted && pathname === "/"
      ? registeredStops(registryVersion).filter((stop) => !shown.includes(stop.storageKey))
      : [];
  const current = queue[0] ?? null;

  const measure = useCallback(() => {
    if (!current) return;
    if (process.env.NODE_ENV === "test") {
      setTargetRect({ x: 0, y: 0, width: 32, height: 32 });
      return;
    }
    const viewRef = getTourTarget(current.targetKey);
    if (!viewRef) return;
    if (Platform.OS === "web") {
      const el = viewRef as unknown as HTMLElement;
      const rect = el.getBoundingClientRect?.();
      if (rect)
        setTargetRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    } else if (typeof (viewRef as unknown as { measure?: unknown }).measure === "function") {
      (viewRef as unknown as { measure: (...args: unknown[]) => void }).measure(
        (_x: unknown, _y: unknown, width: number, height: number, pageX: number, pageY: number) =>
          setTargetRect({ x: pageX, y: pageY, width, height }),
      );
    }
  }, [current]);

  // Drop the stale rect the moment the stop (or the target registry) changes,
  // so the spotlight never flashes on the previous stop's position while the
  // new target is measured (render-time adjustment).
  const measureKey = current ? `${current.storageKey}:${registryVersion}` : null;
  const [prevMeasureKey, setPrevMeasureKey] = useState(measureKey);
  if (measureKey !== prevMeasureKey) {
    setPrevMeasureKey(measureKey);
    setTargetRect(null);
  }

  useEffect(() => {
    if (!current) return;
    // Same settle-point strategy as module-home-header: layout shifts after
    // first paint. Tests measure on the next tick - the settle delays would
    // only slow them down.
    const timers =
      process.env.NODE_ENV === "test"
        ? [setTimeout(measure, 0)]
        : [setTimeout(measure, 150), setTimeout(measure, 450), setTimeout(measure, 900)];
    if (Platform.OS === "web") {
      window.addEventListener("resize", measure, { passive: true });
      return () => {
        timers.forEach(clearTimeout);
        window.removeEventListener("resize", measure);
      };
    }
    return () => timers.forEach(clearTimeout);
  }, [current, measure, registryVersion]);

  async function dismiss(keys: string[]) {
    if (!preferences || updateShownButtonTours.isPending) return;
    try {
      await updateShownButtonTours.mutateAsync([
        ...new Set([...preferences.shownButtonTours, ...keys]),
      ]);
    } catch {
      /* best-effort: tour shows again next time */
    }
  }

  if (!current || !targetRect) return null;

  return (
    <TourOverlay
      targetRect={targetRect}
      description={t(`homeTour.${current.i18nKey}.description`)}
      dismissLabel={t(`homeTour.${current.i18nKey}.dismiss`)}
      skipAllLabel={t("homeTour.skipAll")}
      isPending={updateShownButtonTours.isPending}
      onDismiss={() => void dismiss([current.storageKey])}
      onDismissAll={() => void dismiss(ALL_HOME_KEYS)}
    />
  );
}
