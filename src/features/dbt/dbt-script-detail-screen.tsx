import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ScreenLoading } from "@/src/components/app/screen-state";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { formatCompactAtOffset } from "@/src/utils/date";
import { cn } from "@/lib/utils";
import { useDeleteScript, useMarkScriptDone, useScript } from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/scripts/[id]` - **the card**, reopened before the conversation
 * (spec §3.4.1, design `1e`).
 *
 * The four lines, large and in order, with the self-care line quieter than the
 * rest - it is the person's reserve, not part of the ask. **No crisis bar**:
 * like the coping-plan card, this is a read-back surface opened at a specific
 * moment, and a warning above the lines is not what it is for.
 *
 * *If they push back* is a **read-only** disclosure - five lines to remind
 * yourself of, with nothing to fill in. There is no field behind it and no
 * record of having read it.
 */
export default function DbtScriptDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("dbt");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const { data: script, isPending } = useScript(user?.id ?? null, id);
  const doneMutation = useMarkScriptDone(user?.id ?? null);
  const deleteMutation = useDeleteScript(user?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pushBackOpen, setPushBackOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [howItWent, setHowItWent] = useState("");

  const markDone = useSingleFlight(async () => {
    if (!script) return;
    try {
      const occurrence = occurrenceTimeFromDate();
      await doneMutation.mutateAsync({
        id: script.id,
        input: {
          doneAt: occurrence.occurredAt,
          doneOffsetMinutes: occurrence.occurredOffsetMinutes,
          howItWent,
        },
      });
      setNoteOpen(false);
      showToast({ title: `${t("scripts.donePrefix")} ${script.iWant}`, tone: "success" });
    } catch {
      showToast({ title: t("scripts.doneError"), tone: "error" });
    }
  });

  const remove = useSingleFlight(async () => {
    try {
      await deleteMutation.mutateAsync(id);
      router.replace("/modules/dbt/scripts");
    } catch {
      showToast({ title: t("scripts.deleteError"), tone: "error" });
    }
  });

  if (isPending) return <ScreenLoading title={t("tools.scripts.name")} />;

  if (!script) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerClassName="grow p-6">
          <View className={cn(FORM_COLUMN, "gap-6")}>
            <ScreenHeader title={t("tools.scripts.name")} />
            <Text variant="muted">{t("scripts.notFound")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const feeling = script.emotion
    ? tCbt(`emotions.${script.emotion.toLowerCase()}`, script.emotion)
    : null;
  const pushBack = t("scripts.pushBackLines", { returnObjects: true }) as unknown as string[];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ConfirmDialog
        visible={confirmDelete}
        isPending={deleteMutation.isPending}
        title={t("scripts.deleteTitle")}
        message={t("scripts.deleteBody")}
        confirmLabel={t("scripts.deleteConfirm")}
        cancelLabel={t("scripts.deleteCancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void remove();
        }}
      />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "gap-7")}>
          <View className="gap-2">
            <ScreenHeader title={t("scripts.cardTitle")} />
            <Text variant="muted">{script.situation.split("\n")[0]}</Text>
          </View>

          <View className="gap-4">
            <Line label={t("scripts.iThinkLine")} value={script.iThink} />
            {script.iFeel || feeling ? (
              <Line
                label={t("scripts.iFeelLine")}
                value={[feeling, script.iFeel].filter(Boolean).join(" · ")}
              />
            ) : null}
            <Line label={t("scripts.iWantLine")} value={script.iWant} />
            {script.selfCare ? (
              // Quieter than the rest: the reserve, not part of the ask.
              <Line label={t("scripts.selfCareLine")} value={script.selfCare} quiet />
            ) : null}
          </View>

          {script.whenWhere ? (
            <Text variant="muted" className="text-[13px]">
              {script.whenWhere}
            </Text>
          ) : null}

          <View className="gap-2">
            {/* ⚠️ A BUTTON, so it carries no Enter helper: react-native-web
                already activates a button role on Enter, and adding the helper
                would fire the toggle twice (#1730/#1737). The helper belongs
                to href-less LINKS only. */}
            <Pressable
              accessibilityRole="button"
              aria-expanded={pushBackOpen}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => setPushBackOpen(!pushBackOpen)}
              className="flex-row items-center gap-2 py-1"
            >
              <Icon
                name={pushBackOpen ? "expand-less" : "expand-more"}
                size={18}
                className="text-muted-foreground"
              />
              <Text className="text-[14px] font-semibold">{t("scripts.pushBackTitle")}</Text>
            </Pressable>
            {pushBackOpen ? (
              <View className="gap-2 rounded-xl border border-border bg-card p-4">
                {pushBack.map((line, index) => (
                  <View key={index} className="flex-row gap-2">
                    <Icon name="circle" size={6} className="mt-2 text-muted-foreground" />
                    <Text className="flex-1 text-[13.5px] leading-snug">{line}</Text>
                  </View>
                ))}
                {/* Said out loud, because a list of sentences on a form-shaped
                    screen reads as something to fill in. */}
                <Text variant="muted" className="text-[12px]">
                  {t("scripts.pushBackReadOnly")}
                </Text>
              </View>
            ) : null}
          </View>

          {script.doneAt ? (
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Icon name="check-circle" size={18} className="text-primary" />
                <Text className="text-[15px] font-semibold">
                  {t("scripts.closedOn")}{" "}
                  {formatCompactAtOffset(script.doneAt, script.doneOffsetMinutes)}
                </Text>
              </View>
              {script.howItWent ? (
                <View className="gap-1.5">
                  <Text
                    variant="muted"
                    className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                  >
                    {t("scripts.howItWentLabel")}
                  </Text>
                  <Text className="text-[15px] leading-relaxed">{script.howItWent}</Text>
                </View>
              ) : null}
            </View>
          ) : noteOpen ? (
            <View className="gap-3">
              <View className="gap-1.5">
                <Label>{t("scripts.howItWentLabel")}</Label>
                <Textarea
                  value={howItWent}
                  onChangeText={setHowItWent}
                  accessibilityLabel={t("scripts.howItWentLabel")}
                  maxLength={1000}
                />
              </View>
              <Button disabled={doneMutation.isPending} onPress={() => void markDone()}>
                <SubmitButtonContent
                  pending={doneMutation.isPending}
                  idleLabel={t("scripts.saveDone")}
                  pendingLabel={t("scripts.saving")}
                />
              </Button>
              <Button
                variant="ghost"
                disabled={doneMutation.isPending}
                onPress={() => void markDone()}
              >
                <Text>{t("scripts.skipNote")}</Text>
              </Button>
            </View>
          ) : (
            <Button onPress={() => setNoteOpen(true)}>
              <Icon name="check" className="size-4 text-primary-foreground" />
              <Text>{t("scripts.done")}</Text>
            </Button>
          )}

          <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
            <Text className="text-destructive">{t("scripts.delete")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value, quiet }: { label: string; value: string; quiet?: boolean }) {
  return (
    <View className="gap-1">
      <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
        {label}
      </Text>
      <Text
        className={cn(
          "text-[20px] font-extrabold leading-snug tracking-tight",
          quiet && "text-[16px] font-semibold text-muted-foreground",
        )}
      >
        {value}
      </Text>
    </View>
  );
}
