import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";

import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { NotificationSettingsModal } from "@/src/components/app/notification-settings-modal";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueToTint, type ToolHue } from "@/src/features/mindfulness/exercise-hue";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import type { ButtonTourAction } from "@/src/features/modules/types";
import type { NotificationTargetKey } from "@/src/features/notifications/registry";
import { useSession } from "@/src/providers/session-provider";
import { TourOverlay } from "@/src/features/tours/tour-overlay";

type TuneAction = { type: "tune"; onPress: () => void; accessibilityLabel?: string };
type NotificationsAction = {
  type: "notifications";
  targetKey: NotificationTargetKey;
  accessibilityLabel?: string;
};
type InfoAction = { type: "info"; onPress: () => void; accessibilityLabel?: string };
type ProgramAction = { type: "program"; onPress: () => void; accessibilityLabel?: string };
type HeaderAction = TuneAction | NotificationsAction | InfoAction | ProgramAction;

const ICON_FOR_TYPE = {
  tune: "tune",
  notifications: "notifications",
  program: "flag",
  info: "help-outline",
} as const;

const TOURABLE_ACTION_TYPES = ["tune", "notifications", "program", "info"] as const;

function isTourableActionType(value: HeaderAction["type"]): value is ButtonTourAction {
  return (TOURABLE_ACTION_TYPES as readonly string[]).includes(value);
}

// Fallback measured size when real measurement is unavailable: matches the 20px
// header icon, so the padded spotlight stays the intended 32px circle.
const MEASURE_FALLBACK_SIZE = 20;

const buttonStyle: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
};

interface ButtonRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ModuleHomeHeaderProps {
  title: string;
  actions?: readonly HeaderAction[];
  hue?: ToolHue;
  icon?: MaterialIconName;
  description?: string;
  meta?: ReactNode;
  /** Short chip label (e.g. "CBT"). Defaults to title. Pass `null` to omit the chip entirely. */
  moduleLabel?: string | null;
  /** When set, shows an "add to home" button (dropdown of this category's widgets) in the actions row. */
  addWidgetCategory?: string;
  /**
   * Screen scope for button-tip storage keys (e.g. "cbt").
   * Used as a legacy-read-only prefix: the filter still checks "cbt:info" so old
   * per-screen dismissals grandfather correctly. New dismissals write the bare
   * action type ("info") so they suppress the tip app-wide.
   */
  tourScope: string;
}

