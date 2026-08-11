import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { groundingLookup } from "@/src/constants/grounding";
import { GroundingDone } from "@/src/features/grounding/grounding-done";
import { GroundingSession } from "@/src/features/grounding/grounding-session";
import { useSaveGroundingSession } from "@/src/features/grounding/queries";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";
import { ConfirmDialog } from "@/src/components/app/confirm-dialog";

type Phase = "active" | "done";

/**
 * No intro phase (#874, decided on #868's consolidation): the session opens
 * directly on step 1, as the design draws — the overview's technique picker
 * already carries the context the intro repeated. The active and done phases
 * render on `FocusSessionShell` (#777: one surface for breathing, grounding
 * and meditation), which is also why there is no room wrapper around them —
 * the shell derives its wash from the active style, exactly as the other two
 * tools' sessions do.
 */
export function GroundingFlow({ slug }: { slug: string }) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const navigation = useNavigation();
  const showToast = useToastStore((state) => state.showToast);
  const technique = slug ? groundingLookup[slug] : undefined;

  const [phase, setPhase] = useState<Phase>("active");
  const [stepIndex, setStepIndex] = useState(0);
  const [furthestStep, setFurthestStep] = useState(1);
  const [confirmEarlyFinish, setConfirmEarlyFinish] = useState(false);
  // The saved session's length, for the done screen's meta line.
  const [savedMinutes, setSavedMinutes] = useState(1);
  const startedAtRef = useRef(0);
  const finishingRef = useRef(false);
  const saveMutation = useSaveGroundingSession(user?.id ?? null);
  // Grounding is the "clay" room (spec #315) — but only the not-found branch
  // still needs the pour: the session phases live on the focus surface.
  const roomStyle = useRoomStyle("clay");

  // The clock starts when the flow mounts — there is no Start button any more.
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // Declared before the not-found early return below so the hook call is unconditional.
  const saveAndFinish = useSingleFlight(async (stepsCompleted: number) => {
    if (!technique) return;
    try {
      const durationMinutes = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 60_000));
      await saveMutation.mutateAsync({
        exerciseName: technique.slug,
        durationMinutes,
        reflection: "",
        feelingAfter: null,
        stepsCompleted,
        stepsTotal: technique.steps.length,
      });
      finishingRef.current = true;
      setSavedMinutes(durationMinutes);
      setConfirmEarlyFinish(false);
      setPhase("done");
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  });

  /**
   * The shell has no chrome, so the OS back gesture and the web back button
   * are the only uninvited exits. Mid-session they ask — the same
   * finish-or-continue the close glyph used to open — never a silent discard.
   * The done phase and a finished save let the exit through.
   */
  useEffect(() => {
    return navigation.addListener("beforeRemove", (event) => {
      if (phase !== "active" || finishingRef.current || !technique) return;
      event.preventDefault();
      setConfirmEarlyFinish(true);
    });
  }, [navigation, phase, technique]);

  if (!technique) {
    return (
      <View className="flex-1" style={roomStyle} testID="grounding-flow-room">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-1 justify-center p-6">
            <Text variant="h2">{t("grounding.notFound")}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const stepsText = (() => {
    const list = t(`grounding.techniques.${technique.slug}.steps`, { returnObjects: true });
    return Array.isArray(list) ? (list as string[]) : [];
  })();
  const stepLabels = (() => {
    const list = t(`grounding.techniques.${technique.slug}.stepLabels`, { returnObjects: true });
    return Array.isArray(list) ? (list as string[]) : [];
  })();
  const stepHints = (() => {
    const list = t(`grounding.techniques.${technique.slug}.stepHints`, { returnObjects: true });
    return Array.isArray(list) ? (list as string[]) : [];
  })();

  const title = t(`grounding.techniques.${technique.slug}.title`);
  const total = stepsText.length;

  const handleNext = () => {
    if (stepIndex < total - 1) {
      const nextStep = stepIndex + 1;
      setFurthestStep((current) => Math.max(current, nextStep + 1));
      setStepIndex(nextStep);
    } else {
      void saveAndFinish(total);
    }
  };

  return (
    <>
      {phase === "active" ? (
        <GroundingSession
          technique={technique}
          techniqueTitle={title}
          stepText={stepsText[stepIndex]}
          stepLabel={stepLabels[stepIndex] ?? ""}
          stepHint={stepHints[stepIndex] ?? ""}
          stepIndex={stepIndex}
          total={total}
          isLast={stepIndex === total - 1}
          onNext={handleNext}
          onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
          onStepSelect={(index) => {
            setFurthestStep((current) => Math.max(current, index + 1));
            setStepIndex(index);
          }}
          saving={saveMutation.isPending}
        />
      ) : (
        <GroundingDone
          techniqueTitle={title}
          durationMinutes={savedMinutes}
          onDone={() => router.replace("/tools/grounding" as Parameters<typeof router.replace>[0])}
          onRunAnother={() =>
            router.replace("/tools/grounding" as Parameters<typeof router.replace>[0])
          }
        />
      )}
      <ConfirmDialog
        visible={confirmEarlyFinish}
        isPending={saveMutation.isPending}
        title={t("grounding.finishEarly.title")}
        message={t("grounding.finishEarly.message", { current: furthestStep, total })}
        confirmLabel={t("grounding.finishEarly.confirm")}
        cancelLabel={t("grounding.finishEarly.cancel")}
        destructive={false}
        onCancel={() => setConfirmEarlyFinish(false)}
        onConfirm={() => void saveAndFinish(furthestStep)}
      />
    </>
  );
}
