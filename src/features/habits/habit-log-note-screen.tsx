import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { useHabit, useHabitLogs, useUpsertHabitLogNote } from "@/src/features/habits/queries";
import { HABIT_NOTE_MAX } from "@/src/features/habits/schemas";
import { todayLocalDateString } from "@/src/features/habits/scheduling";
import { useSession } from "@/src/providers/session-provider";

interface HabitLogNoteScreenProps {
  habitId: string;
  dateOverride?: string;
}

export function HabitLogNoteScreen({ habitId, dateOverride }: HabitLogNoteScreenProps) {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const dateStr = dateOverride ?? todayLocalDateString();
  const { data: habit } = useHabit(userId, habitId);
  const { data: logs } = useHabitLogs(userId, { habitId, sinceDate: dateStr, limit: 5 });
  const upsertNote = useUpsertHabitLogNote(userId);

  const existing = useMemo(
    () => (logs ?? []).find((log) => log.loggedOn === dateStr),
    [logs, dateStr],
  );

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (existing) {
      setNote(existing.note);
    }
  }, [existing]);

  async function handleSave() {
    if (!user) return;
    setError(undefined);
    try {
      await upsertNote.mutateAsync({ habitId, loggedOn: dateStr, note });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("log.saveError"));
    }
  }

  const saving = upsertNote.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow gap-6 p-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <BackButton
              fallbackHref="/tools/habits"
              mode="history"
              showLabel={false}
              className="-ml-2"
            />
            <Text variant="h1">{t("log.title")}</Text>
          </View>
          <Text variant="muted">{t("log.subtitle")}</Text>
          {habit ? (
            <Text variant="muted" className="text-xs">
              {habit.name} · {dateStr}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Label>{t("log.title")}</Label>
          <Textarea
            accessibilityLabel={t("log.title")}
            maxLength={HABIT_NOTE_MAX}
            onChangeText={setNote}
            placeholder={t("log.placeholder")}
            value={note}
          />
        </View>

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={() => router.back()} variant="ghost">
              <Text>{t("cta.cancel")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button disabled={saving || !user} onPress={() => void handleSave()}>
              {saving ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{saving ? t("cta.saving") : t("cta.save")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