export function ModuleHomeHeader({
  title,
  actions = [],
  hue,
  icon,
  description,
  meta,
  moduleLabel,
  addWidgetCategory,
  tourScope,
}: ModuleHomeHeaderProps) {
  const { t } = useTranslation("navigation");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: preferences } = useUserPreferences(userId);
  const updateShownButtonTours = useUpdateShownButtonTours(userId);

  const [showNotifications, setShowNotifications] = useState(false);
  const [buttonRect, setButtonRect] = useState<ButtonRect | null>(null);
  const [isFocused, setIsFocused] = useState(true);

  const buttonViewRefs = useRef<Map<string, View | null>>(new Map());

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setButtonRect(null);
      };
    }, []),
  );

  const notificationsAction = actions.find(
    (a): a is NotificationsAction => a.type === "notifications",
  );

  const tourableActions = actions
    .map((action) => action.type)
    .filter(isTourableActionType)
    .map((actionType) => ({ actionType, storageKey: `${tourScope}:${actionType}` }));
  const tourQueue = preferences
    ? tourableActions.filter(
        ({ actionType, storageKey }) =>
          !preferences.shownButtonTours.includes(storageKey) &&
          // Legacy bare keys (pre-scoping) count as seen everywhere.
          !preferences.shownButtonTours.includes(actionType),
      )
    : [];
  const currentTour = tourQueue[0] ?? null;
  const currentTourActionType = currentTour?.actionType ?? null;

  // Measure the active tour button in window coords so the spotlight lands on it. The equality
  // guard makes redundant re-measures (from onLayout below) cheap and loop-free.
  const measureCurrentTourButton = useCallback(() => {
    if (!currentTourActionType || !isFocused) return;
    if (process.env.NODE_ENV === "test") {
      setButtonRect({ x: 0, y: 0, width: MEASURE_FALLBACK_SIZE, height: MEASURE_FALLBACK_SIZE });
      return;
    }
    const viewRef = buttonViewRefs.current.get(currentTourActionType);
    if (!viewRef) return;

    const apply = (rect: ButtonRect) =>
      setButtonRect((prev) =>
        prev &&
        prev.x === rect.x &&
        prev.y === rect.y &&
        prev.width === rect.width &&
        prev.height === rect.height
          ? prev
          : rect,
      );

    if (Platform.OS === "web") {
      const el = viewRef as unknown as HTMLElement;
      const rect = el.getBoundingClientRect?.();
      if (rect) apply({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
    } else if (typeof viewRef.measure === "function") {
      // measure() yields pageX/pageY in the app-window coordinate space - the SAME space the
      // Portal overlay renders into. (measureInWindow + a separate Modal window displaced the
      // spotlight on Android.)
      viewRef.measure((_x, _y, width, height, pageX, pageY) =>
        apply({ x: pageX, y: pageY, width, height }),
      );
    } else {
      apply({ x: 0, y: 0, width: MEASURE_FALLBACK_SIZE, height: MEASURE_FALLBACK_SIZE });
    }
  }, [currentTourActionType, isFocused]);

  useEffect(() => {
    if (!currentTourActionType || !isFocused) {
      setButtonRect(null);
      return;
    }
    if (process.env.NODE_ENV === "test") {
      measureCurrentTourButton();
      return;
    }
    // A single early measure caught a STALE position on Android: the flex breadcrumb sizes
    // after first paint and pushes the actions row right, so the one-shot rect placed the
    // spotlight left of (and below) the real button. Re-measure across a few settle points
    // (and on every actions-row onLayout / web resize) until the layout stabilises.
    const timers = [
      setTimeout(measureCurrentTourButton, 150),
      setTimeout(measureCurrentTourButton, 450),
      setTimeout(measureCurrentTourButton, 900),
    ];
    if (Platform.OS === "web") {
      window.addEventListener("resize", measureCurrentTourButton, { passive: true });
      return () => {
        timers.forEach(clearTimeout);
        window.removeEventListener("resize", measureCurrentTourButton);
      };
    }
    return () => timers.forEach(clearTimeout);
  }, [currentTourActionType, isFocused, measureCurrentTourButton]);

  // Persisting "tour seen" is best-effort; a failed write must not become an unhandled
  // rejection (the tour simply shows again next time).
  // Writes the bare action type (e.g. "notifications") so the dismissal applies
  // app-wide across all module/tool screens.
  async function dismissTour() {
    if (!preferences || !currentTourActionType || updateShownButtonTours.isPending) return;
    try {
      await updateShownButtonTours.mutateAsync([
        ...new Set([...preferences.shownButtonTours, currentTourActionType]),
      ]);
    } catch {
      /* best-effort */
    }
  }

  async function dismissAllTours() {
    if (!preferences || updateShownButtonTours.isPending) return;
    try {
      await updateShownButtonTours.mutateAsync([
        ...new Set([
          ...preferences.shownButtonTours,
          ...tourableActions.map(({ actionType }) => actionType),
        ]),
      ]);
    } catch {
      /* best-effort */
    }
  }

  function handleActionPress(action: HeaderAction) {
    if (currentTourActionType === action.type) {
      void dismissTour();
    }
    if (action.type === "notifications") {
      setShowNotifications(true);
    } else {
      action.onPress();
    }
  }

  const setActionRef = (key: ButtonTourAction, ref: View | null) => {
    if (ref) {
      buttonViewRefs.current.set(key, ref);
      return;
    }
    buttonViewRefs.current.delete(key);
  };

  const heroMode = hue != null && icon != null;

  const actionsRow =
    actions.length > 0 || addWidgetCategory ? (
      // Re-measure the tour spotlight whenever this row's frame changes (e.g. the breadcrumb
      // sizing on Android pushes it right after first paint) so the highlight tracks the button.
      <View className="flex-row items-center gap-3" onLayout={measureCurrentTourButton}>
        {actions.map((action) => (
          <TourButton
            key={action.type}
            action={action}
            onPress={() => handleActionPress(action)}
            setRef={(ref) => {
              if (isTourableActionType(action.type)) {
                setActionRef(action.type, ref);
              }
            }}
          />
        ))}
        {addWidgetCategory ? <AddToHomeButton category={addWidgetCategory} /> : null}
      </View>
    ) : null;

  return (
    <View className={heroMode ? "gap-3" : "gap-1"}>
      {notificationsAction ? (
        <NotificationSettingsModal
          targetKey={notificationsAction.targetKey}
          visible={showNotifications}
          onDismiss={() => setShowNotifications(false)}
        />
      ) : null}
      {currentTourActionType && buttonRect && isFocused ? (
        <TourOverlay
          targetRect={buttonRect}
          description={t(`headerTour.${currentTourActionType}.description`)}
          dismissLabel={t(`headerTour.${currentTourActionType}.dismiss`)}
          skipAllLabel={t("headerTour.skipAll")}
          isPending={updateShownButtonTours.isPending}
          onDismiss={() => void dismissTour()}
          onDismissAll={() => void dismissAllTours()}
        />
      ) : null}
      {heroMode ? (
        <>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <ScreenBreadcrumb />
            </View>
            {actionsRow}
          </View>
          <View className="mt-2">
            {moduleLabel !== null ? (
              <View className="flex-row items-center gap-2 mb-3">
                <Badge variant="tint" tint={hueToTint(hue)} icon={icon}>
                  <Text>{moduleLabel ?? title}</Text>
                </Badge>
              </View>
            ) : null}
            <Text variant="h1" className="text-[40px] font-extrabold leading-[1.05] tracking-tight">
              {title}
            </Text>
            {description ? (
              <Text className="mt-2.5 text-[15px] leading-[1.55] text-muted-foreground max-w-[62ch]">
                {description}
              </Text>
            ) : null}
            {meta ? (
              typeof meta === "string" ? (
                <Text className="mt-2.5 text-xs text-muted-foreground">{meta}</Text>
              ) : (
                <View className="mt-2.5">{meta}</View>
              )
            ) : null}
          </View>
        </>
      ) : (
        <>
          <ScreenBreadcrumb />
          <View className="flex-row items-center gap-2">
            <Text variant="h1" className="flex-1">
              {title}
            </Text>
            {actionsRow}
          </View>
        </>
      )}
    </View>
  );
}

interface TourButtonProps {
  action: HeaderAction;
  onPress: () => void;
  setRef: (ref: View | null) => void;
}

function TourButton({ action, onPress, setRef }: TourButtonProps) {
  const { t } = useTranslation("navigation");
  const label = action.accessibilityLabel ?? t(`headerButton.${action.type}`);
  const iconClass = action.type === "program" ? "text-act" : "text-muted-foreground";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={buttonStyle}
    >
      <View ref={setRef}>
        <Icon name={ICON_FOR_TYPE[action.type]} size={20} className={iconClass} />
      </View>
    </Pressable>
  );
}
