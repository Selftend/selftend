import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { ContentSheet } from "@/src/components/app/content-sheet";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { ScreenHeader } from "@/src/components/app/screen-header";
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
import {
  GRATITUDE_LIFE_QUESTIONS_KEY,
  GRATITUDE_TODAY_QUESTIONS_KEY,
  answeredCount,
  asQuestionList,
} from "@/src/features/gratitude/questions";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { roomVariables } from "@/src/lib/module-room";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

interface GratitudeEntryEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  entryId?: string | null;
}

const EMPTY_ITEMS = Array.from({ length: GRATITUDE_ITEM_COUNT }, () => "");
const EMPTY_LIFE_ITEMS = Array.from({ length: GRATITUDE_LIFE_ITEM_COUNT }, () => "");

// The editor lives in gratitude's think room (spec #267): same subtree token
// re-pour as the landing, so gratitude never flips rooms.
const THINK_ROOM = roomVariables("think");

export function GratitudeEntryEditorScreen({
  fallbackHref,
  mode,
  entryId = null,
}: GratitudeEntryEditorScreenProps) {
  const { t } = useTranslation("gratitude");
  const { colorScheme } = useColorScheme();
  const roomStyle = THINK_ROOM[colorScheme === "dark" ? "dark" : "light"];
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const editMode = mode === "edit";

  const { data: cachedList } = useGratitudeEntries(user?.id ?? null, 50);
  const fromCache = entryId ? (cachedList?.find((entry) => entry.id === entryId) ?? null) : null;
  const { data: fetched, isLoading } = useGratitudeEntry(
    editMode && !fromCache ? (user?.id ?? null) : null,
    editMode && !fromCache ? entryId : null,
  );
  const existingEntry: GratitudeEntry | null = editMode ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveGratitudeEntry(user?.id ?? null);

  const [items, setItems] = useState<string[]>(EMPTY_ITEMS);
  const [lifeItems, setLifeItems] = useState<string[]>(EMPTY_LIFE_ITEMS);
  const [note, setNote] = useState("");
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString());
  const [loggedOffsetMinutes, setLoggedOffsetMinutes] = useState(
    () => occurrenceTimeFromDate().occurredOffsetMinutes,
  );

  const [error, setError] = useState("");
  const saving = saveMutation.isPending;

  // Hydrate field state ONCE per entry id; keying on the id (not the object) stops a
  // later refetch's new object identity from clobbering the user's in-progress edits.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existingEntry) return;
    if (hydratedIdRef.current === existingEntry.id) return;
    hydratedIdRef.current = existingEntry.id;
    setItems([
      existingEntry.items[0] ?? "",
      existingEntry.items[1] ?? "",
      existingEntry.items[2] ?? "",
      existingEntry.items[3] ?? "",
      existingEntry.items[4] ?? "",
    ]);
    setNote(existingEntry.note);
    setLoggedAt(existingEntry.loggedAt);
    setLoggedOffsetMinutes(
      existingEntry.loggedOffsetMinutes ??
        occurrenceTimeFromDate(new Date(existingEntry.loggedAt)).occurredOffsetMinutes,
    );
    setLifeItems([
      existingEntry.lifeItems[0] ?? "",
      existingEntry.lifeItems[1] ?? "",
      existingEntry.lifeItems[2] ?? "",
    ]);
    setError("");
  }, [existingEntry]);

  const todayQuestions = asQuestionList(t(GRATITUDE_TODAY_QUESTIONS_KEY, { returnObjects: true }));
  const lifeQuestions = asQuestionList(t(GRATITUDE_LIFE_QUESTIONS_KEY, { returnObjects: true }));
  const canSave = answeredCount(items) > 0 && !saving && Boolean(user);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const updateItem = (index: number, value: string) =>
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  const updateLifeItem = (index: number, value: string) =>
    setLifeItems((prev) => prev.map((v, i) => (i === index ? value : v)));

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    setError("");
    if (answeredCount(items) === 0) {
      setError(t("editor.saveError"));
      return;
    }
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          level: 3,
          items,
          note: note.trim().slice(0, GRATITUDE_NOTE_MAX),
          loggedAt,
          loggedOffsetMinutes,
          events: [],
          goodMoment: "",
          missIfGone: "",
          hiddenGood: "",
          lifeItems,
        },
        entryId: editMode ? (entryId ?? undefined) : undefined,
      });
      showToast({ title: t("feedback.saved"), tone: "success" });
      router.replace(`/tools/gratitude-log/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editor.saveError"));
    }
  });

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("editor.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingEntry) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("editor.editTitle")} />
            <Text variant="muted">{t("editor.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the think pour through it.
    <View className="flex-1" style={roomStyle}>
      <MobileFormScreen
        contentClassName="mx-auto w-full max-w-2xl gap-6"
        hero={
          editMode ? undefined : (
            // Create mode gets the field treatment: the full-bleed gold field
            // with the sheet lip rising over it, outside the max-width column.
            <View>
              <ModuleHomeHeader
                variant="field"
                hue="think"
                icon="favorite"
                title={t("editor.createTitle")}
                moduleLabel={null}
                description={t("editor.createDescription")}
              />
              <ContentSheet />
            </View>
          )
        }
        footer={
          <View className="mx-auto w-full max-w-2xl flex-row gap-3">
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
        }
      >
        {editMode ? (
          <View className="gap-2">
            <ScreenHeader title={t("editor.editTitle")} />
            <Text variant="muted">{t("editor.editDescription")}</Text>
          </View>
        ) : null}

        <View className="gap-4">
          <Label>{t("editor.todayItemsLabel")}</Label>
          {items.map((item, index) => (
            <View className="gap-2" key={index}>
              <Label>{todayQuestions[index] ?? ""}</Label>
              <Input
                accessibilityLabel={
                  todayQuestions[index] ?? t("editor.itemLabel", { number: index + 1 })
                }
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateItem(index, value)}
                placeholder={t("editor.itemPlaceholder")}
                value={item}
              />
            </View>
          ))}
        </View>

        <View className="gap-4">
          <Label>{t("editor.lifeItemsLabel")}</Label>
          {lifeItems.map((item, index) => (
            <View className="gap-2" key={index}>
              <Label>{lifeQuestions[index] ?? ""}</Label>
              <Input
                accessibilityLabel={
                  lifeQuestions[index] ?? t("editor.lifeItemLabel", { number: index + 1 })
                }
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateLifeItem(index, value)}
                placeholder={t("editor.lifeItemPlaceholder")}
                value={item}
              />
            </View>
          ))}
        </View>

        <View className="gap-2">
          <Label>{t("editor.whenLabel")}</Label>
          <DateTimeField
            value={loggedAt}
            onChange={(next) => {
              const occurrence = occurrenceTimeFromDate(new Date(next));
              setLoggedAt(occurrence.occurredAt);
              setLoggedOffsetMinutes(occurrence.occurredOffsetMinutes);
            }}
            accessibilityLabel={t("editor.whenLabel")}
          />
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
      </MobileFormScreen>
    </View>
  );
}
