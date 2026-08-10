import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { cn } from "@/lib/utils";
import { FORM_COLUMN } from "@/src/lib/layout";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  useGratitudeEntries,
  useGratitudeEntry,
  useSaveGratitudeEntry,
} from "@/src/features/gratitude/queries";
import {
  GRATITUDE_ITEM_COUNT,
  GRATITUDE_ITEM_MAX,
  GRATITUDE_LIFE_ITEM_COUNT,
} from "@/src/features/gratitude/schemas";
import {
  GRATITUDE_TODAY_QUESTIONS_KEY,
  answeredCount,
  asQuestionList,
} from "@/src/features/gratitude/questions";
import type { GratitudeEntry } from "@/src/features/gratitude/types";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { occurrenceTimeFromDate, type CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { formatInstantAtOffset } from "@/src/utils/date";

interface GratitudeEntryEditorScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  entryId?: string | null;
}

const EMPTY_ITEMS = Array.from({ length: 3 }, () => "");
const EMPTY_LIFE_ITEMS = Array.from({ length: GRATITUDE_LIFE_ITEM_COUNT }, () => "");

export function GratitudeEntryEditorScreen({
  fallbackHref,
  mode,
  entryId = null,
}: GratitudeEntryEditorScreenProps) {
  const { t, i18n } = useTranslation("gratitude");
  const roomStyle = useRoomStyle("think");
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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString());
  const [loggedOffsetMinutes, setLoggedOffsetMinutes] = useState<CapturedOffsetMinutes>(
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
    const hydratedItems = [
      existingEntry.items[0] ?? "",
      existingEntry.items[1] ?? "",
      existingEntry.items[2] ?? "",
      existingEntry.items[3] ?? "",
      existingEntry.items[4] ?? "",
    ];
    while (hydratedItems.length > 3 && !hydratedItems.at(-1)?.trim()) hydratedItems.pop();
    setItems(hydratedItems);
    setNote(existingEntry.note);
    setLoggedAt(existingEntry.loggedAt);
    // Carry a missing offset through as null rather than deriving one from this
    // device: an entry whose origin was never recorded must not be re-stamped
    // with wherever the user happens to be while fixing a typo (#250).
    setLoggedOffsetMinutes(existingEntry.loggedOffsetMinutes ?? null);
    setLifeItems([
      existingEntry.lifeItems[0] ?? "",
      existingEntry.lifeItems[1] ?? "",
      existingEntry.lifeItems[2] ?? "",
    ]);
    setError("");
  }, [existingEntry]);

  const todayQuestions = asQuestionList(t(GRATITUDE_TODAY_QUESTIONS_KEY, { returnObjects: true }));
  const canSave = answeredCount(items) > 0 && !saving && Boolean(user);
  const dateLabel = formatInstantAtOffset(
    loggedAt,
    loggedOffsetMinutes,
    { weekday: "long", day: "numeric", month: "long" },
    i18n.language,
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const updateItem = (index: number, value: string) =>
    setItems((prev) => prev.map((v, i) => (i === index ? value : v)));
  const applyPrompt = (prompt: string) => {
    setItems((current) => {
      const focusedIsEmpty = focusedIndex !== null && !(current[focusedIndex] ?? "").trim();
      const target = focusedIsEmpty ? focusedIndex : current.findIndex((item) => !item.trim());
      if (target !== null && target >= 0) {
        return current.map((item, index) => (index === target ? prompt : item));
      }
      return current.length < GRATITUDE_ITEM_COUNT ? [...current, prompt] : current;
    });
  };

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
          note,
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
        contentClassName={cn(FORM_COLUMN, "gap-6")}
        // Both modes now, where only create mode had chrome: an edit form used to
        // open with no header at all above its fields (#733).
        topBar={<ScreenTopBar leading="close" />}
        footer={
          <View className={cn(FORM_COLUMN, "flex-row gap-3")}>
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
        {/* No breadcrumb eyebrow above the heading (design `2b`): the bar above
            carries the trail, so a ScreenHeader here would render it twice. */}
        <View className="gap-2">
          <Text variant="h1">{editMode ? t("editor.editTitle") : t("editor.createTitle")}</Text>
          <Text variant="muted">
            {editMode
              ? t("editor.editDescription")
              : t("editor.createDescription", { date: dateLabel })}
          </Text>
        </View>

        <View className="border-y border-border">
          {items.map((item, index) => (
            <View
              className={cn(
                "flex-row items-center gap-3 py-2",
                index < items.length - 1 && "border-b border-border",
              )}
              key={index}
            >
              <Text className="w-6 text-center text-sm font-semibold text-primary-ink">
                {index + 1}
              </Text>
              <Input
                accessibilityLabel={t("editor.itemLabel", { number: index + 1 })}
                className="min-h-12 flex-1 border-0 bg-transparent px-0 shadow-none"
                maxLength={GRATITUDE_ITEM_MAX}
                onChangeText={(value) => updateItem(index, value)}
                onFocus={() => setFocusedIndex(index)}
                placeholder={
                  index === 0 ? t("editor.itemPlaceholder") : t("editor.continuationPlaceholder")
                }
                value={item}
              />
            </View>
          ))}
        </View>

        {items.length < GRATITUDE_ITEM_COUNT ? (
          <Button
            className="self-start"
            onPress={() => setItems((current) => [...current, ""])}
            variant="ghost"
          >
            <Text>{t("editor.addAnother")}</Text>
          </Button>
        ) : null}

        <View className="gap-3">
          <Text className="text-sm font-semibold">{t("editor.promptHelp")}</Text>
          <View className="flex-row flex-wrap gap-2">
            {todayQuestions.map((prompt) => (
              <Pressable
                key={prompt}
                accessibilityRole="button"
                className="rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-2"
                onPress={() => applyPrompt(prompt)}
                role="button"
              >
                <Text className="text-xs font-semibold text-primary-ink">{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium">{t("editor.whenLabel")}</Text>
          <DateTimeField
            value={loggedAt}
            offsetMinutes={loggedOffsetMinutes}
            onChange={(next) => {
              setLoggedAt(next);
              // A known offset survives a time correction - the user is restating
              // when, not where. Only an entry with no captured offset picks one
              // up here, from the device now doing the restating.
              setLoggedOffsetMinutes(
                loggedOffsetMinutes ?? occurrenceTimeFromDate(new Date(next)).occurredOffsetMinutes,
              );
            }}
            accessibilityLabel={t("editor.whenLabel")}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      </MobileFormScreen>
    </View>
  );
}
