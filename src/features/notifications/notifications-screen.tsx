import { ActivityIndicator, Animated, Platform, ScrollView, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import {
  NOTIFICATION_TARGETS,
  readEnabled,
  type NotificationTargetKey,
} from "@/src/features/notifications/registry";
import {
  NotificationRowSkeleton,
  NotificationTargetRow,
} from "@/src/features/notifications/notification-target-row";
import { reminderChannelErrorKey } from "@/src/features/notifications/channel-errors";
import { useReminderChannel } from "@/src/features/notifications/use-reminder-channel";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";

/** Which control owns the open permission prompt, if any. */
type PendingControl = "master" | NotificationTargetKey | null;

/**
 * The three nested offsets that add up to the arrived-at row's position in the scroll
 * content: the column inside the content, the rows card inside the column, the row
 * inside the card. Measured, not derived - row heights change with the breakpoint.
 * The row anchor carries the key it was measured FOR: if the mounted screen ever
 * receives a new target, a bare number would satisfy the arrival effect with the
 * previous row's offset and scroll to the wrong row.
 */
type ArrivalAnchors = {
  column?: number;
  card?: number;
  row?: { key: NotificationTargetKey; y: number };
};

/** Breathing room above the arrived-at row, so it doesn't land flush with the top edge. */
const ARRIVAL_SCROLL_INSET = 16;

const HIGHLIGHT_FADE_IN_MS = 250;
const HIGHLIGHT_HOLD_MS = 1200;
const HIGHLIGHT_FADE_OUT_MS = 700;

// Reaches 8px past the row's edges so the wash reads as "around the row", not as a
// stripe butted against the card's padding. Layout only - the ink lives on the themed
// child below, where NativeWind classes resolve per theme.
const focusOverlayStyle: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: -8,
  right: -8,
};

