import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useHabits } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import {
  isConcernKey,
  START_HERE_TARGETS,
  type ConcernKey,
} from "@/src/features/onboarding/concerns";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { useSession } from "@/src/providers/session-provider";

// Whether the recommended feature has already been used (card auto-retires).
// stress-overwhelm (drop anchor) has no usage log - dismiss-only.
function useStartHereRetired(userId: string | null, concern: ConcernKey | null): boolean {
  const wantsCbt = concern === "anxious-thoughts" || concern === "low-mood";
  const thoughtRecords = useThoughtRecords(wantsCbt ? userId : null);
  const sleepLogs = useSleepLogs(concern === "sleep" ? userId : null, 1);
  const habits = useHabits(concern === "habits" ? userId : null);
  const journalEntries = useJournalEntries(concern === "reflection" ? userId : null, 1);

  switch (concern) {
    case "anxious-thoughts":
    case "low-mood":
      return (thoughtRecords.data?.length ?? 0) > 0;
    case "sleep":
      return (sleepLogs.data?.length ?? 0) > 0;
    case "habits":
      return (habits.data?.length ?? 0) > 0;
    case "reflection":
      return (journalEntries.data?.length ?? 0) > 0;
    default:
      return false;
  }
}

export function StartHereCard() {
  const { t } = useTranslation("settings");
  const router = useRouter();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: preferences } = useUserPreferences(userId);
  const dismissMutation = useUpdateOnboardingPreferences(userId);

  const firstConcern = (preferences?.selectedConcerns ?? []).find(isConcernKey) ?? null;
  const retired = useStartHereRetired(userId, firstConcern);

  if (
    !preferences?.appOnboardingCompleted ||
    !firstConcern ||
    preferences.startHereDismissedAt !== null ||
    retired
  ) {
    return null;
  }

  const persistDismissal = () => {
    // Best-effort: a failed write just means the card shows again next session.
    dismissMutation.mutateAsync({ startHereDismissedAt: new Date().toISOString() }).catch(() => {});
  };

  const openTarget = () => {
    persistDismissal();
    router.push(START_HERE_TARGETS[firstConcern] as Href);
  };

  return (
    <View className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text variant="eyebrow">{t("onboarding.startHere.title")}</Text>
        <Pressable
          accessibilityLabel={t("onboarding.startHere.dismiss")}
          accessibilityRole="button"
          hitSlop={8}
          onPress={persistDismissal}
        >
          <Icon name="close" className="size-4 text-muted-foreground" />
        </Pressable>
      </View>
      <Text className="mt-2 text-sm">{t(`onboarding.startHere.body.${firstConcern}`)}</Text>
      <Button className="mt-3 self-start" size="sm" onPress={openTarget}>
        <Text>{t("onboarding.startHere.cta")}</Text>
      </Button>
    </View>
  );
}
