import { useRef, useState } from "react";
import { ScrollView, View, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Input } from "@/src/components/react-native-reusables/input";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { cn } from "@/lib/utils";
import { familyForEmotion } from "@/src/features/dbt/opposite-action-families";
import { useSaveOppositeActionPlan } from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/opposite-action/new` - plan the move a feeling would not
 * choose (spec §3.3.2).
 *
 * The Activities shape: planned now, closed later from the detail. Nothing here
 * decides whether a feeling deserves regulating - opening the tool is the
 * person making that call, and the app asking would be branching on their state
 * (S2).
 *
 * ☠️ **No timer on _how long I'll hold it_.** It is free text - *the whole
 * conversation*, *ten minutes* - because a timer implies a required duration
 * and an unfinished countdown implies a failure.
 */
export default function DbtOppositeActionNewScreen() {
  const { t } = useTranslation("dbt");
  const { t: tCbt } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveOppositeActionPlan(user?.id ?? null);

  const [emotion, setEmotion] = useState<string | null>(null);
  const [pull, setPull] = useState("");
  const [oppositeAction, setOppositeAction] = useState("");
  const [holdFor, setHoldFor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pullRef = useRef<TextInput>(null);

  // The family decides which two hint sentences are shown, and nothing else.
  // A pleasant or custom feeling has none, and the hints simply do not render.
  const family = familyForEmotion(emotion);

  const save = useSingleFlight(async () => {
    if (!emotion) {
      setError(t("oppositeAction.errors.emotion"));
      return;
    }
    if (!pull.trim()) {
      setError(t("oppositeAction.errors.pull"));
      pullRef.current?.focus();
      return;
    }
    if (!oppositeAction.trim()) {
      setError(t("oppositeAction.errors.oppositeAction"));
      return;
    }
    try {
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        emotion,
        pull,
        oppositeAction,
        holdFor,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
      showToast({
        title: t("oppositeAction.saved"),
        description: oppositeAction.trim(),
        tone: "success",
      });
      router.replace("/modules/dbt/opposite-action");
    } catch {
      showToast({ title: t("oppositeAction.saveError"), tone: "error" });
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar leading="close" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "grow gap-6")}>
          <View className="gap-2">
            <Text variant="h1" className="text-[24px] font-bold leading-tight tracking-tight">
              {t("oppositeAction.newTitle")}
            </Text>
            <Text variant="muted">{t("oppositeAction.newDescription")}</Text>
          </View>

          <CrisisSupportBar />

          <View className="gap-2">
            <Label>{t("oppositeAction.emotionLabel")}</Label>
            <Text variant="muted" className="text-[12.5px]">
              {t("oppositeAction.emotionHint")}
            </Text>
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
                  const pick = () => {
                    setError(null);
                    // One feeling, not a set: this plan is about one pull.
                    setEmotion(emotion === id ? null : id);
                  };
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

          <View className="gap-2">
            <Label>{t("oppositeAction.pullLabel")}</Label>
            {family ? (
              <Text variant="muted" className="text-[12.5px]">
                {t(`oppositeAction.families.${family}.pull`)}
              </Text>
            ) : null}
            <Textarea
              ref={pullRef}
              value={pull}
              onChangeText={(value) => {
                setError(null);
                setPull(value);
              }}
              accessibilityLabel={t("oppositeAction.pullLabel")}
              maxLength={500}
            />
          </View>

          <View className="gap-2">
            <Label>{t("oppositeAction.oppositeLabel")}</Label>
            <Text variant="muted" className="text-[12.5px]">
              {t("oppositeAction.oppositeHint")}
              {family ? ` ${t(`oppositeAction.families.${family}.opposite`)}` : ""}
            </Text>
            <Textarea
              value={oppositeAction}
              onChangeText={(value) => {
                setError(null);
                setOppositeAction(value);
              }}
              accessibilityLabel={t("oppositeAction.oppositeLabel")}
              maxLength={500}
            />
          </View>

          <View className="gap-2">
            <Label>{t("oppositeAction.holdForLabel")}</Label>
            <Text variant="muted" className="text-[12.5px]">
              {t("oppositeAction.holdForHint")}
            </Text>
            {/* Free text, never a duration picker: a countdown would turn a
                held posture into a target to fall short of. */}
            <Input
              value={holdFor}
              onChangeText={setHoldFor}
              accessibilityLabel={t("oppositeAction.holdForLabel")}
              maxLength={120}
            />
          </View>

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}

          <View className="grow" />

          <Button disabled={saveMutation.isPending} onPress={() => void save()}>
            <SubmitButtonContent
              pending={saveMutation.isPending}
              idleLabel={t("oppositeAction.save")}
              pendingLabel={t("oppositeAction.saving")}
            />
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
