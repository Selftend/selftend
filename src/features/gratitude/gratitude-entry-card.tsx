import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useSetGratitudeEntryStarred } from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useAccentHsl } from "@/src/lib/theme-palette";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatRelativeDayKey } from "@/src/utils/relative-time";

export function gratitudeEntryLines(entry: GratitudeEntry): string[] {
  return [...entry.items, ...entry.lifeItems, entry.note]
    .map((line) => line.trim())
    .filter(Boolean);
}

export function GratitudeEntryCard({ entry }: { entry: GratitudeEntry }) {
  const pushWithOrigin = usePushWithOrigin();
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const accent = useAccentHsl();
  const showToast = useToastStore((state) => state.showToast);
  const starMutation = useSetGratitudeEntryStarred(user?.id ?? null);
  const lines = gratitudeEntryLines(entry);
  const when = formatRelativeDayKey(entry.dayKey, t);

  const toggleFavorite = async () => {
    try {
      const updated = await starMutation.mutateAsync({ id: entry.id, starred: !entry.starred });
      showToast({
        title: updated.starred ? t("feedback.favoriteAdded") : t("feedback.favoriteRemoved"),
        tone: "success",
      });
    } catch {
      showToast({ title: t("detail.favoriteError"), tone: "error" });
    }
  };

  return (
    <Pressable
      accessibilityLabel={t("list.viewEntry", { when })}
      accessibilityRole="button"
      className="flex-row items-center gap-3 py-3 active:opacity-75"
      onPress={() =>
        pushWithOrigin({ pathname: "/tools/gratitude-log/[id]", params: { id: entry.id } })
      }
      role="button"
    >
      <View className="h-12 w-[3px] rounded-full" style={{ backgroundColor: accent(1) }} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-semibold" numberOfLines={1}>
          {lines[0] ?? t("list.fallbackItem")}
        </Text>
        {lines.length > 1 ? (
          <Text variant="muted" className="text-xs leading-5" numberOfLines={2}>
            {lines.slice(1).join(" · ")}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={entry.starred ? t("detail.unfavorite") : t("detail.favorite")}
        accessibilityRole="button"
        disabled={starMutation.isPending}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={(event) => {
          event.stopPropagation();
          void toggleFavorite();
        }}
        role="button"
      >
        <Icon
          name={entry.starred ? "star" : "star-outline"}
          size={18}
          className="text-primary-ink"
        />
      </Pressable>
      <Text variant="muted" className="w-[82px] text-right text-xs" numberOfLines={2}>
        {when}
      </Text>
    </Pressable>
  );
}
