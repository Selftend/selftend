import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "nativewind";

import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { NotificationSettingsModal } from "@/src/components/app/notification-settings-modal";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueToTint, type ToolHue } from "@/src/features/mindfulness/exercise-hue";
import { useUpdateShownButtonTours, useUserPreferences } from "@/src/features/settings/queries";
import type { ButtonTourKey } from "@/src/features/modules/types";
import type { NotificationTargetKey } from "@/src/features/notifications/registry";
import { useSession } from "@/src/providers/session-provider";

export type TuneAction = { type: "tune"; onPress: () => void; accessibilityLabel?: string };
export type NotificationsAction = {
  type: "notifications";
  targetKey: NotificationTargetKey;
  accessibilityLabel?: string;
};
export type InfoAction = { type: "info"; onPress: () => void; accessibilityLabel?: string };
export type ProgramAction = { type: "program"; onPress: () => void; accessibilityLabel?: string };
export type HeaderAction = TuneAction | NotificationsAction | InfoAction | ProgramAction;

const ICON_FOR_TYPE = {
  tune: "tune",
  notifications: "notifications",
  program: "flag",
  info: "help-outline",
} as const;

const TOURABLE_ACTION_TYPES = ["tune", "notifications", "program", "info"] as const;

function isTourableActionType(value: HeaderAction["type"]): value is ButtonTourKey {
  return (TOURABLE_ACTION_TYPES as readonly string[]).includes(value);
}

// hsl(260, 18%, 13%) dark card, hsl(260, 28%, 99%) light card from global.css.
const CARD_COLOR = { dark: "#1f1b27", light: "#fdfcfe" } as const;

const CIRCLE_RADIUS = 16;
const CIRCLE_DIAMETER = CIRCLE_RADIUS * 2;
const OVERLAY_COLOR = "rgba(0, 0, 0, 0.65)";
const HIGHLIGHT_BORDER_COLOR = "rgba(255,255,255,0.75)";
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_MARGIN = 16;

const buttonStyle: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
};

