import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { Textarea } from "@/src/components/react-native-reusables/textarea";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { ProgressSegments } from "@/src/components/app/progress-segments";
import { ScreenTopBar } from "@/src/components/app/screen-top-bar";
import { SubmitButtonContent } from "@/src/components/app/submit-button-content";
import { politeLiveRegionProps } from "@/src/lib/accessibility";
import { FORM_COLUMN } from "@/src/lib/layout";
import { occurrenceTimeFromDate } from "@/src/lib/occurrence-time";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { cn } from "@/lib/utils";
import { useSaveWiseMindCheckin } from "@/src/features/dbt/queries";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

/**
 * `/modules/dbt/wise-mind/new` - a guided pause that ends in a decision note
 * (spec §3.2.1).
 *
 * The shape is ACT's drop anchor - read, then log - with a typed note at the
 * end. **No timer**: two of the four beats are things to do rather than things
 * to time, and a countdown would turn a pause into a task.
 *
 * ☠️ **No draft, deliberately** - a stated departure from the ACT forms and
 * from this module's own emotion record. A half-asked question is not worth
 * keeping: the value of this tool is the sitting, and restoring someone into
 * the middle of a question they walked away from restores the typing without
 * the pause that made it worth anything.
 *
 * ☠️ **No outcome field and no later prompt.** The book logs whether the
 * decision turned out well; that is a slot waiting to be filled, which is a
 * surface engineered to be reopened (ADR-0004). The record states what was
 * asked and what was heard, and stops.
 *
 * *Wise mind* is Marsha Linehan's term, expanded once on the intro beat. There
 * is no claim about intuition or a gut, and nothing here is "the right answer".
 */

const BEATS = ["intro", "settle", "breathe", "question", "ask"] as const;
type Beat = (typeof BEATS)[number];

export default function DbtWiseMindNewScreen() {
  const { t } = useTranslation("dbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const saveMutation = useSaveWiseMindCheckin(user?.id ?? null);

  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [emotionMind, setEmotionMind] = useState("");
  const [reason, setReason] = useState("");
  const [wiseMind, setWiseMind] = useState("");
  const [error, setError] = useState<string | null>(null);

  const beat: Beat = BEATS[index]!;

  // Stop, and the bar's Close, both leave at once with nothing saved. Nothing
  // was written, so there is nothing to confirm.
  const stop = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/modules/dbt/wise-mind");
  };

  const save = useSingleFlight(async () => {
    if (!question.trim()) {
      setError(t("wiseMind.errors.question"));
      return;
    }
    try {
      const occurrence = occurrenceTimeFromDate();
      await saveMutation.mutateAsync({
        question,
        emotionMind,
        reason,
        wiseMind,
        createdAt: occurrence.occurredAt,
        createdOffsetMinutes: occurrence.occurredOffsetMinutes,
      });
      showToast({
        title: t("wiseMind.saved"),
        description: question.trim(),
        tone: "success",
      });
      router.replace("/modules/dbt/wise-mind");
    } catch {
      showToast({ title: t("wiseMind.saveError"), tone: "error" });
    }
  });

  function next() {
    if (beat === "question" && !question.trim()) {
      setError(t("wiseMind.errors.question"));
      return;
    }
    setError(null);
    setIndex((current) => Math.min(current + 1, BEATS.length - 1));
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScreenTopBar leading="close" />
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn(FORM_COLUMN, "grow gap-6")}>
          <ProgressSegments total={BEATS.length} current={index} />

          <View className="gap-2">
            <Text variant="h1" className="text-[24px] font-bold leading-tight tracking-tight">
              {t(`wiseMind.beats.${beat}.title`)}
            </Text>
            <Text className="text-[15px] leading-relaxed text-muted-foreground">
              {t(`wiseMind.beats.${beat}.body`)}
            </Text>
          </View>

          {beat === "intro" ? (
            <View className="gap-2 rounded-xl border border-border bg-card p-4">
              {(["emotion", "reason", "wise"] as const).map((half) => (
                <View key={half} className="flex-row gap-2">
                  <Icon name="circle" size={7} className="mt-2 text-muted-foreground" />
                  <Text className="flex-1 text-[14px] leading-snug">
                    {t(`wiseMind.triad.${half}`)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {beat === "question" ? (
            <View className="gap-2">
              <Label>{t("wiseMind.questionLabel")}</Label>
              <Textarea
                value={question}
                onChangeText={(value) => {
                  setError(null);
                  setQuestion(value);
                }}
                accessibilityLabel={t("wiseMind.questionLabel")}
                maxLength={200}
              />
            </View>
          ) : null}

          {beat === "ask" ? (
            <View className="gap-5">
              {/* One question, asked three ways. Every one of the three is
                  optional: someone who only hears one of them has still done
                  the thing, and an empty box is not a failed check-in. */}
              <Field
                label={t("wiseMind.emotionMindLabel")}
                value={emotionMind}
                onChangeText={setEmotionMind}
              />
              <Field label={t("wiseMind.reasonLabel")} value={reason} onChangeText={setReason} />
              <Field
                label={t("wiseMind.wiseMindLabel")}
                value={wiseMind}
                onChangeText={setWiseMind}
              />
            </View>
          ) : null}

          {error ? (
            <Text className="text-sm text-destructive" {...politeLiveRegionProps()}>
              {error}
            </Text>
          ) : null}

          <View className="grow" />

          <CrisisSupportBar />

          <View className="gap-3">
            <View className="flex-row gap-3">
              {index > 0 ? (
                <Button variant="outline" className="flex-1" onPress={() => setIndex(index - 1)}>
                  <Text>{t("wiseMind.back")}</Text>
                </Button>
              ) : null}
              {beat === "ask" ? (
                <View className="flex-1">
                  <Button disabled={saveMutation.isPending} onPress={() => void save()}>
                    <SubmitButtonContent
                      pending={saveMutation.isPending}
                      idleLabel={t("wiseMind.save")}
                      pendingLabel={t("wiseMind.saving")}
                    />
                  </Button>
                </View>
              ) : (
                <Button className="flex-1" onPress={next}>
                  <Text>{beat === "intro" ? t("wiseMind.start") : t("wiseMind.next")}</Text>
                </Button>
              )}
            </View>
            <Button variant="ghost" onPress={stop}>
              <Text>{t("wiseMind.stop")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        maxLength={500}
      />
    </View>
  );
}
