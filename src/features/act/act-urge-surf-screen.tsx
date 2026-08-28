import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
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
import { ScreenHeader } from "@/src/components/app/screen-header";
import { ErrorState } from "@/src/components/app/screen-state";
import { CrisisSupportBar } from "@/src/components/app/crisis-support-bar";
import { MobileFormScreen } from "@/src/components/app/mobile-form-screen";
import { NumberRating } from "@/src/components/app/number-rating";
import { useUrgeSurfLogPages, useSaveUrgeSurfLog } from "@/src/features/act/queries";
import type { UrgeSurfLog } from "@/src/features/act/types";
import { StepPills } from "@/src/features/act/step-pills";
import { usePushWithOrigin } from "@/src/lib/escape-origin";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { loggedAtForSelectedDate, useSelectedDate } from "@/src/stores/selected-date-store";
import { useToastStore } from "@/src/stores/toast-store";
import { cn } from "@/lib/utils";
import { useLocaleFormats } from "@/src/lib/locale-format";
import { Icon } from "@/src/components/react-native-reusables/icon";

type Step = "urge" | "trigger" | "observe" | "complete";
const STEP_ORDER: Step[] = ["urge", "trigger", "observe", "complete"];

/**
 * ☠️ Pressable since #1517, and that is the point of the change rather than a polish
 * pass. This row renders `urgeDescription` and a timestamp — two of the six fields the
 * four-step form writes. Without somewhere to press, the other four (`trigger`,
 * `peakIntensity`, `urgeActedOn`, `surfingNotes`) were readable by nobody at any depth.
 */
function UrgeSurfHistoryItem({ log, onPress }: { log: UrgeSurfLog; onPress: () => void }) {
  const { formatDateTime } = useLocaleFormats();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={onPress}
      className="rounded-lg border border-border bg-card p-3 active:bg-accent/40"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="font-medium" numberOfLines={2}>
            {log.urgeDescription}
          </Text>
          <Text variant="muted" className="mt-1 text-xs">
            {formatDateTime(log.createdAt)}
          </Text>
        </View>
        <Icon name="chevron-right" className="size-4 text-muted-foreground" />
      </View>
    </Pressable>
  );
}

