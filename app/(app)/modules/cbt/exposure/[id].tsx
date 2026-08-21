import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
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
import { KeyboardAwareScrollView } from "@/src/components/app/keyboard-aware-scroll-view";
import { NumberRating } from "@/src/components/app/number-rating";
import { LoadingState } from "@/src/components/app/screen-state";
import { DeleteEntryButton } from "@/src/components/app/delete-entry-button";
import {
  useDeleteHierarchy,
  useExposureItems,
  useExposureSessions,
  useHierarchy,
  useSaveExposureSession,
} from "@/src/features/exposure/queries";
import type { ExposureItem } from "@/src/features/exposure/types";
import { useInlineWriteError } from "@/src/lib/use-inline-write-error";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { KEYBOARD_AVOIDING_BEHAVIOR } from "@/src/lib/keyboard-avoiding";
import { ScreenHeader } from "@/src/components/app/screen-header";

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
  const saveMutation = useSaveExposureSession(user?.id ?? null, hierarchyId);
  const [form, setForm] = useState<SessionFormState>(emptySession);
  // Inline rather than a toast: this sheet stays OPEN on failure and is an opaque
  // native modal. `useInlineWriteError` carries the rule.
  const saveError = useInlineWriteError(t("exposure.session.saveError"));

  // Every route out of the sheet clears the error with it. The component is never
  // unmounted - only `visible` flips - so a failure left behind would still be on
  // screen the next time the sheet is opened.
  const closeSheet = () => {
    saveError.onStart();
    onClose();
  };

  const handleSave = useSingleFlight(async () => {
    if (!item || form.preSuds === null || form.postSuds === null) return;
    const duration = parseInt(form.durationMinutes || "0", 10);
    if (Number.isNaN(duration)) return;
    saveError.onStart();
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
      // ⚠️ The success path toasts and THEN closes the sheet, so its toast lands on a
      // screen with no modal over it. It is deliberately untouched (#1335).
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      setForm(emptySession);
      closeSheet();
    } catch {
      saveError.onError();
    }
  });

  return (
    // A form wearing a modal, so its Escape is an X under R5 rather than a
    // new rule of its own. ☠️ Declared inline in a route file, which is why no
    // sweep of the components directory ever found it.
    <PressShieldModal onEscape={closeSheet} onRequestClose={closeSheet} visible={visible}>
      {/* No "top": the wrapper's escape row already sits in the top inset. */}
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
        <KeyboardAvoidingView behavior={KEYBOARD_AVOIDING_BEHAVIOR} className="flex-1">
          <KeyboardAwareScrollView contentContainerClassName="gap-6 p-6 pb-12">
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

            {/* Sits with the buttons that raised it, the only place in an opaque
                modal a save failure can be seen at all. */}
            {saveError.message ? (
              <Text className="text-sm text-destructive" role="alert">
                {saveError.message}
              </Text>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button onPress={closeSheet} variant="ghost">
                  <Text>{t("exposure.session.cancel")}</Text>
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  disabled={
                    form.preSuds === null || form.postSuds === null || saveMutation.isPending
                  }
                  onPress={() => void handleSave()}
                >
                  {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
                  <Text>{t("exposure.session.save")}</Text>
                </Button>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PressShieldModal>
  );
}

function ItemRow({ item, onStart }: { item: ExposureItem; onStart: () => void }) {
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
              <Text className="text-xs font-medium">{t("exposure.item.recentSessions")}</Text>
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
            <Text>{completed ? t("exposure.item.repeat") : t("exposure.item.start")}</Text>
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
  const showToast = useToastStore((state) => state.showToast);
  const [activeItem, setActiveItem] = useState<ExposureItem | null>(null);
  const deleteError = useInlineWriteError(t("exposure.deleteError"));

  const { data: hierarchy, isLoading: hierarchyLoading } = useHierarchy(
    user?.id ?? null,
    id ?? null,
  );
  const { data: items, isLoading: itemsLoading } = useExposureItems(user?.id ?? null, id ?? null);
  const deleteMutation = useDeleteHierarchy(user?.id ?? null);

  // ☠️ The same rule as the session sheet, and the second path out of this file:
  // `DeleteEntryButton` keeps its confirmation OPEN when the delete rejects, so the
  // global save-failed toast would land behind a native modal (#1335, spec §10).
  // `ConfirmDialog` already carries an `error` slot; the failure goes there. The
  // success toast is safe - it fires as the screen is being replaced.
  const handleDelete = async () => {
    if (!hierarchy) return;
    deleteError.onStart();
    try {
      await deleteMutation.mutateAsync(hierarchy.id);
    } catch (error) {
      deleteError.onError();
      // Rethrown on purpose: `DeleteEntryButton` closes its confirmation only when
      // `onConfirm` RESOLVES, and a closed dialog has nowhere to show this.
      throw error;
    }
    showToast({ title: t("common:feedback.deleted"), tone: "success" });
    router.replace("/modules/cbt/exposure" as Parameters<typeof router.replace>[0]);
  };

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
              <ScreenHeader title={hierarchy.title} />
              <Text variant="muted">{hierarchy.anxietyType}</Text>
            </View>

            {items && items.length > 0 ? (
              <View className="gap-3">
                <Text variant="h3">{t("exposure.itemsLabel")}</Text>
                {items.map((item) => (
                  <ItemRow key={item.id} item={item} onStart={() => setActiveItem(item)} />
                ))}
              </View>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t("exposure.noItems")}</CardTitle>
                </CardHeader>
              </Card>
            )}

            <DeleteEntryButton
              error={deleteError.message ?? undefined}
              label={t("exposure.deleteHierarchy")}
              title={t("exposure.deleteTitle")}
              message={t("exposure.deleteMessage")}
              onOpen={deleteError.onStart}
              onConfirm={handleDelete}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