const tooltipActionsStyle: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
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
  /** Short chip label (e.g. "CBT"). Defaults to title. */
  moduleLabel?: string;
  /** When set, shows an "add to home" button (dropdown of this category's widgets) in the actions row. */
  addWidgetCategory?: string;
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
}: ModuleHomeHeaderProps) {
  const { colorScheme } = useColorScheme();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: preferences } = useUserPreferences(userId);
  const updateShownButtonTours = useUpdateShownButtonTours(userId);
  const { width: screenWidth } = useWindowDimensions();

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
    .map((actionType) => ({ actionType, storageKey: actionType }));
  const tourQueue = preferences
    ? tourableActions.filter(({ storageKey }) => !preferences.shownButtonTours.includes(storageKey))
    : [];
  const currentTour = tourQueue[0] ?? null;
  const currentTourActionType = currentTour?.actionType ?? null;
  const currentTourStorageKey = currentTour?.storageKey ?? null;

  useEffect(() => {
    if (!currentTourActionType || !isFocused) {
      setButtonRect(null);
      return;
    }
    if (process.env.NODE_ENV === "test") {
      setButtonRect({ x: 0, y: 0, width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER });
      return;
    }
    const viewRef = buttonViewRefs.current.get(currentTourActionType);
    if (!viewRef) return;

    function measure() {
      if (!viewRef) return;
      if (Platform.OS === "web") {
        const el = viewRef as unknown as HTMLElement;
        const rect = el.getBoundingClientRect();
        setButtonRect({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
      } else {
        if (typeof viewRef.measureInWindow !== "function") {
          setButtonRect({ x: 0, y: 0, width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER });
          return;
        }

        viewRef.measureInWindow((x, y, width, height) => {
          setButtonRect({ x, y, width, height });
        });
      }
    }

    const timeout = setTimeout(measure, 150);

    if (Platform.OS === "web") {
      window.addEventListener("resize", measure, { passive: true });
      return () => {
        clearTimeout(timeout);
        window.removeEventListener("resize", measure);
      };
    }

    return () => clearTimeout(timeout);
  }, [currentTourActionType, isFocused]);

  async function dismissTour() {
    if (!preferences || !currentTourStorageKey || updateShownButtonTours.isPending) return;
    await updateShownButtonTours.mutateAsync([
      ...new Set([...preferences.shownButtonTours, currentTourStorageKey]),
    ]);
  }

  async function dismissAllTours() {
    if (!preferences || updateShownButtonTours.isPending) return;
    await updateShownButtonTours.mutateAsync([
      ...new Set([
        ...preferences.shownButtonTours,
        ...tourableActions.map(({ storageKey }) => storageKey),
      ]),
    ]);
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

  const setActionRef = (key: ButtonTourKey, ref: View | null) => {
    if (ref) {
      buttonViewRefs.current.set(key, ref);
      return;
    }
    buttonViewRefs.current.delete(key);
  };

  const heroMode = hue != null && icon != null;

  const actionsRow =
    actions.length > 0 || addWidgetCategory ? (
      <View className="flex-row items-center gap-3">
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
          buttonRect={buttonRect}
          tourKey={currentTourActionType}
          isPending={updateShownButtonTours.isPending}
          cardColor={CARD_COLOR[colorScheme ?? "dark"]}
          screenWidth={screenWidth}
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
            <View className="flex-row items-center gap-2 mb-3">
              <Badge variant="tint" tint={hueToTint(hue)} icon={icon}>
                <Text>{moduleLabel ?? title}</Text>
              </Badge>
            </View>
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

function TourOverlay({
  buttonRect,
  tourKey,
  isPending,
  cardColor,
  screenWidth,
  onDismiss,
  onDismissAll,
}: {
  buttonRect: ButtonRect;
  tourKey: ButtonTourKey;
  isPending: boolean;
  cardColor: string;
  screenWidth: number;
  onDismiss: () => void;
  onDismissAll: () => void;
}) {
  const { t } = useTranslation("navigation");
  const centerX = buttonRect.x + buttonRect.width / 2;
  const centerY = buttonRect.y + buttonRect.height / 2;
  const circleLeft = centerX - CIRCLE_RADIUS;
  const circleTop = centerY - CIRCLE_RADIUS;

  const tooltipWidth = Math.min(screenWidth - TOOLTIP_MARGIN * 2, TOOLTIP_MAX_WIDTH);
  const tooltipLeft = Math.min(
    Math.max(TOOLTIP_MARGIN, centerX - tooltipWidth / 2),
    screenWidth - tooltipWidth - TOOLTIP_MARGIN,
  );
  const tooltipTop = circleTop + CIRCLE_DIAMETER + 14;
  const arrowLeft = Math.max(12, Math.min(centerX - tooltipLeft - 7, tooltipWidth - 26));

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={{ flex: 1 }}>
        {Platform.OS === "web" ? (
          <View style={getWebHighlightStyle(circleTop, circleLeft)} />
        ) : (
          <NativeHighlight circleTop={circleTop} circleLeft={circleLeft} />
        )}

        <View
          style={{
            position: "absolute",
            top: tooltipTop,
            left: tooltipLeft,
            width: tooltipWidth,
            backgroundColor: cardColor,
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 10,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -7,
              left: arrowLeft,
              width: 14,
              height: 14,
              backgroundColor: cardColor,
              transform: [{ rotate: "45deg" }],
            }}
          />
          <Text variant="muted" className="text-xs leading-5 mb-3">
            {t(`headerTour.${tourKey}.description`)}
          </Text>
          <View style={tooltipActionsStyle}>
            <Pressable
              accessibilityLabel={t("headerTour.skipAll")}
              accessibilityRole="button"
              disabled={isPending}
              hitSlop={8}
              onPress={onDismissAll}
            >
              <Text className="text-muted-foreground text-xs">{t("headerTour.skipAll")}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t(`headerTour.${tourKey}.dismiss`)}
              accessibilityRole="button"
              disabled={isPending}
              hitSlop={8}
              onPress={onDismiss}
            >
              <Text className="text-primary text-xs font-semibold">
                {t(`headerTour.${tourKey}.dismiss`)}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getCircleStyle(top: number, left: number): ViewStyle {
  return {
    position: "absolute",
    top,
    left,
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 2,
    borderColor: HIGHLIGHT_BORDER_COLOR,
  };
}

function getOverlayStyle(style: ViewStyle): ViewStyle {
  return {
    position: "absolute",
    backgroundColor: OVERLAY_COLOR,
    ...style,
  };
}

function getWebHighlightStyle(top: number, left: number): ViewStyle & { boxShadow: string } {
  return {
    ...getCircleStyle(top, left),
    boxShadow: `0 0 0 9999px ${OVERLAY_COLOR}`,
  };
}

function NativeHighlight({ circleTop, circleLeft }: { circleTop: number; circleLeft: number }) {
  return (
    <>
      <View
        style={getOverlayStyle({ top: 0, left: 0, right: 0, height: Math.max(0, circleTop) })}
      />
      <View
        style={getOverlayStyle({
          top: circleTop,
          left: 0,
          width: Math.max(0, circleLeft),
          height: CIRCLE_DIAMETER,
        })}
      />
      <View
        style={getOverlayStyle({
          top: circleTop,
          left: circleLeft + CIRCLE_DIAMETER,
          right: 0,
          height: CIRCLE_DIAMETER,
        })}
      />
      <View
        style={getOverlayStyle({
          top: circleTop + CIRCLE_DIAMETER,
          left: 0,
          right: 0,
          bottom: 0,
        })}
      />
      <View style={getCircleStyle(circleTop, circleLeft)} />
    </>
  );
}
