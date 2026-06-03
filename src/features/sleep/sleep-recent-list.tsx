import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { formatDuration } from "@/src/features/sleep/format";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import type { SleepLog } from "@/src/features/sleep/types";

const COLLAPSED = 8;

export function SleepRecentList({ logs }: { logs: SleepLog[] }) {
  const { t } = useTranslation("sleep");
  const [expanded, setExpanded] = useState(false);

  if (logs.length === 0) {
    return <Text variant="muted">{t("recent.empty")}</Text>;
  }

  const sorted = [...logs].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED);

  return (
    <View className="gap-3">
      {visible.map((log) => (
        <Pressable
          key={log.id}
          accessibilityRole="button"
          accessibilityLabel={t("recent.viewEntry", {
            when: formatMoodRelativeTime(log.loggedAt, t),
          })}
          onPress={() => router.push({ pathname: "/tools/sleep/[id]", params: { id: log.id } })}
          className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 active:bg-accent/40"
          role="button"
        >
          <View className="flex-1 gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-base font-semibold">{formatDuration(log.durationMinutes)}</Text>
              <Text variant="muted" className="text-xs">
                {formatMoodRelativeTime(log.loggedAt, t)}
              </Text>
            </View>
            <Text variant="muted" className="text-sm">
              {t(`quality.${log.quality}` as Parameters<typeof t>[0])}
            </Text>
            {log.notes.trim() !== "" ? (
              <Text variant="muted" className="text-xs" numberOfLines={1}>
                {log.notes}
              </Text>
            ) : null}
          </View>
          <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
        </Pressable>
      ))}
      {sorted.length > COLLAPSED ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-center"
          onPress={() => setExpanded((v) => !v)}
        >
          <Text className="text-muted-foreground">
            {expanded ? t("recent.showLess") : t("recent.showAll", { count: sorted.length })}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}
