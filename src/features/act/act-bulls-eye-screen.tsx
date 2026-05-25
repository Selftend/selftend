import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { NumberRating } from "@/src/components/app/number-rating";
import { useBullsEyeSnapshots, useSaveBullsEyeSnapshot } from "@/src/features/act/queries";
import { ACT_LIFE_DOMAINS, type ACTLifeDomain } from "@/src/features/act/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type Ratings = Record<ACTLifeDomain, number | null>;

const INITIAL_RATINGS: Ratings = {
  work: null,
  leisure: null,
  relationships: null,
  personalGrowth: null,
};

export default function ActBullsEyeScreen() {
  const { t } = useTranslation(["act", "common"]);
  const { user } = useSession();
  const saveMutation = useSaveBullsEyeSnapshot(user?.id ?? null);
  const { data: snapshots } = useBullsEyeSnapshots(user?.id ?? null);
  const showToast = useToastStore((state) => state.showToast);

  const [ratings, setRatings] = useState<Ratings>(INITIAL_RATINGS);
  const [submitError, setSubmitError] = useState("");

  function setRating(domain: ACTLifeDomain, value: number | null) {
    setRatings((prev) => ({ ...prev, [domain]: value }));
  }

  async function handleSave() {
    if (!user) return;
    setSubmitError("");
    const domainsToSave = ACT_LIFE_DOMAINS.filter((d) => ratings[d] !== null);
    if (domainsToSave.length === 0) return;
    try {
      await Promise.all(
        domainsToSave.map((domain) =>
          saveMutation.mutateAsync({ domain, alignmentRating: ratings[domain]! }),
        ),
      );
      showToast({ title: t("act:values.bullsEye.savedToast"), tone: "success" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("act:values.bullsEye.saveProblem");
      setSubmitError(message);
    }
  }

  const anyRated = ACT_LIFE_DOMAINS.some((d) => ratings[d] !== null);

  const recentSnapshots = snapshots?.slice(0, 12) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("act:values.bullsEye.title")} />
            <Text variant="muted">{t("act:values.bullsEye.subtitle")}</Text>
          </View>

          {/* Domain ratings */}
          <View className="gap-6">
            {ACT_LIFE_DOMAINS.map((domain) => (
              <View key={domain} className="gap-3">
                <View className="gap-1">
                  <Label>{t(`act:values.bullsEye.${domain}`)}</Label>
                </View>
                <NumberRating
                  min={1}
                  max={10}
                  step={1}
                  value={ratings[domain]}
                  onChange={(v) => setRating(domain, v)}
                />
              </View>
            ))}
          </View>

          {submitError ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("act:values.bullsEye.saveProblem")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text variant="muted">{submitError}</Text>
              </CardContent>
            </Card>
          ) : null}

          <Button disabled={saveMutation.isPending || !anyRated} onPress={() => void handleSave()}>
            {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
            <Text>
              {saveMutation.isPending
                ? t("act:values.bullsEye.saving")
                : t("act:values.bullsEye.saveAll")}
            </Text>
          </Button>

          {/* History */}
          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("act:values.bullsEye.historyTitle")}
            </Text>
            {recentSnapshots.length === 0 ? (
              <Text variant="muted">{t("act:values.bullsEye.noHistory")}</Text>
            ) : (
              <View className="gap-2">
                {recentSnapshots.map((snap) => (
                  <View
                    key={snap.id}
                    className="flex-row items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium">
                        {t(`act:values.bullsEye.${snap.domain}`)}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {new Date(snap.reviewedAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <AlignmentPill rating={snap.alignmentRating} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlignmentPill({ rating }: { rating: number }) {
  return (
    <View className="items-center justify-center rounded-full bg-act/15 px-3 py-1">
      <Text className="text-sm font-bold text-act">{rating}/10</Text>
    </View>
  );
}
