import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import {
  useCoreBelief,
  useDeleteCoreBelief,
  useUpdateBeliefStrength,
} from "@/src/features/beliefs/queries";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ScreenHeader } from "@/src/components/app/screen-header";

export default function BeliefDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: belief, isLoading } = useCoreBelief(user?.id ?? null, id ?? null);
  const strengthMutation = useUpdateBeliefStrength(user?.id ?? null);
  const deleteMutation = useDeleteCoreBelief(user?.id ?? null);
  const handleDelete = async () => {
    if (!belief) return;
    await deleteMutation.mutateAsync(belief.id);
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/beliefs" as Parameters<typeof router.replace>[0]);
  };

  const [original, setOriginal] = useState<number | null>(null);
  const [alternative, setAlternative] = useState<number | null>(null);

  useEffect(() => {
    if (belief) {
      setOriginal(belief.originalBeliefStrength);
      setAlternative(belief.alternativeBeliefStrength);
    }
  }, [belief]);

  const handleSaveStrength = async () => {
    if (!belief || original === null || alternative === null) return;
    try {
      await strengthMutation.mutateAsync({
        beliefId: belief.id,
        originalBeliefStrength: original,
        alternativeBeliefStrength: alternative,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("beliefs.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!belief) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("beliefs.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderList = (label: string, items: string[]) => (
    <View className="gap-2">
      <Text className="font-medium">{label}</Text>
      {items.length === 0 ? (
        <Text variant="muted">{t("beliefs.listEmpty")}</Text>
      ) : (
        items.map((item, index) => (
          <Text key={index} variant="muted">
            • {item}
          </Text>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("beliefs.detailTitle")} />
            <Text variant="h3">{belief.beliefStatement}</Text>
          </View>

          <Card>
            <CardHeader>
              <CardTitle>{t("beliefs.alternativeBelief")}</CardTitle>
              <CardDescription>{belief.alternativeBelief}</CardDescription>
            </CardHeader>
          </Card>

          {belief.triggeringSituations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("beliefs.triggeringSituations")}</CardTitle>
              </CardHeader>
              <CardContent>
                {belief.triggeringSituations.map((s, i) => (
                  <Text key={i} variant="muted">
                    • {s}
                  </Text>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("beliefs.evidence")}</CardTitle>
            </CardHeader>
            <CardContent>
              <View className="gap-4">
                {renderList(t("beliefs.evidenceFor"), belief.evidenceFor)}
                {renderList(t("beliefs.evidenceAgainst"), belief.evidenceAgainst)}
              </View>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("beliefs.strengthTracker")}</CardTitle>
              <CardDescription>{t("beliefs.strengthTrackerDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="gap-5">
                <View className="gap-2">
                  <Label>{t("beliefs.originalStrength")}</Label>
                  <NumberRating
                    max={100}
                    min={0}
                    step={10}
                    value={original}
                    onChange={setOriginal}
                  />
                </View>
                <View className="gap-2">
                  <Label>{t("beliefs.alternativeStrength")}</Label>
                  <NumberRating
                    max={100}
                    min={0}
                    step={10}
                    value={alternative}
                    onChange={setAlternative}
                  />
                </View>
                <Button
                  disabled={
                    strengthMutation.isPending ||
                    (original === belief.originalBeliefStrength &&
                      alternative === belief.alternativeBeliefStrength)
                  }
                  onPress={() => void handleSaveStrength()}
                >
                  <Text>{t("beliefs.saveStrength")}</Text>
                </Button>
              </View>
            </CardContent>
          </Card>

          {belief.reinforcementPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("beliefs.reinforcementPlan")}</CardTitle>
                <CardDescription>{belief.reinforcementPlan}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {belief.nextReviewDate ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("beliefs.nextReviewDate")}</CardTitle>
                <CardDescription>{belief.nextReviewDate}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <View className="gap-3">
            <Button
              onPress={() => router.push(`/modules/cbt/beliefs/new?beliefId=${belief.id}`)}
              variant="secondary"
            >
              <Text>{t("common:edit")}</Text>
            </Button>
            <DeleteEntryButton
              label={t("common:delete")}
              title={t("beliefs.deleteTitle")}
              message={t("beliefs.deleteMessage")}
              onConfirm={handleDelete}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
