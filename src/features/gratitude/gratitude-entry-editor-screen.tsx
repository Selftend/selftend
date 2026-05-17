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
  GRATITUDE_LIFE_ITEM_COUNT,
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
const EMPTY_LIFE_ITEMS = Array.from({ length: GRATITUDE_LIFE_ITEM_COUNT }, () => "");

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function rotatingPlaceholder(options: string[], offset: number, index: number, fallback: string) {
  if (options.length === 0) return fallback;
  return options[(offset + index) % options.length] ?? fallback;
}

export function GratitudeEntryEditorScreen({
  fallbackHref,
  mode,
  entryId = null,
}: GratitudeEntryEditorScreenProps) {
  const { t } = useTranslation("gratitude");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const editMode = mode === "edit";

  const { data: cachedList } = useGratitudeEntries(user?.id ?? null, 50);
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
  const [lifeItems, setLifeItems] = useState<string[]>(EMPTY_LIFE_ITEMS);
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (!existingEntry) return;
    setItems([
      existingEntry.items[0] ?? "",
      existingEntry.items[1] ?? "",
      existingEntry.items[2] ?? "",
      existingEntry.items[3] ?? "",
      existingEntry.items[4] ?? "",
    ]);
    setNote(existingEntry.note);
    setLifeItems([
      existingEntry.lifeItems[0] ?? "",
      existingEntry.lifeItems[1] ?? "",
      existingEntry.lifeItems[2] ?? "",
    ]);
    setError("");
  }, [existingEntry]);

  const trimmedItems = items.map((s) => s.trim()).filter((s) => s.length > 0);
  const canSave = trimmedItems.length > 0 && !saving && Boolean(user);
  const itemPlaceholderFallback = t("editor.itemPlaceholder");
  const todaySuggestionPlaceholders = useMemo(
    () => asStringArray(t("editor.todaySuggestionPlaceholders", { returnObjects: true })),
    [t],
  );
  const placeholderOffset =
    (cachedList?.length ?? 0) % Math.max(todaySuggestionPlaceholders.length, 1);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref as Parameters<typeof router.push>[0]);
  };

  const updateItem = (index: number, value: string) =>
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  const updateLifeItem = (index: number, value: string) =>
    setLifeItems((prev) => prev.map((v, i) => (i === index ? value : v)));

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
          level: 3,
          items: trimmedItems.map((item) => item.slice(0, GRATITUDE_ITEM_MAX)),
          note: note.trim().slice(0, GRATITUDE_NOTE_MAX),
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems: lifeItems.map((s) => s.trim()).filter((s) => s.length > 0),
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
            <Text variant="h1">{editMode ? t("editor.editTitle") : t("editor.createTitle")}</Text>
          </View>
          <Text variant="muted">
            {editMode ? t("editor.editDescription") : t("editor.createDescription")}
          </Text>
        </View>

        <View className="gap-4">
          <Label>{t("editor.todayItemsLabel")}</Label>
          {items.map((item, index) => (
            <View className="gap-2" key={index}>
              <Input
                accessibilityLabel={t("editor.itemLabel", { number: index + 1 })}
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateItem(index, value)}
                placeholder={rotatingPlaceholder(
                  todaySuggestionPlaceholders,
                  placeholderOffset,
                  index,
                  itemPlaceholderFallback,
                )}
                value={item}
              />
            </View>
          ))}
        </View>

        <View className="gap-4">
          <Label>{t("editor.lifeItemsLabel")}</Label>
          {lifeItems.map((item, index) => (
            <View className="gap-2" key={index}>
              <Input
                accessibilityLabel={t("editor.lifeItemLabel", { number: index + 1 })}
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateLifeItem(index, value)}
                placeholder={t("editor.lifeItemPlaceholder")}
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
