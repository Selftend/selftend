import { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { NumberRating } from "@/src/components/app/number-rating";
import { SegmentedControl } from "@/src/components/app/segmented-control";
import { WizardScreen } from "@/src/components/app/wizard-screen";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSaveScript } from "@/src/features/dbt/queries";
import type { ScriptWantChanged } from "@/src/features/dbt/types";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/scripts/new` - the four lines, written before the conversation
 * (spec §3.4.1).
 *
 * ☠️ **A wizard, not a column - and here the order IS the teaching.** The
 * emotion record is a column precisely because recall has no order; this is the
 * opposite case. The facts constrain the feeling, the feeling points at the one
 * ask, and the self-care line is written LAST so it never leaks into the ask
 * and turn a request into a threat.
 *
 * ☠️ **No _who_ field**, and nothing structured about the other person. No
 * shipped record has one, and a named person's behaviour stored in a health
 * record is data about someone who never consented to it.
 *
 * The difficulty rating orders the list and nothing else. Nothing triggers on
 * it, nothing compares it, and leaving it unset is normal (S2).
 */

const STEP_COUNT = 3;

export default function DbtScriptNewScreen() {
  const { t } = useTranslation("dbt");
  const { t: tc } = useTranslation("common");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveScript(user?.id ?? null);

  const [stepIndex, setStepIndex] = useState(0);
  const [situation, setSituation] = useState("");
  const [wantChanged, setWantChanged] = useState<ScriptWantChanged | null>(null);
  const [iThink, setIThink] = useState("");
  const [emotion, setEmotion] = useState<string | null>(null);
  const [iFeel, setIFeel] = useState("");
  const [iWant, setIWant] = useState("");
  const [selfCare, setSelfCare] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [whenWhere, setWhenWhere] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const steps = [
    { title: t("scripts.steps.situation") },
    { title: t("scripts.steps.script") },
    { title: t("scripts.steps.before") },
  ];

  const save = useSingleFlight(async () => {
    try {
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        situation,
        wantChanged,
        iThink,
        emotion,
        iFeel,
        iWant,
        selfCare,
        difficulty,
        whenWhere,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
      showToast({ title: t("scripts.saved"), description: iWant.trim(), tone: "success" });
      router.replace("/modules/dbt/scripts");
    } catch {
      showToast({ title: t("scripts.saveError"), tone: "error" });
    }
  });

  function primary() {
    if (stepIndex === 0) {
      if (!situation.trim()) return setError(t("scripts.errors.situation"));
      setError(null);
      return setStepIndex(1);
    }
    if (stepIndex === 1) {
      if (!iThink.trim()) return setError(t("scripts.errors.iThink"));
      if (!iWant.trim()) return setError(t("scripts.errors.iWant"));
      setError(null);
      return setStepIndex(2);
    }
    setError(null);
    void save();
  }

  return (
    <>
      <ConfirmDialog
        visible={discardOpen}
        isPending={saveMutation.isPending}
        title={tc("draft.discardTitle")}
        message={tc("draft.discardMessage")}
        confirmLabel={tc("draft.discardAction")}
        cancelLabel={tc("draft.keepAction")}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          router.replace("/modules/dbt/scripts");
        }}
      />
      <WizardScreen
        title={t("scripts.newTitle")}
        description={t("scripts.newDescription")}
        steps={steps}
        stepIndex={stepIndex}
        numberedSteps
        onJumpToStep={setStepIndex}
        onBack={() => (stepIndex === 0 ? setDiscardOpen(true) : setStepIndex(stepIndex - 1))}
        onPrimary={primary}
        primaryLabel={stepIndex === STEP_COUNT - 1 ? t("scripts.save") : t("scripts.next")}
        pendingLabel={t("scripts.saving")}
        backLabel={stepIndex === 0 ? tc("draft.discardAction") : t("scripts.back")}
        discardLabel={tc("draft.discardAction")}
        onDiscard={() => setDiscardOpen(true)}
        isPending={saveMutation.isPending}
        headerSlot={<CrisisSupportBar />}
      >
        <View className="gap-6">
          {stepIndex === 0 ? (
            <>
              <View className="gap-2">
                <Label>{t("scripts.situationLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.situationHint")}
                </Text>
                <Textarea
                  value={situation}
                  onChangeText={(value) => {
                    setError(null);
                    setSituation(value);
                  }}
                  accessibilityLabel={t("scripts.situationLabel")}
                  maxLength={2000}
                />
              </View>
              <View className="gap-2">
                <Label>{t("scripts.wantChangedLabel")}</Label>
                <SegmentedControl
                  accessibilityLabel={t("scripts.wantChangedLabel")}
                  value={wantChanged ?? "moreOf"}
                  onChange={setWantChanged}
                  options={(["moreOf", "lessOf", "stop", "start"] as const).map((value) => ({
                    value,
                    label: t(`scripts.wantChanged.${value}`),
                  }))}
                />
              </View>
            </>
          ) : null}

          {stepIndex === 1 ? (
            <>
              <View className="gap-2">
                <Label>{t("scripts.iThinkLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.iThinkHint")}
                </Text>
                <Textarea
                  value={iThink}
                  onChangeText={(value) => {
                    setError(null);
                    setIThink(value);
                  }}
                  accessibilityLabel={t("scripts.iThinkLabel")}
                  maxLength={1000}
                />
              </View>

              <View className="gap-2">
                <Label>{t("scripts.iFeelLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.iFeelHint")}
                </Text>
                <View className="gap-1.5">
                  {EMOTION_GROUPS.map((group) => (
                    <View key={group.valence} className="gap-1.5">
                      <Text
                        variant="muted"
                        className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                      >
                        {group.valence === "difficult"
                          ? tCbt("emotions.groupDifficult")
                          : tCbt("emotions.groupPleasant")}
                      </Text>
                      {group.ids.map((id) => {
                        const label = tCbt(`emotions.${id.toLowerCase()}`);
                        const pick = () => setEmotion(emotion === id ? null : id);
                        return (
                          <View key={id} className="flex-row items-center gap-3">
                            <Checkbox
                              accessibilityLabel={label}
                              checked={emotion === id}
                              onCheckedChange={pick}
                            />
                            <Label onPress={pick}>{label}</Label>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
                <Textarea
                  value={iFeel}
                  onChangeText={setIFeel}
                  accessibilityLabel={t("scripts.iFeelLabel")}
                  maxLength={500}
                />
              </View>

              <View className="gap-2">
                <Label>{t("scripts.iWantLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.iWantHint")}
                </Text>
                <Textarea
                  value={iWant}
                  onChangeText={(value) => {
                    setError(null);
                    setIWant(value);
                  }}
                  accessibilityLabel={t("scripts.iWantLabel")}
                  maxLength={1000}
                />
              </View>

              <View className="gap-2">
                <Label>{t("scripts.selfCareLabel")}</Label>
                {/* ☠️ Written last, and described as something you do FOR you -
                    never something you do TO them. Held in reserve, and the
                    person may keep it to themselves. */}
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.selfCareHint")}
                </Text>
                <Textarea
                  value={selfCare}
                  onChangeText={setSelfCare}
                  accessibilityLabel={t("scripts.selfCareLabel")}
                  maxLength={1000}
                />
              </View>
            </>
          ) : null}

          {stepIndex === 2 ? (
            <>
              <View className="gap-2">
                <Label>{t("scripts.difficultyLabel")}</Label>
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.difficultyHint")}
                </Text>
                <NumberRating
                  min={0}
                  max={100}
                  step={10}
                  value={difficulty}
                  onChange={setDifficulty}
                />
              </View>

              <View className="gap-2">
                <Label>{t("scripts.whenWhereLabel")}</Label>
                {/* Free text, never a date type: nothing in this module can
                    become overdue. */}
                <Text variant="muted" className="text-[12.5px]">
                  {t("scripts.whenWhereHint")}
                </Text>
                <Input
                  value={whenWhere}
                  onChangeText={setWhenWhere}
                  accessibilityLabel={t("scripts.whenWhereLabel")}
                  maxLength={300}
                />
              </View>

              {/* 10.2 as one line, storing nothing: two questions to ask
                  yourself, never two numbers that add up to a verdict. */}
              <Text variant="muted" className="text-[13px] leading-snug">
                {t("scripts.intensityHint")}
              </Text>
            </>
          ) : null}

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}
        </View>
      </WizardScreen>
    </>
  );
}