export default function NotificationsScreen() {
  const { t } = useTranslation("notifications");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);
  const channel = useReminderChannel(userId);
  const showToast = useToastStore((s) => s.showToast);

  /**
   * Which control is waiting on a permission prompt, or null. One at a time by construction:
   * the prompt is channel-scoped, so a second request while one is open would queue behind a
   * dialog the user is already looking at.
   */
  const [pendingControl, setPendingControl] = useState<PendingControl>(null);

  /**
   * Arrival focus (#1071): a module-home bell lands here with `?target=<key>` and the
   * screen brings that module's row into view with a brief, quiet highlight that fades
   * on its own. No reorder, no persistent state; an absent or unknown key does nothing.
   */
  const { target: targetParam } = useLocalSearchParams<{ target?: string }>();
  const arrivalKey = NOTIFICATION_TARGETS.find((target) => target.key === targetParam)?.key ?? null;

  const scrollRef = useRef<ScrollView>(null);
  const arrivedForRef = useRef<NotificationTargetKey | null>(null);
  const [anchors, setAnchors] = useState<ArrivalAnchors>({});
  const [highlightOpacity] = useState(() => new Animated.Value(0));
  const reduceMotionEnabled = useReduceMotionEnabled();

  // NOT gated on `arrivalKey`: on the web static export the first hydration renders
  // see empty search params, and the column/card fire their only layout event during
  // that window - a handler attached once the param lands has nothing left to hear.
  function anchorLayoutHandler(part: "column" | "card") {
    return (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      setAnchors((prev) => (prev[part] === y ? prev : { ...prev, [part]: y }));
    };
  }

  function rowLayoutHandler(key: NotificationTargetKey) {
    return (event: LayoutChangeEvent) => {
      const { y } = event.nativeEvent.layout;
      setAnchors((prev) =>
        prev.row?.key === key && prev.row.y === y ? prev : { ...prev, row: { key, y } },
      );
    };
  }

  const { column: columnTop, card: cardTop, row: rowAnchor } = anchors;
  useEffect(() => {
    // Once per target, on the first render where all three anchors are known - which
    // is also how arrival waits out the skeleton phase: the row's anchor only exists
    // once the row does. Later re-layouts (rotation, breakpoint change) must not yank
    // the user back, but a NEW target on a live instance re-arms.
    if (!arrivalKey || arrivedForRef.current === arrivalKey) return;
    if (columnTop === undefined || cardTop === undefined || rowAnchor?.key !== arrivalKey) return;
    arrivedForRef.current = arrivalKey;

    scrollRef.current?.scrollTo({
      y: Math.max(0, columnTop + cardTop + rowAnchor.y - ARRIVAL_SCROLL_INSET),
      animated: !reduceMotionEnabled,
    });
    // Opacity only - no bounce, no movement - so it stays quiet under reduce motion too.
    highlightOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(highlightOpacity, {
        toValue: 1,
        duration: HIGHLIGHT_FADE_IN_MS,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.delay(HIGHLIGHT_HOLD_MS),
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: HIGHLIGHT_FADE_OUT_MS,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
  }, [arrivalKey, columnTop, cardTop, rowAnchor, reduceMotionEnabled, highlightOpacity]);

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;
  const masterPending = pendingControl === "master";

  async function writeMaster(next: boolean) {
    try {
      await updatePreferences.mutateAsync({ notificationsEnabledGlobal: next });
      if (!next) {
        // Tear the channel down only after the preference lands, so a teardown failure
        // can't leave the pref enabled with the channel gone.
        await cancelAllReminders(userId);
      }
    } catch {
      // The master toggle is a preference write, so its failure is a failed SAVE (#1055).
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  }

  async function handleGlobalToggle(next: boolean) {
    if (!preferences || !userId || pendingControl) return;

    if (!next) {
      await writeMaster(false);
      return;
    }

    /**
     * Master-off deleted the channel (`cancelAllReminders` unsubscribes web push and drops
     * the device token), and master-on used to write only the preference - so every already-
     * enabled reminder came back silently dead. Turning the master back on with reminders
     * enabled therefore has to re-arm the channel, which makes it Path B: ensure first, and
     * write nothing if it fails.
     */
    const needsRearm = NOTIFICATION_TARGETS.some((target) => readEnabled(preferences, target));
    const canArm = channel.status === "granted" || channel.status === "prompt-needed";
    if (!needsRearm || !canArm) {
      // `blocked` / `unsupported` still write the column: it is what the server reads the
      // moment a channel returns.
      await writeMaster(true);
      return;
    }

    setPendingControl("master");
    try {
      const result = await channel.ensure();
      if (!result.enabled) {
        const message = t(reminderChannelErrorKey(result.reason));
        showToast({ title: t("common:feedback.wentWrong"), description: message, tone: "error" });
        return;
      }
      await writeMaster(true);
    } finally {
      setPendingControl(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView ref={scrollRef} contentContainerClassName="grow p-6">
        <View
          testID="notifications-column"
          className="mx-auto w-full max-w-2xl gap-6"
          onLayout={anchorLayoutHandler("column")}
        >
          <View className="gap-2">
            <ScreenHeader title={t("title")} />
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          {channel.status === "blocked" ? (
            <View className="gap-1 rounded-xl border border-border bg-card p-4">
              <Text className="text-[15px] font-semibold">{t("channel.blockedTitle")}</Text>
              <Text variant="muted" className="text-[13px]">
                {t(reminderChannelErrorKey("permission-denied"))}
              </Text>
            </View>
          ) : null}

          <View className="gap-1 rounded-xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-4">
              <Text className="flex-1 text-[15px] font-semibold">{t("globalMaster.label")}</Text>
              {masterPending ? (
                <ActivityIndicator
                  testID="notification-master-pending"
                  accessibilityLabel={t("channel.requesting")}
                />
              ) : (
                <Switch
                  accessibilityLabel={t("globalMaster.label")}
                  accessibilityHint={t("globalMaster.hint")}
                  checked={globalEnabled}
                  disabled={!preferences || Boolean(pendingControl)}
                  onCheckedChange={(value) => void handleGlobalToggle(value)}
                />
              )}
            </View>
            <Text variant="muted" className="max-w-[52ch] text-[13px]">
              {t("globalMaster.hint")}
            </Text>
          </View>

          {isLoading || preferences ? (
            <View
              testID="notification-rows-card"
              className="rounded-xl border border-border bg-card px-4"
              onLayout={anchorLayoutHandler("card")}
            >
              {preferences
                ? NOTIFICATION_TARGETS.map((target, index) => {
                    const isArrival = target.key === arrivalKey;
                    return (
                      // The arrival target folds into the key so becoming (or ceasing to
                      // be) the target REMOUNTS the wrapper - react-native-web only
                      // observes layout for nodes whose onLayout existed at mount, so a
                      // handler attached to an already-mounted wrapper is never heard.
                      <View
                        key={isArrival ? `${target.key}-arrival` : target.key}
                        className={cn(index > 0 && "border-t border-border")}
                        onLayout={isArrival ? rowLayoutHandler(target.key) : undefined}
                      >
                        {isArrival ? (
                          <Animated.View
                            pointerEvents="none"
                            testID={`notification-row-focus-${target.key}`}
                            style={[focusOverlayStyle, { opacity: highlightOpacity }]}
                          >
                            <View className="flex-1 rounded-lg bg-primary/10" />
                          </Animated.View>
                        ) : null}
                        <NotificationTargetRow
                          target={target}
                          preferences={preferences}
                          userId={userId}
                          masterEnabled={globalEnabled}
                          channel={channel}
                          locked={Boolean(pendingControl)}
                          onRequestChange={(pending) =>
                            setPendingControl(pending ? target.key : null)
                          }
                        />
                      </View>
                    );
                  })
                : NOTIFICATION_TARGETS.map((target, index) => (
                    // Keyed apart from the real row's wrapper ON PURPOSE. With a shared
                    // key React updates the mounted View in place, and react-native-web
                    // only starts observing layout for a node whose onLayout existed at
                    // mount - a handler attached by the update is never heard, and the
                    // skeleton matching the row's height means no resize ever fires
                    // either. Remounting is what arms the arrival anchor.
                    <View
                      key={`skeleton-${target.key}`}
                      className={cn(index > 0 && "border-t border-border")}
                    >
                      <NotificationRowSkeleton target={target} />
                    </View>
                  ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
