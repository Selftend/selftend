import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import {
  useExposureItems,
  useExposureSessions,
  useHierarchy,
  useSaveExposureSession,
} from "@/src/features/exposure/queries";
import type { ExposureItem } from "@/src/features/exposure/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

interface SessionFormState {
  preSuds: number | null;
  postSuds: number | null;
  durationMinutes: string;
  safetyBehaviorsUsed: boolean;
  safetyBehaviorDescription: string;
  notes: string;
}

const emptySession: SessionFormState = {
  preSuds: null,
  postSuds: null,
  durationMinutes: "",
  safetyBehaviorsUsed: false,
  safetyBehaviorDescription: "",
  notes: "",
};

function SessionSheet({
  hierarchyId,
  item,
  onClose,
  visible,
}: {
  hierarchyId: string;
  item: ExposureItem | null;
  onClose: () => void;
  visible: boolean;
}) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const reduceMotionEnabled = useReduceMotionEnabled();
  const saveMutation = useSaveExposureSession(user?.id ?? null, hierarchyId);
  const [form, setForm] = useState<SessionFormState>(emptySession);

  const handleSave = async () => {
    if (!item || form.preSuds === null || form.postSuds === null) return;
    const duration = parseInt(form.durationMinutes || "0", 10);
    if (Number.isNaN(duration)) return;
    try {
      await saveMutation.mutateAsync({
        itemId: item.id,
        input: {
          preSuds: form.preSuds,
          postSuds: form.postSuds,
          durationMinutes: duration,
          safetyBehaviorsUsed: form.safetyBehaviorsUsed,
          safetyBehaviorDescription: form.safetyBehaviorDescription,
          notes: form.notes,
        },
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      setForm(emptySession);
      onClose();
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  };

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onClose}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-6 p-6 pb-12">
          <View className="gap-2">
            <Text variant="h2">{t("exposure.session.title")}</Text>
            {item ? <Text variant="muted">{item.description}</Text> : null}
          </View>

          <View className="gap-2">
            <Label>{t("exposure.session.preSuds")}</Label>
            <Text variant="muted">{t("exposure.session.preSudsHint")}</Text>
            <NumberRating
              max={100}
              min={0}
              step={10}
              value={form.preSuds}
              onChange={(n) => setForm((p) => ({ ...p, preSuds: n }))}
            />
          </View>

          <View className="gap-2">
            <Label>{t("exposure.session.postSuds")}</Label>
            <Text variant="muted">{t("exposure.session.postSudsHint")}</Text>
            <NumberRating
              max={100}
              min={0}
              step={10}
              value={form.postSuds}
              onChange={(n) => setForm((p) => ({ ...p, postSuds: n }))}
            />
          </View>

          <View className="gap-2">
            <Label>{t("exposure.session.duration")}</Label>
            <Input
              accessibilityLabel={t("exposure.session.duration")}
              keyboardType="numeric"
              onChangeText={(text) => setForm((p) => ({ ...p, durationMinutes: text }))}
              placeholder="0"
              value={form.durationMinutes}
            />
          </View>

          <View className="flex-row items-center gap-3">
            <Checkbox
              accessibilityLabel={t("exposure.session.safetyBehaviorsUsed")}
              checked={form.safetyBehaviorsUsed}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, safetyBehaviorsUsed: Boolean(checked) }))
              }
            />
            <Label
              onPress={() =>
                setForm((p) => ({ ...p, safetyBehaviorsUsed: !p.safetyBehaviorsUsed }))
              }
            >
              {t("exposure.session.safetyBehaviorsUsed")}
            </Label>
          </View>

          {form.safetyBehaviorsUsed ? (
            <View className="gap-2">
              <Label>{t("exposure.session.safetyBehaviorDescription")}</Label>
              <Textarea
                accessibilityLabel={t("exposure.session.safetyBehaviorDescription")}
                onChangeText={(text) =>
                  setForm((p) => ({ ...p, safetyBehaviorDescription: text }))
                }
                placeholder={t("exposure.session.safetyBehaviorPlaceholder")}
                value={form.safetyBehaviorDescription}
              />
            </View>
          ) : null}

          <View className="gap-2">
            <Label>{t("exposure.session.notes")}</Label>
            <Textarea
              accessibilityLabel={t("exposure.session.notes")}
              onChangeText={(text) => setForm((p) => ({ ...p, notes: text }))}
              placeholder={t("exposure.session.notesPlaceholder")}
              value={form.notes}
            />
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button onPress={onClose} variant="ghost">
                <Text>{t("exposure.session.cancel")}</Text>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                disabled={
                  form.preSuds === null ||
                  form.postSuds === null ||
                  saveMutation.isPending
                }
                onPress={() => void handleSave()}
              >
                {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                <Text>{t("exposure.session.save")}</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ItemRow({
  item,
  onStart,
}: {
  item: ExposureItem;
  onStart: () => void;
}) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const { data: sessions } = useExposureSessions(user?.id ?? null, item.id);
  const completed = item.completedAt !== null;

  return (
    <Card>
      <CardHeader>
        <View className="flex-row items-start gap-3">
          <View className="flex-1">
            <CardTitle>{item.description}</CardTitle>
            <CardDescription>
              {t("exposure.item.sudsLabel", { value: item.sudsRating })}
              {completed ? ` · ${t("exposure.item.completed")}` : ""}
            </CardDescription>
          </View>
        </View>
      </CardHeader>
      <CardContent>
        <View className="gap-3">
          {sessions && sessions.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-medium">
                {t("exposure.item.recentSessions")}
              </Text>
              {sessions.slice(0, 3).map((s) => (
                <Text key={s.id} variant="muted" className="text-xs">
                  {t("exposure.item.sessionSummary", {
                    pre: s.preSuds,
                    post: s.postSuds,
                    duration: s.durationMinutes,
                  })}
                </Text>
              ))}
            </View>
          ) : null}
          <Button onPress={onStart} size="sm" variant={completed ? "outline" : "default"}>
            <Text>
              {completed ? t("exposure.item.repeat") : t("exposure.item.start")}
            </Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

export default function ExposureHierarchyDetailScreen() {
  const { t } = useTranslation("cbt");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [activeItem, setActiveItem] = useState<ExposureItem | null>(null);

  const { data: hierarchy, isLoading: hierarchyLoading } = useHierarchy(
    user?.id ?? null,
    id ?? null,
  );
  const { data: items, isLoading: itemsLoading } = useExposureItems(
    user?.id ?? null,
    id ?? null,
  );

  if (hierarchyLoading || itemsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center">
          <LoadingState title={t("exposure.loading")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hierarchy) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center p-6">
          <Text variant="h2">{t("exposure.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SessionSheet
        hierarchyId={hierarchy.id}
        item={activeItem}
        onClose={() => setActiveItem(null)}
        visible={activeItem !== null}
      />
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="grow p-6">
          <View className="gap-6">
            <View className="gap-2">
              <Text variant="h1">{hierarchy.title}</Text>
              <Text variant="muted">{hierarchy.anxietyType}</Text>
            </View>

            {items && items.length > 0 ? (
              <View className="gap-3">
                <Text variant="h3">{t("exposure.itemsLabel")}</Text>
                {items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onStart={() => setActiveItem(item)}
                  />
                ))}
              </View>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("exposure.noItems")}</CardTitle>
                </CardHeader>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
