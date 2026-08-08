import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { cn } from "@/lib/utils";
import { FORM_COLUMN } from "@/src/lib/layout";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { announceMessage, politeLiveRegionProps } from "@/src/lib/accessibility";
import {
  useJournalEntries,
  useJournalEntry,
  useSaveJournalEntry,
} from "@/src/features/journal/queries";
import { JOURNAL_BODY_MAX, JOURNAL_TITLE_MAX } from "@/src/features/journal/schemas";
import type { JournalEntry } from "@/src/features/journal/types";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { occurrenceTimeFromDate, type CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

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
  const editMode = mode === "edit";
  const roomStyle = useRoomStyle("ink");

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
  const [bodyError, setBodyError] = useState("");
  const bodyInputRef = useRef<TextInput>(null);
  const [occurredAt, setOccurredAt] = useState<string>(() => new Date().toISOString());
  const [occurredOffsetMinutes, setOccurredOffsetMinutes] = useState<CapturedOffsetMinutes>(
    () => occurrenceTimeFromDate().occurredOffsetMinutes,
  );
  const saving = saveMutation.isPending;

  // Hydrate field state ONCE per entry id; keying on the id (not the object) stops a
  // later list/detail refetch - which yields a new object identity - from clobbering
  // the user's in-progress edits. (Mirrors the editor fix in mood/gratitude/etc.)
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existingEntry) return;
    if (hydratedIdRef.current === existingEntry.id) return;
    hydratedIdRef.current = existingEntry.id;
    setTitle(existingEntry.title);
    setBody(existingEntry.body);
    const restoredOccurredAt = existingEntry.occurredAt ?? existingEntry.createdAt;
    setOccurredAt(restoredOccurredAt);
    // Carry a missing offset through as null rather than deriving one from this
    // device: an entry whose origin was never recorded must not be re-stamped
    // with wherever the user happens to be while fixing a typo (#250).
    setOccurredOffsetMinutes(existingEntry.occurredOffsetMinutes ?? null);
    setError("");
  }, [existingEntry]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    setError("");
    const trimmedBody = body.trim();
    if (trimmedBody.length === 0) {
      const message = t("editor.bodyRequired");
      setBodyError(message);
      announceMessage(message);
      // Focusing also scrolls the field into view on web (shared Textarea behavior).
      bodyInputRef.current?.focus();
      return;
    }
    setBodyError("");
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          title: title.trim().slice(0, JOURNAL_TITLE_MAX),
          body: trimmedBody.slice(0, JOURNAL_BODY_MAX),
          occurredAt,
          occurredOffsetMinutes,
        },
        entryId: editMode ? (entryId ?? undefined) : undefined,
      });
      showToast({ title: t("feedback.saved"), tone: "success" });
      router.replace(`/tools/journal/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch {
      const message = t("editor.saveError");
      setError(message);
      // The error renders next to the footer's Save button (a polite live
      // region on web); announce for native screen readers too.
      announceMessage(message);
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
    // bg-background surfaces re-resolve to the ink pour through it.
    <View className="flex-1" style={roomStyle} testID="journal-editor-room">
      <MobileFormScreen
        contentClassName={cn(FORM_COLUMN, "gap-6")}
        // Both modes now, where only create mode had chrome: an edit form used to
        // open with no header at all above its fields (#733).
        topBar={<ScreenTopBar leading="close" />}
        footer={
          <View className={cn(FORM_COLUMN, "gap-3")}>
            {/* The save-failure error lives WITH the pinned Save button: a user
              saving from the footer while scrolled must see it without hunting
              through the content column. */}
            {error ? (
              <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
                {error}
              </Text>
            ) : null}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button onPress={goBack} variant="ghost">
                  <Text>{t("editor.cancel")}</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button disabled={saving || !user} onPress={() => void handleSave()}>
                  {saving ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{editMode ? t("editor.update") : t("editor.save")}</Text>
                </Button>
              </View>
            </View>
          </View>
        }
      >
        {/* No breadcrumb eyebrow above the heading (design `2b`): the bar above
            carries the trail, so a ScreenHeader here would render it twice. */}
        <View className="gap-2">
          <Text variant="h1">{editMode ? t("editor.editTitle") : t("editor.createTitle")}</Text>
          <Text variant="muted">
            {editMode ? t("editor.editDescription") : t("editor.createDescription")}
          </Text>
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
            ref={bodyInputRef}
            accessibilityLabel={t("editor.bodyLabel")}
            maxLength={JOURNAL_BODY_MAX}
            onChangeText={(value) => {
              setBody(value);
              // The complaint is answered as soon as the user starts typing.
              if (bodyError) setBodyError("");
            }}
            placeholder={t("editor.bodyPlaceholder")}
            value={body}
          />
          {bodyError ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {bodyError}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>{t("editor.dateLabel")}</Label>
          <DateTimeField
            value={occurredAt}
            offsetMinutes={occurredOffsetMinutes}
            onChange={(next) => {
              setOccurredAt(next);
              // A known offset survives a time correction - the user is restating
              // when, not where. Only an entry with no captured offset picks one
              // up here, from the device now doing the restating.
              setOccurredOffsetMinutes(
                occurredOffsetMinutes ??
                  occurrenceTimeFromDate(new Date(next)).occurredOffsetMinutes,
              );
            }}
            accessibilityLabel={t("editor.dateLabel")}
          />
        </View>
      </MobileFormScreen>
    </View>
  );
}
