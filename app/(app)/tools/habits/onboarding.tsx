import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { HabitsOnboarding } from "@/src/components/app/habits-onboarding-modal";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { useSession } from "@/src/providers/session-provider";

export default function HabitsOnboardingRoute() {
  const { t } = useTranslation("habits");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const [error, setError] = useState<string | undefined>();

  async function handleComplete() {
    if (!preferences) return;
    setError(undefined);
    try {
      await updatePreferences.mutateAsync(
        mergeUserPreferences(preferences, { habitsOnboardingCompleted: true }),
      );
      router.replace("/tools/habits" as Parameters<typeof router.replace>[0]);
    } catch (e) {
      const fallback = t("onboarding.finish.error");
      const detail = e instanceof Error ? e.message : null;
      setError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <HabitsOnboarding
      visible
      isPending={updatePreferences.isPending}
      errorMessage={error}
      onComplete={() => void handleComplete()}
      onDismiss={() => router.replace("/tools/habits" as Parameters<typeof router.replace>[0])}
    />
  );
}
