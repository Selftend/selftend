import { Pressable, View, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { CHROME_ACCENT_MARK } from "@/src/lib/theme/chrome";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { ScreenEscape } from "@/src/components/app/screen-escape";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
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

/**
 * One stat in the header's inline run: a value in the foreground ink, then a
 * muted label. Leave `value` empty for a label-only entry - that is how the
 * design renders "last logged 4:50 pm", inline with the rest rather than as a
 * separate subline (which is what the deleted `ToolStats.subline` was).
 */
export interface HeaderStat {
  value: string;
  label: string;
}

interface ModuleHomeHeaderProps {
  title: string;
  actions?: readonly HeaderAction[];
  description?: string;
  stats?: readonly HeaderStat[];
  /**
   * No longer used: per-page button coach marks were removed (only the home dashboard
   * keeps first-run tips now). Kept as an accepted prop so the module screens that
   * already pass it don't need to change; safe to drop in a future cleanup pass.
   */
  tourScope?: string;
}

/**
 * The module-home shell, shared by all ten homes - the eight tools plus ACT and
 * CBT (#733, decided on #690).
 *
 * One shape, no variant. The full-bleed hue field this replaced had no second
 * population to serve: all 17 call sites passed `variant="field"` and all eight
 * `ToolStats` passed `tone="onField"`, so the `"hero"` and `"default"` branches
 * were dead code carrying a second design language.
 *
 * The stats values are `--foreground`, not an accent - read off the design file
 * rather than assumed. That is what retires `accentClassName`, and with it the
 * `text-<hue>`-on-background pattern that fails AA on four of the seven hues.
 *
 * Deliberately gone with the field: the module chip (the design's header runs
 * breadcrumb → h1 → tagline → stats, with no chip), and `useNeutralFieldGradient`,
 * whose only consumer this was. That gradient was the theme selector's biggest
 * tool-screen expression, and losing it is an accepted trade (#690) - do not
 * reintroduce a gradient to soften it.
 */
export function ModuleHomeHeader({
  title,
  actions = [],
  description,
  stats,
}: ModuleHomeHeaderProps) {
  const pushWithOrigin = usePushWithOrigin();

  function handleActionPress(action: HeaderAction) {
    if (action.type === "notifications") {
      // The bell is a door to the central Reminders screen, not a surface of its
      // own (#967): one ruling for all ten bells, and the glyph stays stateless.
      // `target` lets the screen bring this module's row into view on arrival.
      //
      // Through the Origin-recording helper rather than a bare `router.push`,
      // which is what makes Reminders' Escape read "CBT" and return here instead
      // of stranding the user on Home (#1261). This is the originally reported
      // symptom, and the tracer bullet for the batches that follow.
      pushWithOrigin({ pathname: "/notifications", params: { target: action.targetKey } });
    } else {
      action.onPress();
    }
  }

  return (
    <View className="gap-2">
      {/* Actions ride the breadcrumb row rather than an overflow menu (#692):
          burying the info action would bury the only path back to the
          onboarding replay. */}
      <View className="flex-row items-center gap-2">
        {/* The Escape renders unconditionally - never wrap it in a condition
            (#1250). The trail beside it still hides at one crumb, so on a
            one-crumb screen the glyph sits on this row alone. */}
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <ScreenEscape />
          <ScreenBreadcrumb />
        </View>
        {actions.length > 0 ? (
          <View className="flex-row items-center gap-3">
            {actions.map((action) => (
              <ActionButton
                key={action.type}
                action={action}
                onPress={() => handleActionPress(action)}
              />
            ))}
          </View>
        ) : null}
      </View>

      <Text variant="h1" className="text-[32px] font-bold leading-[1.15] tracking-tight">
        {title}
      </Text>

      {description ? (
        <Text className="max-w-[62ch] text-[15px] leading-[1.5] text-muted-foreground">
          {description}
        </Text>
      ) : null}

      {stats && stats.length > 0 ? <HeaderStats stats={stats} /> : null}
    </View>
  );
}

/**
 * The inline stat run: `3 check-ins · 3 this week · 3.0 7-day average`.
 *
 * A wrapping row rather than a grid, so a long `bg` label wraps onto a second
 * line instead of forcing a horizontal scroll at 360dp.
 */
function HeaderStats({ stats }: { stats: readonly HeaderStat[] }) {
  return (
    <View testID="module-header-stats" className="mt-1 flex-row flex-wrap items-center gap-y-1">
      {stats.map((stat, i) => (
        // Each item and the separator that FOLLOWS it are one non-wrapping unit
        // (#690), so a wrapped line can never begin with a stranded "·". The
        // separator carries the 10px on both its sides, which is also why the
        // row itself has no `gap-x`: the last item must not trail one.
        // `shrink`, because React Native defaults flexShrink to 0: without it a
        // stat wider than the column pushes the row past the screen edge instead
        // of wrapping inside itself.
        <View key={i} testID="module-header-stat" className="shrink flex-row items-center">
          <Text variant="muted" className="shrink text-[13px] tabular-nums">
            {stat.value ? (
              <Text className="text-[13px] font-semibold tabular-nums text-foreground">
                {stat.value}
              </Text>
            ) : null}
            {stat.value && stat.label ? " " : ""}
            {stat.label}
          </Text>
          {i < stats.length - 1 ? (
            <Text className="px-2.5 text-[13px] text-muted-foreground/50">·</Text>
          ) : null}
        </View>
      ))}
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
  // The programme flag is the one action that wants to be noticed, so it keeps a
  // stronger mark than its neighbours - the app accent now rather than the ACT
  // module's green, which said "ACT" on a button that also appears on CBT (#587).
  const iconClass = action.type === "program" ? CHROME_ACCENT_MARK : "text-muted-foreground";
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
