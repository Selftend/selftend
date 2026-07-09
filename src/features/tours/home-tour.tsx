import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Platform } from "react-native";
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
  { storageKey: "home:checkin", targetKey: "home-checkin", i18nKey: "checkin" },
  { storageKey: "home:edit", targetKey: "home-edit", i18nKey: "edit" },
  { storageKey: "home:navigation", targetKey: "home-navigation", i18nKey: "navigation" },
] as const;

const ALL_HOME_KEYS = HOME_TOUR_STOPS.map((s) => s.storageKey);

export function HomeTour(): React.JSX.Element | null {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
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
  const queue = preferences?.appOnboardingCompleted
    ? HOME_TOUR_STOPS.filter(
        (stop) => !shown.includes(stop.storageKey) && getTourTarget(stop.targetKey) !== null,
      )
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

  useEffect(() => {
    setTargetRect(null);
    if (!current) return;
    if (process.env.NODE_ENV === "test") {
      measure();
      return;
    }
    // Same settle-point strategy as module-home-header: layout shifts after first paint.
    const timers = [setTimeout(measure, 150), setTimeout(measure, 450), setTimeout(measure, 900)];
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
      skipAllLabel={t("headerTour.skipAll")}
      isPending={updateShownButtonTours.isPending}
      onDismiss={() => void dismiss([current.storageKey])}
      onDismissAll={() => void dismiss(ALL_HOME_KEYS)}
    />
  );
}
