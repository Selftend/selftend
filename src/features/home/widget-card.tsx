import { Pressable, View } from "react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeIn,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { cn } from "@/lib/utils";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface WidgetCardProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  children: React.ReactNode;
  editMode: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  title: string;
}

export function WidgetCard({
  canMoveDown,
  canMoveUp,
  children,
  editMode,
  onMoveDown,
  onMoveUp,
  onRemove,
  title,
}: WidgetCardProps) {
  const { t } = useTranslation("navigation");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIndex.value,
  }));

  useEffect(() => {
    if (reduceMotionEnabled) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 180 });
    zIndex.value = 0;
  }, [reduceMotionEnabled, scale, zIndex]);

  function animateRemove() {
    if (reduceMotionEnabled) {
      onRemove();
      return;
    }

    translateX.value = withTiming(420, { duration: 220 });
    opacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(onRemove)();
      }
    });
  }

  function animateMove(callback: () => void) {
    if (reduceMotionEnabled) {
      callback();
      return;
    }

    scale.value = withSequence(
      withTiming(0.96, { duration: 80 }),
      withSpring(1, { damping: 18, stiffness: 180 }),
    );
    callback();
  }

  return (
    <Animated.View
      className={editMode ? "pr-9" : undefined}
      entering={reduceMotionEnabled ? undefined : FadeIn.duration(160)}
      layout={
        reduceMotionEnabled ? undefined : LinearTransition.springify().damping(18).stiffness(180)
      }
      style={animatedStyle}
    >
      {children}
      {editMode ? (
        <View className="absolute -right-3 top-2 gap-1">
          <WidgetBadge
            accessibilityLabel={t("today.dashboard.removeWidget", { title })}
            icon="close"
            onPress={animateRemove}
            reduceMotionEnabled={reduceMotionEnabled}
            tone="destructive"
          />
          <WidgetBadge
            accessibilityLabel={t("today.dashboard.moveWidgetUp", { title })}
            disabled={!canMoveUp}
            icon="keyboard-arrow-up"
            onPress={() => animateMove(onMoveUp)}
            reduceMotionEnabled={reduceMotionEnabled}
          />
          <WidgetBadge
            accessibilityLabel={t("today.dashboard.moveWidgetDown", { title })}
            disabled={!canMoveDown}
            icon="keyboard-arrow-down"
            onPress={() => animateMove(onMoveDown)}
            reduceMotionEnabled={reduceMotionEnabled}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

interface WidgetBadgeProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: Parameters<typeof Icon>[0]["name"];
  onPress: () => void;
  reduceMotionEnabled: boolean;
  tone?: "default" | "destructive";
}

function WidgetBadge({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  reduceMotionEnabled,
  tone = "default",
}: WidgetBadgeProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    if (!reduceMotionEnabled) {
      scale.value = withSequence(
        withTiming(0.82, { duration: 70 }),
        withSpring(1, { damping: 18, stiffness: 180 }),
      );
    }
    onPress();
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={handlePress}
        className={cn(
          "size-7 items-center justify-center rounded-full border border-background shadow-sm",
          tone === "destructive" ? "bg-destructive" : "bg-muted",
          disabled && "opacity-40",
        )}
      >
        <Icon
          name={icon}
          className={cn("size-4", tone === "destructive" ? "text-white" : "text-muted-foreground")}
          size={16}
        />
      </Pressable>
    </Animated.View>
  );
}
