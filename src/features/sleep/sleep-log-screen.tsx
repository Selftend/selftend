import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { cn } from "@/lib/utils";
import { FORM_COLUMN } from "@/src/lib/layout";
import { DateTimeField } from "@/src/components/app/date-time-field";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { LoadingState } from "@/src/components/app/screen-state";
import { DurationStepper } from "@/src/features/sleep/duration-stepper";
import { QualityScale } from "@/src/features/sleep/quality-scale";
import { useSleepLog, useSleepLogs, useSaveSleepLog } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { occurrenceTimeFromDate, type CapturedOffsetMinutes } from "@/src/lib/occurrence-time";
import { useSession } from "@/src/providers/session-provider";

interface SleepLogScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  logId?: string | null;
}

// Sensible starting point for a new entry so the stepper always shows a value.
const DEFAULT_DURATION_MINUTES = 450; // 7h 30m

export function SleepLogScreen({ fallbackHref, mode, logId = null }: SleepLogScreenProps) {
  const { t } = useTranslation("sleep");
  const roomStyle = useRoomStyle("ink");
  const { user } = useSession();

  const { data: cachedList } = useSleepLogs(mode === "edit" ? (user?.id ?? null) : null, 50);
  const fromCache = logId ? (cachedList?.find((l) => l.id === logId) ?? null) : null;
  const { data: fetched, isLoading } = useSleepLog(
    mode === "edit" && !fromCache ? (user?.id ?? null) : null,
    mode === "edit" && !fromCache ? logId : null,
  );
  const existingLog: SleepLog | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveSleepLog(user?.id ?? null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(
    mode === "create" ? DEFAULT_DURATION_MINUTES : null,
  );
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString());
  const [loggedOffsetMinutes, setLoggedOffsetMinutes] = useState<CapturedOffsetMinutes>(
    () => occurrenceTimeFromDate().occurredOffsetMinutes,
  );
  const [error, setError] = useState("");

  const editMode = mode === "edit";
  const saving = saveMutation.isPending;

  // Hydrate field state ONCE per log id; keying on the id (not the object) stops a later
  // refetch's new object identity from clobbering the user's in-progress edits.
  const hydratedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!existingLog) return;
    if (hydratedIdRef.current === existingLog.id) return;
    hydratedIdRef.current = existingLog.id;
    setDurationMinutes(existingLog.durationMinutes);
    setQuality(existingLog.quality);
    setNotes(existingLog.notes);
    setLoggedAt(existingLog.loggedAt);
    // Carry a missing offset through as null rather than deriving one from this
    // device: an entry whose origin was never recorded must not be re-stamped
    // with wherever the user happens to be while fixing a typo (#250).
    setLoggedOffsetMinutes(existingLog.loggedOffsetMinutes ?? null);
    setError("");
  }, [existingLog]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    if (!durationMinutes) {
      setError(t("log.durationRequired"));
      return;
    }
    if (!quality) {
      setError(t("log.qualityRequired"));
      return;
    }
    setError("");
    try {
      const saved = await saveMutation.mutateAsync({
        input: {
          durationMinutes,
          quality,
          notes,
          loggedAt,
          loggedOffsetMinutes,
        },
        logId: editMode ? (logId ?? undefined) : undefined,
      });
      router.replace(`/tools/sleep/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("log.saveError"));
    }
  });

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background" style={roomStyle}>
        <View className="flex-1 justify-center">
          <LoadingState title={t("log.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingLog) {
    return (
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["bottom", "left", "right"]}
        style={roomStyle}
      >
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <ScreenHeader title={t("log.editTitle")} />
            <Text variant="muted">{t("detail.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    // The room wrapper carries the token re-pour; MobileFormScreen's own
    // bg-background surfaces re-resolve to the ink pour through it.
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
                <Text>{t("log.cancel")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button disabled={saving || !user} onPress={() => void handleSave()}>
                {saving ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{editMode ? t("log.update") : t("log.save")}</Text>
              </Button>
            </View>
          </View>
        }
      >
        {/* No breadcrumb eyebrow above the heading (design `2b`): the bar above
            carries the trail, so a ScreenHeader here would render it twice. */}
        <View className="gap-2">
          <Text variant="h1">{editMode ? t("log.editTitle") : t("log.title")}</Text>
          <Text variant="muted">{editMode ? t("log.editDescription") : t("log.description")}</Text>
        </View>

        <View className="gap-3">
          <Label>{t("log.durationLabel")}</Label>
          <DurationStepper
            value={durationMinutes ?? DEFAULT_DURATION_MINUTES}
            onChange={setDurationMinutes}
          />
        </View>

        {/* No "1 = very poor · 5 = excellent" hint any more: the words on the
            options are the legend, so a second one restates the scale in the
            numbers the words replaced. */}
        <View className="gap-3">
          <Label>{t("log.qualityLabel")}</Label>
          <QualityScale value={quality} onChange={setQuality} />
        </View>

        <View className="gap-2">
          <Label>{t("log.whenLabel")}</Label>
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
            accessibilityLabel={t("log.whenLabel")}
          />
        </View>

        <View className="gap-2">
          <Label>{t("log.notesLabel")}</Label>
          <Textarea
            accessibilityLabel={t("log.notesLabel")}
            onChangeText={setNotes}
            placeholder={t("log.notesPlaceholder")}
            value={notes}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      </MobileFormScreen>
    </View>
  );
}
