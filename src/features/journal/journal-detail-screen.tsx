import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { LoadingState } from "@/src/components/app/screen-state";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import {
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
} from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { roomVariables } from "@/src/lib/module-room";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatLocalTimestamp } from "@/src/utils/date";

// Journal is the "ink" room (spec #292): the detail screen re-pours its
// surface tokens as deep blue. Static per-scheme styles, computed once.
const INK_ROOM = roomVariables("ink");

export default function JournalDetailScreen() {
  const { t, i18n } = useTranslation("journal");
  const { colorScheme } = useColorScheme();
  const { user } = useSession();
  const roomStyle = INK_ROOM[colorScheme === "dark" ? "dark" : "light"];
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useJournalEntries(user?.id ?? null, 50);
  const fromCache = entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null;
  const { data: fetched, isLoading } = useJournalEntry(
    fromCache ? null : (user?.id ?? null),
    fromCache ? null : entryId,
  );
  const entry: JournalEntry | null = fromCache ?? fetched ?? null;

  const deleteMutation = useDeleteJournalEntry(user?.id ?? null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("detail.title")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const occurredAt = entry.occurredAt ?? entry.createdAt;
  const when = formatMoodRelativeTime(occurredAt, t);
  const trimmedTitle = entry.title.trim();
  const heading = trimmedTitle.length > 0 ? trimmedTitle : t("detail.title");

  let createdAtLabel: string;
  try {
    createdAtLabel = new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(occurredAt));
  } catch {
    createdAtLabel = formatLocalTimestamp(occurredAt);
  }

  const confirmDelete = async () => {
    setDeleteError("");
    try {
      await deleteMutation.mutateAsync(entry.id);
      setConfirmOpen(false);
      showToast({ title: t("feedback.deleted"), tone: "success" });
      router.replace("/tools/journal" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : t("detail.deleteError"));
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["bottom", "left", "right"]}
      style={roomStyle}
    >
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={heading} />
            <Text variant="muted">{when}</Text>
            <View className="flex-row gap-3">
              <Button
                onPress={() => router.push(`/tools/journal/${entry.id}/edit`)}
                variant="secondary"
              >
                <Icon name="edit" className="size-4" />
                <Text>{t("detail.edit")}</Text>
              </Button>
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon name="delete-outline" className="size-4 text-destructive" />
                <Text>{t("detail.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card variant="soft" tint="ink">
            <CardContent>
              <Text className="text-base leading-6">{entry.body}</Text>
            </CardContent>
          </Card>

          <Card variant="soft" tint="ink">
            <CardHeader>
              <CardTitle aria-level={2}>{t("detail.createdAt")}</CardTitle>
              <CardDescription>{createdAtLabel}</CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}
