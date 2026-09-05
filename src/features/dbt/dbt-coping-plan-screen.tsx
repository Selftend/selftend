import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ErrorState, LoadingState } from "@/src/components/app/screen-state";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { FORM_COLUMN } from "@/src/lib/layout";
import { cn } from "@/lib/utils";
import { CopingPlanCard } from "@/src/features/dbt/coping-plan-card";
import { useCopingPlan } from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/coping-plan` - the card when a plan exists, the builder's
 * invitation when none does (spec §3.1.1).
 *
 * One route rather than two, because the person arriving here in a hard moment
 * should not have to know which state they are in: they tap Coping plan and get
 * either their plan or the one sentence explaining what a plan is.
 *
 * **Offline:** the plan query is prefetched when the module home mounts, so the
 * shipped persisted cache holds it for a day on iOS and Android. The web cache
 * is memory-only by design (the shared-computer refusal), so a cold web visit
 * needs a connection - which is what the error state below says, once, without
 * naming a platform.
 */
export default function DbtCopingPlanScreen() {
  const { t } = useTranslation("dbt");
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data: plan, isPending, isError, refetch } = useCopingPlan(user?.id ?? null);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-6")}>
          <ScreenHeader title={t("copingPlan.title")} />

          {isPending ? (
            <LoadingState title={t("copingPlan.title")} />
          ) : isError ? (
            <View className="gap-4">
              <ErrorState
                title={t("copingPlan.loadErrorTitle")}
                description={t("copingPlan.loadErrorBody")}
              />
              <Button variant="outline" onPress={() => void refetch()}>
                <Text>{t("copingPlan.retry")}</Text>
              </Button>
            </View>
          ) : plan ? (
            <CopingPlanCard
              plan={plan.plan}
              footer={
                <View className="items-start">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => pushWithOrigin("/modules/dbt/coping-plan/edit")}
                  >
                    <Icon name="edit" className="size-4" />
                    <Text>{t("copingPlan.edit")}</Text>
                  </Button>
                </View>
              }
            />
          ) : (
            <View className="gap-5">
              <Text className="text-[17px] font-semibold">{t("copingPlan.introTitle")}</Text>
              <Text variant="muted" className="text-[15px] leading-relaxed">
                {t("copingPlan.introBody")}
              </Text>
              <Text variant="muted" className="text-[13px]">
                {t("copingPlan.introAside")}
              </Text>
              <Button onPress={() => pushWithOrigin("/modules/dbt/coping-plan/edit")}>
                <Text>{t("copingPlan.build")}</Text>
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
