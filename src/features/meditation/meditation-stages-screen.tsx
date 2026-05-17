import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { cn } from "@/lib/utils";
import { STAGES } from "@/src/features/meditation/stages";
import { useMeditationProgramState } from "@/src/features/meditation/queries";
import { useSession } from "@/src/providers/session-provider";

const PHASE_HEADERS: {
  startStage: number;
  titleKey: string;
}[] = [
  { startStage: 1, titleKey: "module.stages.phaseNovice" },
  { startStage: 4, titleKey: "module.stages.phaseSkilled" },
  { startStage: 7, titleKey: "module.stages.phaseTransition" },
  { startStage: 8, titleKey: "module.stages.phaseAdept" },
];

const MILESTONE_AFTER: Record<number, string> = {
  3: "module.stages.milestone1Title",
  6: "module.stages.milestone2Title",
  7: "module.stages.milestone3Title",
  10: "module.stages.milestone4Title",
};

export default function MeditationStagesScreen() {
  const { t } = useTranslation("meditation");
  const { user } = useSession();
  const { data: programState } = useMeditationProgramState(user?.id ?? null);
  const currentStage = programState?.currentStage ?? 1;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("module.stages.title")}</Text>
            </View>
            <Text variant="muted">{t("module.stages.subtitle")}</Text>
          </View>

          <View className="gap-3">
            {STAGES.map((s) => (
              <View key={s.number} className="gap-3">
                {PHASE_HEADERS.some((p) => p.startStage === s.number) ? (
                  <Text className="mt-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(PHASE_HEADERS.find((p) => p.startStage === s.number)!.titleKey)}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/tools/meditation/stages/[n]",
                      params: { n: String(s.number) },
                    })
                  }
                >
                  <Card
                    className={cn(s.number === currentStage ? "border-primary" : "border-border")}
                  >
                    <CardContent className="flex-row items-center gap-4 pt-5">
                      <View
                        className={cn(
                          "size-10 items-center justify-center rounded-full border",
                          s.number === currentStage
                            ? "border-primary bg-primary"
                            : "border-border bg-card",
                        )}
                      >
                        <Text
                          className={cn(
                            "text-sm font-bold",
                            s.number === currentStage
                              ? "text-primary-foreground"
                              : "text-foreground",
                          )}
                        >
                          {s.number}
                        </Text>
                      </View>
                      <View className="flex-1 gap-0.5">
                        <Text className="font-semibold">{t(s.titleKey)}</Text>
                        <Text variant="muted" className="text-xs">
                          {t(s.goalKey)}
                        </Text>
                      </View>
                      {s.number === currentStage ? (
                        <View className="rounded-full bg-primary/15 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {t("module.stages.currentStageBadge")}
                          </Text>
                        </View>
                      ) : null}
                    </CardContent>
                  </Card>
                </Pressable>
                {MILESTONE_AFTER[s.number] ? (
                  <View className="rounded-md border border-dashed border-be/40 bg-be/5 p-3">
                    <Text className="text-xs font-semibold text-be">
                      {t(MILESTONE_AFTER[s.number])}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
