import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import {
  useJournalEntries,
  useJournalEntry,
  useSaveJournalEntry,
} from "@/src/features/journal/queries";
import { JOURNAL_BODY_MAX, JOURNAL_TITLE_MAX } from "@/src/features/journal/schemas";
import type { JournalEntry } from "@/src/features/journal/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";

interface JournalEntryEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  entryId?: string | null;
}

export function JournalEntryEditorScreen({
  fallbackHref,
  mode,
  entryId = null,
}: JournalEntryEditorScreenProps) {
  const { t } = useTranslation("journal");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { selectedDate } = useSelectedDate();
  const editMode = mode === "edit";

  const { data: cachedList } = useJournalEntries(editMode ? (user?.id ?? null) : null, 50);
  const fromCache = entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null;
  const { data: fetched, isLoading } = useJournalEntry(
    editMode && !fromCache ? (user?.id ?? null) : null,
    editMode && !fromCache ? entryId : null,
  );
  const existingEntry: JournalEntry | null = editMode ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveJournalEntry(user?.id ?? null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [createdAt, setCreatedAt] = useState<string>(
    mode === "create" ? loggedAtForSelectedDate(selectedDate) : new Date().toISOString(),
  );
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (!existingEntry) return;
    setTitle(existingEntry.title);
    setBody(existingEntry.body);
    setCreatedAt(existingEntry.createdAt);
    setError("");
  }, [existingEntry]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const handleSave = async () => {
    if (!user) return;
    setError("");
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      setError(t("editor.saveError"));
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          title: title.trim().slice(0, JOURNAL_TITLE_MAX),
          body: trimmedBody.slice(0, JOURNAL_BODY_MAX),
          createdAt,
        },
        entryId: editMode ? (entryId ?? undefined) : undefined,
      });
      showToast({ title: t("feedback.saved"), tone: "success" });
      router.replace(`/tools/journal/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.saveError"));
    }
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("editor.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingEntry) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("editor.editTitle")} />
            <Text variant="muted">{t("editor.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const heading = editMode ? t("editor.editTitle") : t("editor.createTitle");
  const description = editMode ? t("editor.editDescription") : t("editor.createDescription");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6 pb-12">
        <View className="gap-2">
          <ScreenHeader title={heading} />
          <Text variant="muted">{description}</Text>
        </View>

        <View className="gap-2">
          <Label>{t("editor.titleLabel")}</Label>
          <Input
            accessibilityLabel={t("editor.titleLabel")}
            maxLength={JOURNAL_TITLE_MAX}
            onChangeText={setTitle}
            placeholder={t("editor.titlePlaceholder")}
            value={title}
          />
        </View>

        <View className="gap-2">
          <Label>{t("editor.bodyLabel")}</Label>
          <Textarea
            accessibilityLabel={t("editor.bodyLabel")}
            maxLength={JOURNAL_BODY_MAX}
            onChangeText={setBody}
            placeholder={t("editor.bodyPlaceholder")}
            value={body}
          />
        </View>

        <View className="gap-2">
          <Label>{t("editor.dateLabel")}</Label>
          <DateTimeField
            value={createdAt}
            onChange={setCreatedAt}
            accessibilityLabel={t("editor.dateLabel")}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("editor.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              disabled={body.trim().length === 0 || saving || !user}
              onPress={() => void handleSave()}
            >
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{editMode ? t("editor.update") : t("editor.save")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
