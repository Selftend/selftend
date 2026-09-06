import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router, type Href } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { DEFAULT_INTERACTIVE_HIT_SLOP, enterKeyActivationProps } from "@/src/lib/accessibility";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { FORM_COLUMN } from "@/src/lib/layout";
import { CHROME_MARK } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";
import { findPick, pickLabelKey } from "@/src/features/dbt/coping-plan-registry";
import { useCopingPlan } from "@/src/features/dbt/queries";
import type { CopingPlanItem } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";

/**
 * `/modules/dbt/pause` - four short steps between the urge and what comes next
 * (spec §3.1.2, the book's four-beat interrupt).
 *
 * ☠️ **It records nothing.** No row, no count, no routine step, no programme
 * signal, no "you paused today". A log of the moments a person nearly lost it
 * is a stored health fact with a per-use count attached, and S3 forbids it. The
 * flow's whole output is that the person did the four steps.
 *
 * ☠️ **Nothing here branches on the person's state** (S2). Step one names
 * danger in a sentence that is identical for every person on every run, and
 * points at the bar below it. It is not a question, there is no "are you safe?",
 * and no answer changes what the next step says.
 *
 * **Stop is visible on every step**, ends the flow at once and returns where
 * the person came from - and the back gesture is Stop, because a four-step
 * flow that argues with someone trying to leave it is the opposite of the
 * skill it is teaching. Nothing is saved, so there is nothing to confirm.
 */

type StepKey = "danger" | "breathe" | "look" | "pick";

const STEPS: StepKey[] = ["danger", "breathe", "look", "pick"];

export default function DbtPauseScreen() {
  const { t } = useTranslation("dbt");
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  const { data: plan } = useCopingPlan(user?.id ?? null);
  const [index, setIndex] = useState(0);

  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;

  // Stop and the top bar's Close land in the same place: back where the person
  // came from, with nothing saved and nothing said about it.
  const stop = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/modules/dbt");
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar leading="close" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "grow gap-6")}>
          <View className="gap-2">
            <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
              {t("pause.stepOf", { current: index + 1, total: STEPS.length })}
            </Text>
            <Text variant="h1" className="text-[26px] font-bold leading-tight tracking-tight">
              {t(`pause.steps.${step}.title`)}
            </Text>
            <Text className="text-[15px] leading-relaxed text-muted-foreground">
              {t(`pause.steps.${step}.body`)}
            </Text>
          </View>

          {step === "look" ? (
            <View className="gap-3">
              {(["promptOne", "promptTwo"] as const).map((key) => (
                <Text key={key} className="text-[20px] font-bold leading-snug tracking-tight">
                  {t(`pause.steps.look.${key}`)}
                </Text>
              ))}
            </View>
          ) : null}

          {step === "pick" ? (
            <PickStep plan={plan?.plan.items} fallback={plan?.plan.fallback} />
          ) : null}

          <View className="grow" />

          <CrisisSupportBar />

          <View className="gap-3">
            <View className="flex-row gap-3">
              {index > 0 ? (
                <Button variant="outline" className="flex-1" onPress={() => setIndex(index - 1)}>
                  <Text>{t("pause.back")}</Text>
                </Button>
              ) : null}
              {!isLast ? (
                <Button className="flex-1" onPress={() => setIndex(index + 1)}>
                  <Text>{t("pause.next")}</Text>
                </Button>
              ) : null}
            </View>
            {/* Plain, full width, always visible - never behind a menu and never
                behind a confirmation. */}
            <Button variant="ghost" onPress={stop}>
              <Text>{t("pause.stop")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function PickStep({ plan: items, fallback }: { plan?: CopingPlanItem[]; fallback?: string[] }) {
    const byId = new Map((items ?? []).map((item) => [item.id, item]));
    const first = (fallback ?? [])
      .map((id) => byId.get(id))
      .filter((item): item is CopingPlanItem => item !== undefined)
      .slice(0, 3);
    const hasPlan = (items?.length ?? 0) > 0;

    const rowLabel = (item: CopingPlanItem) => {
      if (item.kind === "own") return item.text?.trim() || null;
      const pick = findPick(item.pickKey);
      return pick ? t(pickLabelKey(pick.key)) : null;
    };

    return (
      <View className="gap-4">
        <Text variant="muted" className="text-[13px]">
          {hasPlan ? t("pause.steps.pick.withPlan") : t("pause.steps.pick.withoutPlan")}
        </Text>

        <View className="gap-2">
          {hasPlan
            ? first.map((item) => {
                const text = rowLabel(item);
                if (!text) return null;
                const route = item.kind === "pick" ? findPick(item.pickKey)?.route : undefined;
                return (
                  <PickRow
                    key={item.id}
                    text={text}
                    route={route}
                    onOpen={route ? () => pushWithOrigin(route) : undefined}
                  />
                );
              })
            : (
                [
                  { key: "breathing", route: "/tools/breathing" as Href },
                  { key: "stepOutside", route: undefined },
                ] as const
              ).map((fallbackPick) => (
                <PickRow
                  key={fallbackPick.key}
                  text={t(`pause.defaults.${fallbackPick.key}`)}
                  route={fallbackPick.route}
                  onOpen={
                    fallbackPick.route ? () => pushWithOrigin(fallbackPick.route!) : undefined
                  }
                />
              ))}
        </View>

        <Button variant="outline" onPress={() => pushWithOrigin("/modules/dbt/coping-plan")}>
          <Text>{hasPlan ? t("pause.steps.pick.openPlan") : t("pause.steps.pick.buildPlan")}</Text>
        </Button>
      </View>
    );
  }
}

function PickRow({ text, route, onOpen }: { text: string; route?: Href; onOpen?: () => void }) {
  if (!route || !onOpen) {
    return (
      <View className="rounded-xl border border-border bg-card px-4 py-3">
        <Text className="text-[15px] font-semibold">{text}</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onOpen}
      {...enterKeyActivationProps(onOpen)}
      className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 active:bg-accent/40"
    >
      <Text className="flex-1 text-[15px] font-semibold">{text}</Text>
      <Icon name="north-east" size={15} className={CHROME_MARK} />
    </Pressable>
  );
}
