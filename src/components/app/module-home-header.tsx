import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { NotificationSettingsModal } from "@/src/components/app/notification-settings-modal";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueToTint, type ToolHue } from "@/src/features/mindfulness/exercise-hue";
import { fieldGradient } from "@/src/lib/module-room";
import type { NotificationTargetKey } from "@/src/features/notifications/registry";
import { useColorSchemeName } from "@/src/lib/color-scheme";

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

const buttonStyle: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
};

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
   * "hero" (default) is the on-surface header every module renders today.
   * "field" is the Direction B full-bleed module-hue field: a hue gradient
   * painted edge to edge behind white ink, meant to sit above a ContentSheet.
   * Requires `hue`; the screen must let the header span its full width
   * (escape any horizontal content padding).
   */
  variant?: "hero" | "field";
  /**
   * The owning scroll view's contentOffset.y. When set in field mode, the
   * field gradient translates at a fraction of scroll speed so the sheet
   * rises over a background that lags it (Wave-C parallax, 0.4x - #492).
   * The gradient is oversized upward so the lag never exposes an edge.
   * Ignored under reduce-motion.
   */
  fieldParallax?: SharedValue<number>;
  /**
   * No longer used: per-page button coach marks were removed (only the home dashboard
   * keeps first-run tips now). Kept as an accepted prop so the module screens that
   * already pass it don't need to change; safe to drop in a future cleanup pass.
   */
  tourScope?: string;
}

export const PARALLAX_FACTOR = 0.4; // gradient net speed = 1 - factor = 0.6x scroll
export const PARALLAX_OVERDRAW = 160; // px the gradient extends beyond the field's top

/**
 * The field-gradient translation for a given scroll offset (#492), extracted
 * so the maths is testable outside the reanimated worklet: 0.4x the scroll,
 * never negative (overscroll bounce keeps the gradient pinned), capped at the
 * overdraw so the gradient's pre-extended top edge is never outrun, and 0
 * outright under a reduced-motion preference.
 */
export function fieldParallaxTranslateY(scrollY: number, reducedMotion: boolean): number {
  "worklet";
  if (reducedMotion) return 0;
  return Math.min(Math.max(0, scrollY) * PARALLAX_FACTOR, PARALLAX_OVERDRAW);
}

// RN-core reduce-motion read (reanimated's useReducedMotion is absent from the
// jest mock; AccessibilityInfo works on native AND web, where it reads the
// prefers-reduced-motion media query).
function useReduceMotionPreference() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(Boolean(value));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) =>
      setReduced(Boolean(value)),
    );
    return () => {
      live = false;
      subscription?.remove();
    };
  }, []);
  return reduced;
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
  variant = "hero",
  fieldParallax,
}: ModuleHomeHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const isDark = useColorSchemeName() === "dark";

  const notificationsAction = actions.find(
    (a): a is NotificationsAction => a.type === "notifications",
  );

  function handleActionPress(action: HeaderAction) {
    if (action.type === "notifications") {
      setShowNotifications(true);
    } else {
      action.onPress();
    }
  }

  const fieldMode = variant === "field" && hue != null;

  // A reduced-motion preference pins the gradient still (#492).
  const reducedMotion = useReduceMotionPreference();
  const parallaxStyle = useAnimatedStyle(() => {
    if (fieldParallax === undefined) return { transform: [{ translateY: 0 }] };
    return {
      transform: [{ translateY: fieldParallaxTranslateY(fieldParallax.value, reducedMotion) }],
    };
  });
  const heroMode = hue != null && icon != null;

  const actionsRow =
    actions.length > 0 || addWidgetCategory ? (
      <View className="flex-row items-center gap-3">
        {actions.map((action) => (
          <ActionButton
            key={action.type}
            action={action}
            onField={fieldMode}
            onPress={() => handleActionPress(action)}
          />
        ))}
        {addWidgetCategory ? (
          <AddToHomeButton
            category={addWidgetCategory}
            iconClassName={fieldMode ? "text-white/[0.88]" : "text-muted-foreground"}
          />
        ) : null}
      </View>
    ) : null;

  const notificationsModal = notificationsAction ? (
    <NotificationSettingsModal
      targetKey={notificationsAction.targetKey}
      visible={showNotifications}
      onDismiss={() => setShowNotifications(false)}
    />
  ) : null;

  if (fieldMode) {
    return (
      <View className="relative overflow-hidden px-5 pb-10 pt-4">
        <Animated.View
          style={[StyleSheet.absoluteFill, { top: -PARALLAX_OVERDRAW }, parallaxStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            testID="module-field-gradient"
            colors={fieldGradient(hue, isDark)}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.08, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </Animated.View>
        {notificationsModal}
        <View className="flex-row items-center gap-2">
          <View className="flex-1">
            <ScreenBreadcrumb tone="onField" />
          </View>
          {actionsRow}
        </View>
        <View className="mt-3">
          {moduleLabel !== null ? (
            <View className="mb-3 flex-row items-center gap-2">
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1">
                {icon ? <Icon name={icon} size={14} className="text-white" /> : null}
                <Text className="text-xs font-semibold text-white">{moduleLabel ?? title}</Text>
              </View>
            </View>
          ) : null}
          <Text
            variant="h1"
            className="text-[32px] font-extrabold leading-[1.1] tracking-tight text-white"
          >
            {title}
          </Text>
          {description ? (
            <Text className="mt-2 max-w-[62ch] text-[15px] leading-[1.55] text-white/[0.88]">
              {description}
            </Text>
          ) : null}
          {meta ? (
            typeof meta === "string" ? (
              <Text className="mt-4 text-xs text-white/[0.88]">{meta}</Text>
            ) : (
              <View className="mt-4">{meta}</View>
            )
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className={heroMode ? "gap-3" : "gap-1"}>
      {notificationsModal}
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

interface ActionButtonProps {
  action: HeaderAction;
  onPress: () => void;
  /** White ink for the field header variant. */
  onField?: boolean;
}

function ActionButton({ action, onPress, onField }: ActionButtonProps) {
  const { t } = useTranslation("navigation");
  const label = action.accessibilityLabel ?? t(`headerButton.${action.type}`);
  const iconClass = onField
    ? "text-white/[0.88]"
    : action.type === "program"
      ? "text-act"
      : "text-muted-foreground";
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={buttonStyle}
    >
      <Icon name={ICON_FOR_TYPE[action.type]} size={20} className={iconClass} />
    </Pressable>
  );
}
