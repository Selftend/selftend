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
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { lifeDomains } from "@/src/constants/life-domains";
import { useValuesProfiles, useUpsertValuesProfile } from "@/src/features/values/queries";
import type { ValuesProfile } from "@/src/features/values/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

interface DomainEditorProps {
  domain: string;
  existing: ValuesProfile | undefined;
  userId: string;
}

function DomainEditor({ domain, existing, userId }: DomainEditorProps) {
  const { t } = useTranslation("cbt");
  const showToast = useToastStore((state) => state.showToast);
  const upsertMutation = useUpsertValuesProfile(userId);

  const [importance, setImportance] = useState<number | null>(existing?.importanceRating ?? null);
  const [satisfaction, setSatisfaction] = useState<number | null>(
    existing?.satisfactionRating ?? null,
  );
  const [note, setNote] = useState(existing?.domainNote ?? "");
  const [saved, setSaved] = useState(Boolean(existing));

  const gap = importance !== null && satisfaction !== null ? importance - satisfaction : null;

  const handleSave = async () => {
    if (importance === null || satisfaction === null) return;
    try {
      await upsertMutation.mutateAsync({
        lifeDomain: domain,
        importanceRating: importance,
        satisfactionRating: satisfaction,
        domainNote: note,
      });
      setSaved(true);
      showToast({ title: t("common:feedback.saved"), tone: "success" });
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`goals.domain.${domain}`)}</CardTitle>
        {gap !== null ? (
          <View className="flex-row items-center gap-2">
            <View className="h-2 overflow-hidden rounded-full bg-muted flex-1">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${(importance! / 5) * 100}%` }}
              />
            </View>
            {gap > 0 ? (
              <Text className="text-xs text-muted-foreground">{t("values.gap", { gap })}</Text>
            ) : null}
          </View>
        ) : null}
      </CardHeader>
      <CardContent className="gap-4">
        <View className="gap-2">
          <Label>{t("values.importance")}</Label>
          <NumberRating max={5} value={importance} onChange={setImportance} />
        </View>

        <View className="gap-2">
          <Label>{t("values.satisfaction")}</Label>
          <NumberRating max={5} value={satisfaction} onChange={setSatisfaction} />
        </View>

        <View className="gap-2">
          <Label>{t("values.note")}</Label>
          <Textarea
            accessibilityLabel={t("values.note")}
            onChangeText={setNote}
            placeholder={t("values.notePlaceholder")}
            value={note}
          />
        </View>

        <Button
          disabled={!importance || !satisfaction || upsertMutation.isPending}
          onPress={() => void handleSave()}
        >
          {upsertMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
          <Text>{saved ? t("values.update") : t("values.save")}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ValuesScreen() {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: profiles, isLoading } = useValuesProfiles(user?.id ?? null);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("values.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{t("values.title")}</Text>
            <Text variant="muted">{t("values.description")}</Text>
          </View>

          {lifeDomains.map((domain) => (
            <DomainEditor
              key={domain}
              domain={domain}
              existing={profiles?.find((p) => p.lifeDomain === domain)}
              userId={user!.id}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
