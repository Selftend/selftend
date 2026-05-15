import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PencilIcon, Trash2Icon } from "lucide-react-native";

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
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { formatMoodRelativeTime } from "@/src/features/mood/relative-time";
import {
  useDeleteJournalEntry,
  useJournalEntries,
  useJournalEntry,
} from "@/src/features/journal/queries";
import type { JournalEntry } from "@/src/features/journal/types";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function JournalDetailScreen() {
  const { t } = useTranslation("journal");
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = typeof id === "string" ? id : null;
  const showToast = useToastStore((state) => state.showToast);

  const { data: cachedList } = useJournalEntries(user?.id ?? null, 50);
  const fromCache = useMemo(
    () => (entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null),
    [cachedList, entryId],
  );
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
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("detail.title")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("detail.title")}</Text>
            </View>
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const when = formatMoodRelativeTime(entry.createdAt, t);
  const trimmedTitle = entry.title.trim();
  const heading = trimmedTitle.length > 0 ? trimmedTitle : t("detail.title");

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
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1" numberOfLines={2}>
                {heading}
              </Text>
            </View>
            <Text variant="muted">{when}</Text>
            <View className="flex-row gap-3">
              <Button
                onPress={() =>
                  router.push(
                    `/tools/journal/${entry.id}/edit` as Parameters<typeof router.push>[0],
                  )
                }
                variant="secondary"
              >
                <Icon as={PencilIcon} className="size-4" />
                <Text>{t("detail.edit")}</Text>
              </Button>
              <Button onPress={() => setConfirmOpen(true)} variant="ghost">
                <Icon as={Trash2Icon} className="size-4 text-destructive" />
                <Text>{t("detail.delete")}</Text>
              </Button>
            </View>
          </View>

          <Card>
            <CardContent className="pt-6">
              <Text className="text-base leading-6">{entry.body}</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("detail.createdAt")}</CardTitle>
              <CardDescription>{formatTimestamp(entry.createdAt)}</CardDescription>
            </CardHeader>
          </Card>
        </View>
      </ScrollView>

      <ConfirmDeleteModal
        visible={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError("");
        }}
        onConfirm={() => void confirmDelete()}
        isPending={deleteMutation.isPending}
        error={deleteError}
      />
    </SafeAreaView>
  );
}

interface ConfirmDeleteModalProps {
  visible: boolean;
  isPending: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteModal({
  visible,
  isPending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation("journal");
  const reduceMotionEnabled = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "fade"}
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View className="flex-1 items-center justify-center bg-black/50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("detail.confirmDelete.title")}</CardTitle>
            <CardDescription>{t("detail.confirmDelete.message")}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="gap-3">
              {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
              <Button disabled={isPending} onPress={onCancel} variant="secondary">
                <Text>{t("detail.confirmDelete.cancel")}</Text>
              </Button>
              <Button disabled={isPending} onPress={onConfirm} variant="destructive">
                {isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{t("detail.confirmDelete.confirm")}</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </Modal>
  );
}
