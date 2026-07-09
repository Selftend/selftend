import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { AddToHomeButton } from "@/src/components/app/add-to-home-button";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { NotificationSettingsModal } from "@/src/components/app/notification-settings-modal";
import { Badge } from "@/src/components/react-native-reusables/badge";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { hueToTint, type ToolHue } from "@/src/features/mindfulness/exercise-hue";
import type { NotificationTargetKey } from "@/src/features/notifications/registry";

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
   * No longer used: per-page button coach marks were removed (only the home dashboard
   * keeps first-run tips now). Kept as an accepted prop so the module screens that
   * already pass it don't need to change; safe to drop in a future cleanup pass.
   */
  tourScope?: string;
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
  const [showNotifications, setShowNotifications] = useState(false);

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

  const heroMode = hue != null && icon != null;

  const actionsRow =
    actions.length > 0 || addWidgetCategory ? (
      <View className="flex-row items-center gap-3">
        {actions.map((action) => (
          <ActionButton
            key={action.type}
            action={action}
            onPress={() => handleActionPress(action)}
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
}

function ActionButton({ action, onPress }: ActionButtonProps) {
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
      <Icon name={ICON_FOR_TYPE[action.type]} size={20} className={iconClass} />
    </Pressable>
  );
}
