import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";

import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  GRATITUDE_LIFE_QUESTIONS_KEY,
  GRATITUDE_TODAY_QUESTIONS_KEY,
  asQuestionList,
  gratitudeAnswers,
} from "@/src/features/gratitude/questions";
import {
  useDeleteGratitudeEntry,
  useSetGratitudeEntryStarred,
} from "@/src/features/gratitude/queries";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

const COLLAPSED_PAIRS = 2;
// Fade target = the card background, mirroring module-home-header's CARD_COLOR.
const CARD_COLOR = { dark: "#1f1b27", light: "#fdfcfe" } as const;

export function GratitudeEntryCard({ entry }: { entry: GratitudeEntry }) {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const { colorScheme } = useColorScheme();
  const showToast = useToastStore((state) => state.showToast);

  const [expanded, setExpanded] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const starMutation = useSetGratitudeEntryStarred(user?.id ?? null);
  const deleteMutation = useDeleteGratitudeEntry(user?.id ?? null);

  const todayQuestions = asQuestionList(t(GRATITUDE_TODAY_QUESTIONS_KEY, { returnObjects: true }));
  const lifeQuestions = asQuestionList(t(GRATITUDE_LIFE_QUESTIONS_KEY, { returnObjects: true }));
  const answers = [
    ...gratitudeAnswers(entry.items, todayQuestions),
    ...gratitudeAnswers(entry.lifeItems, lifeQuestions),
  ];

  const when = formatMoodRelativeTime(entry.loggedAt, t);
  const hasMore = answers.length > COLLAPSED_PAIRS;
  const isOpen = expanded || !hasMore;
  const visible = isOpen ? answers : answers.slice(0, COLLAPSED_PAIRS);
  const note = entry.note.trim();
  const fadeColor = colorScheme === "light" ? CARD_COLOR.light : CARD_COLOR.dark;

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

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(expanded ? "list.collapseEntry" : "list.expandEntry", { when })}
        onPress={() => {
          if (hasMore) setExpanded((v) => !v);
        }}
        className="gap-3 p-4 active:bg-accent/30"
      >
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="muted" className="text-xs">
            {when}
          </Text>
          {entry.starred ? <Icon name="star" size={16} className="text-think" /> : null}
        </View>

        <View className="relative">
          <View className="gap-3">
            {visible.map((answer, index) => (
              <View key={`${index}-${answer.text}`} className="gap-1">
                <Text className="text-sm font-semibold text-primary">{answer.question}</Text>
                <Text className="text-base leading-6">{answer.text}</Text>
              </View>
            ))}
          </View>
          {hasMore && !expanded ? (
            <LinearGradient
              accessibilityElementsHidden
              importantForAccessibility="no"
              colors={["transparent", fadeColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36 }}
            />
          ) : null}
        </View>

        {isOpen && note ? (
          <View className="gap-1">
            <Text className="text-sm font-semibold text-primary">{t("detail.noteTitle")}</Text>
            <Text className="text-base leading-6">{note}</Text>
          </View>
        ) : null}

        {hasMore ? (
          <View className="flex-row items-center gap-1">
            <Text className="text-sm text-primary">
              {t(expanded ? "list.showLess" : "list.showMore")}
            </Text>
            <Icon
              name={expanded ? "expand-less" : "expand-more"}
              size={18}
              className="text-primary"
            />
          </View>
        ) : null}
      </Pressable>

      {isOpen ? (
        <View className="flex-row flex-wrap gap-2 border-t border-border px-4 py-3">
          <Button
            size="sm"
            variant={entry.starred ? "secondary" : "ghost"}
            disabled={starMutation.isPending}
            onPress={() => void toggleFavorite()}
          >
            <Icon name={entry.starred ? "star" : "star-outline"} className="size-4 text-primary" />
            <Text>{entry.starred ? t("detail.unfavorite") : t("detail.favorite")}</Text>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() =>
              router.push({ pathname: "/tools/gratitude-log/[id]/edit", params: { id: entry.id } })
            }
          >
            <Icon name="edit" className="size-4" />
            <Text>{t("detail.edit")}</Text>
          </Button>
          <Button size="sm" variant="ghost" onPress={() => setConfirmOpen(true)}>
            <Icon name="delete-outline" className="size-4 text-destructive" />
            <Text>{t("detail.delete")}</Text>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() =>
              router.push({ pathname: "/tools/gratitude-log/[id]", params: { id: entry.id } })
            }
          >
            <Icon name="open-in-full" className="size-4" />
            <Text>{t("detail.open")}</Text>
          </Button>
        </View>
      ) : null}

      <ConfirmDialog
        cancelLabel={t("detail.confirmDelete.cancel")}
        confirmLabel={t("detail.confirmDelete.confirm")}
        error={deleteError}
        isPending={deleteMutation.isPending}
        message={t("detail.confirmDelete.message")}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        title={t("detail.confirmDelete.title")}
        visible={confirmOpen}
      />
    </View>
  );
}
