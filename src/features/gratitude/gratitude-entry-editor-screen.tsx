import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import {
  useGratitudeEntries,
  useGratitudeEntry,
  useSaveGratitudeEntry,
} from "@/src/features/gratitude/queries";
import {
  GRATITUDE_ITEM_COUNT,
  GRATITUDE_ITEM_MAX,
  GRATITUDE_NOTE_MAX,
} from "@/src/features/gratitude/schemas";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

interface GratitudeEntryEditorScreenProps {
  fallbackHref: string;
  mode: "create" | "edit";
  entryId?: string | null;
}

const EMPTY_ITEMS = Array.from({ length: GRATITUDE_ITEM_COUNT }, () => "");

export function GratitudeEntryEditorScreen({
  fallbackHref,
  mode,
  entryId = null,
}: GratitudeEntryEditorScreenProps) {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const editMode = mode === "edit";

  const { data: cachedList } = useGratitudeEntries(editMode ? (user?.id ?? null) : null, 50);
  const fromCache = useMemo(
    () => (entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null),
    [cachedList, entryId],
  );
  const { data: fetched, isLoading } = useGratitudeEntry(
    editMode && !fromCache ? (user?.id ?? null) : null,
    editMode && !fromCache ? entryId : null,
  );
  const existingEntry: GratitudeEntry | null = editMode ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveGratitudeEntry(user?.id ?? null);
  const [items, setItems] = useState<string[]>(EMPTY_ITEMS);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (!existingEntry) return;
    setItems([
      existingEntry.items[0] ?? "",
      existingEntry.items[1] ?? "",
      existingEntry.items[2] ?? "",
    ]);
    setNote(existingEntry.note);
    setError("");
  }, [existingEntry]);

  const trimmedItems = items.map((item) => item.trim()).filter((item) => item.length > 0);
  const canSave = trimmedItems.length > 0 && !saving && Boolean(user);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref as Parameters<typeof router.push>[0]);
  };

  const updateItem = (index: number, value: string) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const handleSave = async () => {
    if (!user) return;
    setError("");
    if (trimmedItems.length === 0) {
      setError(t("editor.saveError"));
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          items: trimmedItems.map((item) => item.slice(0, GRATITUDE_ITEM_MAX)),
          note: note.trim().slice(0, GRATITUDE_NOTE_MAX),
        },
        entryId: editMode ? (entryId ?? undefined) : undefined,
      });
      showToast({ title: t("feedback.saved"), tone: "success" });
      router.replace(`/tools/gratitude-log/${saved.id}` as Parameters<typeof router.replace>[0]);
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
            <View className="flex-row items-center gap-2">
              <BackButton
                fallbackHref={fallbackHref}
                mode="history"
                showLabel={false}
                className="-ml-2"
              />
              <Text variant="h1">{t("editor.editTitle")}</Text>
            </View>
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
          <View className="flex-row items-center gap-2">
            <BackButton
              fallbackHref={fallbackHref}
              mode="history"
              showLabel={false}
              className="-ml-2"
            />
            <Text variant="h1">{heading}</Text>
          </View>
          <Text variant="muted">{description}</Text>
        </View>

        <View className="gap-4">
          {items.map((item, index) => (
            <View className="gap-2" key={index}>
              <Label>{t("editor.itemLabel", { number: index + 1 })}</Label>
              <Input
                accessibilityLabel={t("editor.itemLabel", { number: index + 1 })}
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateItem(index, value)}
                placeholder={t("editor.itemPlaceholder")}
                value={item}
              />
            </View>
          ))}
        </View>

        <View className="gap-2">
          <Label>{t("editor.noteLabel")}</Label>
          <Textarea
            accessibilityLabel={t("editor.noteLabel")}
            maxLength={GRATITUDE_NOTE_MAX}
            onChangeText={setNote}
            placeholder={t("editor.notePlaceholder")}
            value={note}
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
            <Button disabled={!canSave} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{editMode ? t("editor.update") : t("editor.save")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
