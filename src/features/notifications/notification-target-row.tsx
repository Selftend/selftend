import { ActivityIndicator, Platform, useWindowDimensions, View } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { TimeField } from "@/src/components/app/time-field";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { type UserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences } from "@/src/features/settings/queries";
import {
  type NotificationTarget,
  readEnabled,
  readHour,
  readMinute,
} from "@/src/features/notifications/registry";
import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import { enableTargetPatch } from "@/src/features/notifications/enable-patch";
import type { ReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { getReminderTimeZone } from "@/src/lib/notifications";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { useToastStore } from "@/src/stores/toast-store";
import { clampTime, type TimeOfDay } from "@/src/utils/time";
import { cn } from "@/lib/utils";

/**
 * Desktop lays the time beside the name; phone stacks it under. Same 640 breakpoint and same
 * `useWindowDimensions` source as home's tool rows, which list these same ten names.
 */
const WIDE_ROW_WIDTH = 640;

interface NotificationTargetRowProps {
  target: NotificationTarget;
  preferences: UserPreferences;
  userId: string | null;
  /** The global master. Off dims the row and disables its controls; the row still shows what it IS. */
  masterEnabled: boolean;
  channel: ReminderChannel;
  /** True while some OTHER control on the page is waiting on a permission prompt. */
  locked: boolean;
  /** Reported so the page can lock every other control for the duration of a request. */
  onRequestChange: (pending: boolean) => void;
}

/**
 * One reminder target: glyph · name · time · switch.
 *
 * Two paths, and which one a tap takes is knowable before the tap (#981):
 *
 *   - **Path A** (`granted`, and also `blocked` / `unsupported`) - a pure column write.
 *     Optimistic through `useUpdateUserPreferences`, instant, **no channel call at all**.
 *     Delivery is server-driven, so nothing here can fail for a permission reason.
 *   - **Path B** (`prompt-needed`) - the switch is a *request*, not a switch. It stays off, a
 *     spinner takes its slot, the rest of the page locks out, and it flips on only once the
 *     channel confirms.
 *
 * Because the switch under Path B was never on, **a failure writes nothing** - no rollback
 * write, and no local mirror of the server value to roll back. The only local state here is
 * the picker's draft (cleared the moment it commits) and the row's own error line.
 */
export function NotificationTargetRow({
  target,
  preferences,
  userId,
  masterEnabled,
  channel,
  locked,
  onRequestChange,
}: NotificationTargetRowProps) {
  const { t } = useTranslation("notifications");
  const updatePreferences = useUpdateUserPreferences(userId);
  const showToast = useToastStore((state) => state.showToast);
  /**
   * Read inside the row, like `ToolRow` does, and for the same reason: a width measured
   * after mount and passed down as a prop is what left a stale duplicate row mounted (#989).
   */
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_ROW_WIDTH;

  const [requestPending, setRequestPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  /**
   * The picker's uncommitted value, and the reason there is no `useState` mirror of the
   * server row: it exists only between opening the picker and the commit, and is cleared at
   * the commit, so an external change to the stored time lands with no re-sync step.
   */
  const [draftTime, setDraftTime] = useState<TimeOfDay | null>(null);

  const label = t(target.labelKey);
  const checked = readEnabled(preferences, target);
  const storedTime = {
    hour: readHour(preferences, target),
    minute: readMinute(preferences, target),
  };
  const time = draftTime ?? storedTime;
  const disabled = !masterEnabled || locked || requestPending || !userId;

  function reportFailure(message: string) {
    setErrorMessage(message);
    showToast({ title: t("common:feedback.wentWrong"), description: message, tone: "error" });
  }

  async function writePatch(patch: Partial<UserPreferences>) {
    setErrorMessage("");
    try {
      await updatePreferences.mutateAsync(patch);
    } catch {
      // The thrown message is a backend/internal string - translated copy only (i18n rule).
      reportFailure(t("common:feedback.wentWrong"));
    }
  }

  async function handleToggle(next: boolean) {
    if (!userId || requestPending || locked) return;

    if (!next) {
      await writePatch({ [target.enabledField]: false });
      return;
    }

    if (channel.status !== "prompt-needed") {
      await writePatch(enableTargetPatch(preferences, target));
      return;
    }

    setErrorMessage("");
    setRequestPending(true);
    onRequestChange(true);
    try {
      const result = await channel.ensure();
      if (!result.enabled) {
        // Nothing is written: the switch was never on, so there is no state to undo.
        reportFailure(t(reminderChannelErrorKey(result.reason)));
        return;
      }
      await writePatch(enableTargetPatch(preferences, target));
    } catch {
      reportFailure(t("common:feedback.wentWrong"));
    } finally {
      setRequestPending(false);
      onRequestChange(false);
    }
  }

  /**
   * The commit boundary is the picker CLOSING, never a debounce: the web input fires per
   * keystroke, the iOS spinner fires continuously while scrolling, Android once on OK.
   * A time change is a pure column write on every platform and cannot fail for permission.
   */
  async function handleTimeCommit(next: TimeOfDay) {
    setDraftTime(null);
    if (!userId) return;
    const { hour, minute } = clampTime(next);
    if (hour === storedTime.hour && minute === storedTime.minute) return;
    await writePatch({
      [target.hourField]: hour,
      [target.minuteField]: minute,
      [target.timezoneField]: getReminderTimeZone(),
    });
  }

  return (
    <View
      testID={`notification-row-${target.key}`}
      // 0.55 while the master is off - the row still renders its true `checked` state and its
      // real time. Rendering `checked && master` would show every switch off and contradict
      // the master's own sentence 20px above it.
      className={cn("gap-1.5 py-3.5", !masterEnabled && "opacity-[0.55]")}
    >
      <View className="flex-row items-center gap-[14px]">
        <Icon name={target.icon} className={cn("size-5 shrink-0", CHROME_MARK)} />
        <View
          testID={`notification-row-body-${target.key}`}
          className={cn(
            "min-w-0 flex-1",
            wide ? "flex-row items-center gap-3" : "items-start gap-1",
          )}
        >
          <Text
            numberOfLines={1}
            // A MINIMUM, not a width: the longest Bulgarian label is
            // "Дневник на благодарността", which a fixed column overruns. Same shape as
            // home's tool row, which lists these same ten names.
            className={cn("text-[15px] font-semibold", wide && "min-w-[150px] shrink-0")}
          >
            {label}
          </Text>
          <TimeField
            compact
            value={time}
            onChange={setDraftTime}
            onCommit={(next) => void handleTimeCommit(next)}
            // Not gated on the row's own switch: a time is worth setting before turning the
            // reminder on, and the write cannot fail.
            disabled={disabled}
            // The row already carries the master-off dim; a second 0.4 on top of it lands the
            // time at 0.22, which is the "shows Off" failure by another route.
            inDimmedContainer={!masterEnabled}
            accessibilityLabel={t("time.labelFor", { label })}
          />
        </View>
        {requestPending ? (
          // The switch's own slot, so the control that is acting is the control that was
          // pressed - and it is still off, because nothing has been granted yet.
          <ActivityIndicator
            testID={`notification-row-pending-${target.key}`}
            accessibilityLabel={t("channel.requesting")}
          />
        ) : (
          <Switch
            // Named for its target: ten switches sharing one name are ten controls a
            // screen-reader user cannot tell apart.
            accessibilityLabel={label}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(next) => void handleToggle(next)}
          />
        )}
      </View>
      {errorMessage ? (
        <Text
          className={cn("text-sm text-destructive", Platform.OS === "web" && "max-w-[64ch]")}
          role="alert"
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * One row's silhouette at its REAL height, for the moment before preferences land.
 *
 * It lives beside the row and shares its breakpoint deliberately: a skeleton that is the
 * wrong height is a layout jump dressed up as a loading state, and the desktop row is 64px
 * against the phone's 88px. The registry is static, so ten of these are known before any
 * query resolves - and a loading surface never claims emptiness.
 */
export function NotificationRowSkeleton({ targetKey }: { targetKey: string }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_ROW_WIDTH;

  return (
    <View
      testID={`notification-row-skeleton-${targetKey}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("flex-row items-center gap-[14px]", wide ? "h-16" : "h-[88px]")}
    >
      {/* `bg-muted` measures 1.10:1 on a card and is therefore invisible (#725);
          `muted-foreground/25` is 1.41 light / 1.68 dark - faint on purpose, but there. */}
      <View className="size-5 rounded bg-muted-foreground/25" />
      <View className={cn("min-w-0 flex-1", wide ? "flex-row items-center gap-3" : "gap-2")}>
        <View className={cn("h-4 rounded bg-muted-foreground/25", wide ? "w-[150px]" : "w-1/3")} />
        <View className="h-9 w-16 rounded-md bg-muted-foreground/25" />
      </View>
      <View className="h-[1.15rem] w-8 rounded-full bg-muted-foreground/25" />
    </View>
  );
}