export default function ActUrgeSurfScreen() {
  const { t } = useTranslation(["act", "common", "errors"]);
  const pushWithOrigin = usePushWithOrigin();
  const { user } = useSession();
  // ⚠️ Write path only, and #1517 verified that: `selectedDate` reaches `createdAt` on save
  // and nothing else. The archive read below carries no day filter, so there was never a
  // filter here to remove — unlike the five list screens.
  const { selectedDate } = useSelectedDate();
  const saveMutation = useSaveUrgeSurfLog(user?.id ?? null);
  const {
    data: pageData,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useUrgeSurfLogPages(user?.id ?? null);
  const logs = pageData?.pages.flat() ?? [];
  const showToast = useToastStore((state) => state.showToast);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const [mode, setMode] = useState<"list" | "form">("list");
  const [step, setStep] = useState<Step>("urge");
  const [urgeDescription, setUrgeDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const [peakIntensity, setPeakIntensity] = useState<number | null>(null);
  const [urgeActedOn, setUrgeActedOn] = useState(false);
  const [surfingNotes, setSurfingNotes] = useState("");
  const [submitError, setSubmitError] = useState("");

  const stepIndex = STEP_ORDER.indexOf(step);
  const isLastStep = stepIndex === STEP_ORDER.length - 1;

  const actedOnRoving = useRovingFocus({
    count: 2,
    activeIndex: urgeActedOn ? 0 : 1,
    onActivate: (index) => setUrgeActedOn(index === 0),
  });

  function startNew() {
    setStep("urge");
    setUrgeDescription("");
    setTrigger("");
    setPeakIntensity(null);
    setUrgeActedOn(false);
    setSurfingNotes("");
    setSubmitError("");
    setMode("form");
  }

  function goNext() {
    if (stepIndex < STEP_ORDER.length - 1) setStep(STEP_ORDER[stepIndex + 1]);
  }
  function goBack() {
    if (stepIndex > 0) {
      setStep(STEP_ORDER[stepIndex - 1]);
    } else {
      setMode("list");
    }
  }

  const handleSave = useSingleFlight(async () => {
    if (!user) return;
    setSubmitError("");
    try {
      await saveMutation.mutateAsync({
        urgeDescription: urgeDescription.trim(),
        trigger: trigger.trim(),
        peakIntensity,
        urgeActedOn,
        surfingNotes: surfingNotes.trim(),
        completedAt: new Date().toISOString(),
        createdAt: loggedAtForSelectedDate(selectedDate),
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      setMode("list");
    } catch {
      // The thrown message is a backend/internal string, English for every user -
      // translated copy only (i18n rule, #1060). The mutation cache's global onError
      // already reports the failure to Sentry.
      setSubmitError(t("act:expansion.urgeSurf.saveProblem"));
    }
  });

  /**
   * List mode was already shape A's layout — header, then the New button, then the logs —
   * so #1517 changed the DEPTH rather than the shape. It read a hard
   * `useUrgeSurfLogs(user, 5)`; the sixth-oldest entry was unreachable by every path,
   * because urge surf had neither a full list nor an `[id]` route.
   *
   * ☠️ The New button stays above the list (#1515): this route is the tool's front door
   * as much as its archive.
   */
  if (mode === "list") {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
        <FlatList<UrgeSurfLog>
          data={logs}
          keyExtractor={(log) => log.id}
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View className="mb-6 gap-6">
              <View className="gap-2">
                <ScreenHeader title={t("act:expansion.urgeSurfTitle")} />
                <Text variant="muted">{t("act:expansion.urgeSurfSubtitle")}</Text>
              </View>

              <Button onPress={startNew}>
                <Text>{t("act:expansion.urgeSurfTitle")}</Text>
              </Button>

              {logs.length > 0 ? (
                <Text variant="muted" className="text-xs uppercase tracking-wider">
                  {t("act:expansion.urgeSurfingTitle")}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isPending ? null : isError ? (
              <ErrorState
                icon="cloud-off"
                title={t("errors:fallback.title")}
                description={t("errors:fallback.description")}
                action={{ label: t("errors:fallback.retry"), onPress: () => void refetch() }}
              />
            ) : (
              <Text variant="muted">{t("act:expansion.noUrgeLogs")}</Text>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-6">
                <ActivityIndicator />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <UrgeSurfHistoryItem
              log={item}
              onPress={() =>
                pushWithOrigin({
                  pathname: "/modules/act/expansion/urge-surfing/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      </SafeAreaView>
    );
  }

  return (
    <MobileFormScreen
      footer={
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button onPress={goBack} variant="ghost">
              <Text>{t("act:expansion.back")}</Text>
            </Button>
          </View>
          <View className="flex-1">
            <Button
              disabled={
                saveMutation.isPending || (step === "urge" && urgeDescription.trim().length === 0)
              }
              onPress={() => void (isLastStep ? handleSave() : goNext())}
            >
              {saveMutation.isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>
                {saveMutation.isPending
                  ? t("act:expansion.urgeSurf.saving")
                  : isLastStep
                    ? t("act:expansion.urgeSurf.saveLog")
                    : t("act:expansion.continue")}
              </Text>
            </Button>
          </View>
        </View>
      }
    >
      <View className="gap-6">
        <View className="gap-2">
          {/* `ScreenHeader`, not a bare `<Text variant="h1">`: the heading it
              used to render looked identical and carried no Escape, so the form
              path - the one this screen exists for - had no way out. The file
              passed the coverage gate on the chrome in its history branch
              (#1328). Same shape as `act-value-domain-screen`. */}
          <ScreenHeader title={t("act:expansion.urgeSurfTitle")} />
          <Text variant="muted">{t("act:expansion.urgeSurfSubtitle")}</Text>
        </View>

        <CrisisSupportBar />

        {/* Step pills */}
        <StepPills
          steps={STEP_ORDER}
          current={step}
          onSelect={setStep}
          getLabel={(s) => t(`act:expansion.urgeSurf.steps.${s}`)}
        />

        {submitError ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("act:expansion.urgeSurf.saveProblem")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="muted">{submitError}</Text>
            </CardContent>
          </Card>
        ) : null}

        {/* Step 1: Urge */}
        {step === "urge" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.urgeSurf.urgeLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.urgeSurf.urgeHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:expansion.urgeSurf.urgeLabel")}
              onChangeText={setUrgeDescription}
              placeholder={t("act:expansion.urgeSurf.urgePlaceholder")}
              value={urgeDescription}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 2: Trigger */}
        {step === "trigger" ? (
          <View className="gap-3">
            <View className="gap-1">
              <Label>{t("act:expansion.urgeSurf.triggerLabel")}</Label>
              <Text variant="muted" className="text-xs">
                {t("act:expansion.urgeSurf.triggerHint")}
              </Text>
            </View>
            <Textarea
              accessibilityLabel={t("act:expansion.urgeSurf.triggerLabel")}
              onChangeText={setTrigger}
              placeholder={t("act:expansion.urgeSurf.triggerPlaceholder")}
              value={trigger}
              autoFocus
            />
          </View>
        ) : null}

        {/* Step 3: Observe (surfing guidance) */}
        {step === "observe" ? (
          <View className="gap-4">
            <Card className="border-border bg-muted">
              <CardHeader>
                <CardTitle className="text-foreground">
                  {t("act:expansion.urgeSurf.observeTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm leading-relaxed text-muted-foreground">
                  {t("act:expansion.urgeSurf.observeBody")}
                </Text>
              </CardContent>
            </Card>
            <View className="gap-3">
              <View className="gap-1">
                <Label>{t("act:expansion.urgeSurf.peakLabel")}</Label>
                <Text variant="muted" className="text-xs">
                  {t("act:expansion.urgeSurf.peakHint")}
                </Text>
              </View>
              <NumberRating
                min={0}
                max={100}
                step={10}
                value={peakIntensity}
                onChange={setPeakIntensity}
              />
            </View>
          </View>
        ) : null}

        {/* Step 4: Complete */}
        {step === "complete" ? (
          <View className="gap-6">
            <View className="gap-3">
              <Label>{t("act:expansion.urgeSurf.actedOnLabel")}</Label>
              <View
                accessibilityLabel={t("act:expansion.urgeSurf.actedOnLabel")}
                accessibilityRole="radiogroup"
                className="flex-row gap-3"
                role="radiogroup"
              >
                {([true, false] as const).map((val, index) => {
                  const selected = urgeActedOn === val;
                  return (
                    <Pressable
                      key={String(val)}
                      accessibilityRole="radio"
                      aria-checked={selected}
                      role="radio"
                      onPress={() => setUrgeActedOn(val)}
                      className={cn(
                        "flex-1 rounded-xl border p-4 active:bg-accent/40",
                        selected ? "border-border bg-muted" : "border-border bg-card",
                      )}
                      {...actedOnRoving.getItemProps(index, () => setUrgeActedOn(val))}
                    >
                      <Text
                        className={cn("text-center font-semibold", selected && "text-foreground")}
                      >
                        {val
                          ? t("act:expansion.urgeSurf.actedOnYes")
                          : t("act:expansion.urgeSurf.actedOnNo")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="gap-3">
              <Label>{t("act:expansion.urgeSurf.notesLabel")}</Label>
              <Textarea
                accessibilityLabel={t("act:expansion.urgeSurf.notesLabel")}
                onChangeText={setSurfingNotes}
                placeholder={t("act:expansion.urgeSurf.notesPlaceholder")}
                value={surfingNotes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </MobileFormScreen>
  );
}
