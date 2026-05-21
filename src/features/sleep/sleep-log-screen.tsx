import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { BackButton } from "@/src/components/app/back-button";
import { LoadingState } from "@/src/components/app/screen-state";
import { NumberRating } from "@/src/components/app/number-rating";
import { SLEEP_DURATION_OPTIONS } from "@/src/features/sleep/schemas";
import { useSleepLog, useSleepLogs, useSaveSleepLog } from "@/src/features/sleep/queries";
import type { SleepLog } from "@/src/features/sleep/types";
import { useSession } from "@/src/providers/session-provider";

interface SleepLogScreenProps {
  fallbackHref: Href;
  mode: "create" | "edit";
  logId?: string | null;
}

function DurationPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {SLEEP_DURATION_OPTIONS.map((minutes) => {
        const h = minutes / 60;
        const label = Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
        return (
          <Button
            key={minutes}
            size="sm"
            variant={value === minutes ? "default" : "outline"}
            onPress={() => onChange(minutes)}
            className="min-w-14"
          >
            <Text>{label}</Text>
          </Button>
        );
      })}
    </View>
  );
}

export function SleepLogScreen({ fallbackHref, mode, logId = null }: SleepLogScreenProps) {
  const { t } = useTranslation("sleep");
  const { user } = useSession();

  const { data: cachedList } = useSleepLogs(mode === "edit" ? (user?.id ?? null) : null, 50);
  const fromCache = logId ? (cachedList?.find((l) => l.id === logId) ?? null) : null;
  const { data: fetched, isLoading } = useSleepLog(
    mode === "edit" && !fromCache ? (user?.id ?? null) : null,
    mode === "edit" && !fromCache ? logId : null,
  );
  const existingLog: SleepLog | null = mode === "edit" ? (fromCache ?? fetched ?? null) : null;

  const saveMutation = useSaveSleepLog(user?.id ?? null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const editMode = mode === "edit";
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (!existingLog) return;
    setDurationMinutes(existingLog.durationMinutes);
    setQuality(existingLog.quality);
    setNotes(existingLog.notes);
    setError("");
  }, [existingLog]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  const handleSave = async () => {
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
        input: { durationMinutes, quality, notes },
        logId: editMode ? (logId ?? undefined) : undefined,
      });
      router.replace(`/tools/sleep/${saved.id}` as Parameters<typeof router.replace>[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("log.saveError"));
    }
  };

  if (editMode && !fromCache && isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("log.editTitle")} />
        </View>
      </SafeAreaView>
    );
  }

  if (editMode && !existingLog) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("log.editTitle")}</Text>
            </View>
            <Text variant="muted">{t("detail.notFound")}</Text>
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
            <BackButton showLabel={false} className="-ml-2" />
            <Text variant="h1">{editMode ? t("log.editTitle") : t("log.title")}</Text>
          </View>
          <Text variant="muted">{editMode ? t("log.editDescription") : t("log.description")}</Text>
        </View>

        <View className="gap-3">
          <Label>{t("log.durationLabel")}</Label>
          <DurationPicker value={durationMinutes} onChange={setDurationMinutes} />
        </View>

        <View className="gap-3">
          <Label>{t("log.qualityLabel")}</Label>
          <Text variant="muted" className="text-sm">
            {t("log.qualityHint")}
          </Text>
          <NumberRating min={1} max={5} value={quality} onChange={setQuality} />
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

        <View className="flex-row gap-3">
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
      </ScrollView>
    </SafeAreaView>
  );
}
