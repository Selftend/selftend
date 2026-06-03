import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Text } from "@/src/components/react-native-reusables/text";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { AccessibleCardLink } from "@/src/components/app/accessible-card-link";
import {
  CBT_CONCERNS,
  type CbtConcern,
  recommendedStrategiesFor,
} from "@/src/features/cbt/concerns";
import { useCbtConcerns } from "@/src/features/cbt/use-cbt-concerns";
import { STRATEGY_LINKS } from "@/src/features/cbt/strategies";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

export default function FocusAreasScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { concerns: saved, saveConcerns, isPending } = useCbtConcerns(user?.id ?? null);

  const [selected, setSelected] = useState<CbtConcern[]>([]);
  useEffect(() => {
    setSelected(saved);
    // run once when saved first resolves; saved is stable array content from query cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.length]);

  const toggle = (concern: CbtConcern) =>
    setSelected((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );

  const recommended = recommendedStrategiesFor(selected);

  const persist = async (concerns: CbtConcern[]) => {
    try {
      await saveConcerns(concerns);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/modules/cbt" as Parameters<typeof router.replace>[0]);
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  return (
    <MobileFormScreen
      footer={
        <View className="gap-3">
          <Button disabled={isPending} onPress={() => void persist(selected)}>
            <Text>{isPending ? t("focusAreas.saving") : t("focusAreas.save")}</Text>
          </Button>
          <Button variant="ghost" disabled={isPending} onPress={() => void persist([])}>
            <Text>{t("focusAreas.skip")}</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          <ScreenHeader title={t("focusAreas.title")} />
          <Text variant="muted">{t("focusAreas.description")}</Text>
        </View>

        <View className="gap-3">
          {CBT_CONCERNS.map((concern) => {
            const checked = selected.includes(concern);
            return (
              <Pressable
                key={concern}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={t(`concerns.${concern}.label`)}
                onPress={() => toggle(concern)}
              >
                <Card className={checked ? "border-primary border-2" : ""}>
                  <CardHeader>
                    <View className="flex-row items-start gap-3">
                      <Checkbox
                        accessibilityLabel={t(`concerns.${concern}.label`)}
                        checked={checked}
                        onCheckedChange={() => toggle(concern)}
                      />
                      <View className="flex-1">
                        <CardTitle>{t(`concerns.${concern}.label`)}</CardTitle>
                        <CardDescription>{t(`concerns.${concern}.description`)}</CardDescription>
                      </View>
                    </View>
                  </CardHeader>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-3">
          <Text variant="h3">{t("focusAreas.recommendedTitle")}</Text>
          {recommended.length === 0 ? (
            <Text variant="muted">{t("focusAreas.recommendedEmpty")}</Text>
          ) : (
            recommended.map((key) => {
              const link = STRATEGY_LINKS[key];
              if (!link) return null;
              return (
                <AccessibleCardLink
                  key={key}
                  title={t(link.labelKey)}
                  onPress={() => router.push(link.route)}
                />
              );
            })
          )}
        </View>
      </View>
    </MobileFormScreen>
  );
}
