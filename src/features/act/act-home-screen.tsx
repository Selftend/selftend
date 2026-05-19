import { router, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ModuleHomeHeader } from "@/src/components/app/module-home-header";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import {
  ActInfo,
  ActWizard,
  type ActWizardResult,
} from "@/src/components/app/act-onboarding-modal";
import { useDefusionLogs, useUpsertACTProgramState } from "@/src/features/act/queries";
import type { ACTPrinciple } from "@/src/features/act/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useSession } from "@/src/providers/session-provider";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface PrincipleCard {
  key: ACTPrinciple;
  icon: MaterialIconName;
  route: Href | null;
}

const PRINCIPLE_CARDS: PrincipleCard[] = [
  { key: "defusion", icon: "filter-drama", route: "/modules/act/defusion" },
  { key: "expansion", icon: "open-in-full", route: "/modules/act/expansion" },
  { key: "connection", icon: "radio-button-checked", route: "/modules/act/connection" },
  { key: "observingSelf", icon: "visibility", route: "/modules/act/observing-self" },
  { key: "values", icon: "explore", route: "/modules/act/values" },
  { key: "committedAction", icon: "directions-run", route: "/modules/act/committed-action" },
];

function parseHour(time: string): number {
  const [h] = time.split(":");
  const n = Number(h);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 19;
}

function parseMinute(time: string): number {
  const [, m] = time.split(":");
  const n = Number(m);
  return Number.isFinite(n) && n >= 0 && n <= 59 ? n : 0;
}

export default function ActHomeScreen() {
  const { t } = useTranslation("act");
  const { user } = useSession();
  const userId = user?.id ?? null;
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences(userId);
  const { data: defusionLogs } = useDefusionLogs(userId, 50);
  const recentLogs = defusionLogs?.slice(0, 3) ?? [];

  const upsertProgramState = useUpsertACTProgramState(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const [forceInfo, setForceInfo] = useState(false);
  const [forceWizard, setForceWizard] = useState(false);
  const [wizardError, setWizardError] = useState<string | undefined>();

  async function handleWizardComplete(result: ActWizardResult) {
    if (!userId) return;
    setWizardError(undefined);
    try {
      await upsertProgramState.mutateAsync({
        primaryConcerns: result.primaryConcerns,
        activePrinciples: [result.startingPrinciple],
        onboardingCompletedAt: new Date().toISOString(),
        preferredCheckInTime: result.preferredCheckInTime,
      });
      if (preferences) {
        await updatePreferences.mutateAsync(
          mergeUserPreferences(preferences, {
            actRemindersEnabled: result.remindersEnabled,
            actReminderHour: parseHour(result.preferredCheckInTime),
            actReminderMinute: parseMinute(result.preferredCheckInTime),
          }),
        );
      }
      setForceWizard(false);
    } catch (error) {
      const fallback = t("onboarding.commit.error");
      const detail = error instanceof Error ? error.message : null;
      setWizardError(detail ? `${fallback} (${detail})` : fallback);
    }
  }

  if (prefsLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <>
      <ActInfo
        visible={forceInfo}
        onComplete={() => setForceInfo(false)}
        onDismiss={() => setForceInfo(false)}
      />
      <ActWizard
        visible={forceWizard}
        isPending={upsertProgramState.isPending || updatePreferences.isPending}
        errorMessage={wizardError}
        onComplete={(result) => void handleWizardComplete(result)}
        onDismiss={() => setForceWizard(false)}
      />
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.subtitle")}
              </Text>
              <ModuleHomeHeader
                title={t("home.title")}
                actions={[
                  { type: "tune", onPress: () => setForceWizard(true) },
                  { type: "notifications", targetKey: "act" },
                  { type: "info", onPress: () => setForceInfo(true) },
                ]}
              />
              <Text variant="muted" className="max-w-[64ch]">
                {t("home.description")}
              </Text>
            </View>

            {/* Quick actions */}
            <View className="gap-3">
              <Text variant="h3">{t("home.quickActionsTitle")}</Text>
              <View className="flex-row flex-wrap gap-2">
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button onPress={() => router.push("/modules/act/defusion/new")}>
                    <Icon name="filter-drama" className="size-4 text-primary-foreground" />
                    <Text>{t("home.defuseThought")}</Text>
                  </Button>
                </View>
                <View className="min-w-[160px] flex-1 basis-[160px]">
                  <Button
                    variant="secondary"
                    onPress={() => router.push("/tools/mood-tracker/new")}
                  >
                    <Text>{t("home.logMood")}</Text>
                  </Button>
                </View>
              </View>
            </View>

            {/* Six principles */}
            <View className="gap-3">
              <Text variant="h3">{t("home.principlesTitle")}</Text>
              <Text variant="muted" className="max-w-[64ch]">
                {t("home.principlesDescription")}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {PRINCIPLE_CARDS.map((card) => (
                  <PrincipleCardItem key={card.key} card={card} />
                ))}
              </View>
            </View>

            {/* Recent defusion logs */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("home.recentDefusionTitle")}
                </Text>
                {defusionLogs && defusionLogs.length > 0 ? (
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                    onPress={() => router.push("/modules/act/defusion")}
                  >
                    <Text className="text-sm text-act">{t("home.viewAllDefusion")}</Text>
                  </Pressable>
                ) : null}
              </View>

              {recentLogs.length === 0 ? (
                <Text variant="muted">{t("home.noDefusionLogs")}</Text>
              ) : (
                <View className="gap-2">
                  {recentLogs.map((log) => (
                    <View key={log.id} className="rounded-lg border border-border bg-card p-3">
                      <Text className="font-medium" numberOfLines={2}>
                        {log.fusedThought}
                      </Text>
                      <Text variant="muted" className="mt-1 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                        {log.fusionLevelBefore !== null && log.fusionLevelAfter !== null
                          ? `  ·  ${log.fusionLevelBefore} → ${log.fusionLevelAfter}`
                          : null}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <CrisisSupportCallout />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function PrincipleCardItem({ card }: { card: PrincipleCard }) {
  const { t } = useTranslation("act");
  const available = card.route !== null;

  const content = (
    <Card
      className={cn(
        "min-w-[240px] flex-1 basis-[240px]",
        available ? "border-act/30" : "opacity-60",
      )}
    >
      <CardHeader>
        <View className="mb-1 flex-row items-center gap-3">
          <View
            className={cn(
              "size-9 items-center justify-center rounded-lg",
              available ? "bg-act/15" : "bg-muted",
            )}
          >
            <Icon
              name={card.icon}
              className={cn("size-5", available ? "text-act" : "text-muted-foreground")}
            />
          </View>
          {!available ? (
            <Text className="text-xs text-muted-foreground">{t("home.comingSoon")}</Text>
          ) : null}
        </View>
        <CardTitle>{t(`principles.${card.key}.name`)}</CardTitle>
        <CardDescription>{t(`principles.${card.key}.desc`)}</CardDescription>
      </CardHeader>
    </Card>
  );

  if (!available) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`principles.${card.key}.name`)}
      accessibilityHint={t(`principles.${card.key}.desc`)}
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => router.push(card.route!)}
      className="min-w-[240px] flex-1 basis-[240px] active:opacity-80"
    >
      {content}
    </Pressable>
  );
}
