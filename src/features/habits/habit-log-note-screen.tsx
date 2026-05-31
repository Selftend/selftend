import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Button } from "@/src/components/react-native-reusables/button";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { useHabit, useHabitLogs, useUpsertHabitLogNote } from "@/src/features/habits/queries";
import { HABIT_NOTE_MAX } from "@/src/features/habits/schemas";
import { currentDateKey } from "@/src/features/habits/scheduling";
import { useSession } from "@/src/providers/session-provider";

interface HabitLogNoteScreenProps {
  habitId: string;
  dateOverride?: string;
}

export function HabitLogNoteScreen({ habitId, dateOverride }: HabitLogNoteScreenProps) {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const dateStr = dateOverride ?? currentDateKey();
  const { data: habit } = useHabit(userId, habitId);
  const { data: logs } = useHabitLogs(userId, { habitId, sinceDate: dateStr, limit: 5 });
  const upsertNote = useUpsertHabitLogNote(userId);

  const existing = (logs ?? []).find((log) => log.loggedOn === dateStr);

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const initializedRef = useRef(false);
  // Hydrate the field from the saved note exactly once, after the logs query first
  // settles. Re-running on later refetches would overwrite the user's in-progress text.
  useEffect(() => {
    if (initializedRef.current || logs === undefined) return;
    initializedRef.current = true;
    if (existing) setNote(existing.note);
  }, [logs, existing]);

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
          <ScreenHeader title={t("log.title")} />
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
