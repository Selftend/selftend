import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { groundingLookup } from "@/src/constants/grounding";
import { GroundingDone } from "@/src/features/grounding/grounding-done";
import { GroundingIntro } from "@/src/features/grounding/grounding-intro";
import { GroundingSession } from "@/src/features/grounding/grounding-session";
import { useSaveGroundingSession } from "@/src/features/grounding/queries";
import { useRoomStyle } from "@/src/lib/use-room-style";
import { useSingleFlight } from "@/src/lib/use-single-flight";
import { useSession } from "@/src/providers/session-provider";
import { useToastStore } from "@/src/stores/toast-store";

type Phase = "intro" | "active" | "done";

export function GroundingFlow({ slug }: { slug: string }) {
  const { t } = useTranslation("cbt");
  const { user } = useSession();
  const showToast = useToastStore((state) => state.showToast);
  const technique = slug ? groundingLookup[slug] : undefined;

  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const saveMutation = useSaveGroundingSession(user?.id ?? null);
  // Grounding is the "clay" room (spec #315). Each phase component owns its
  // own SafeAreaView, so the pour lives on a wrapper here: their
  // bg-background surfaces re-resolve to clay through it. No field header —
  // a session screen keeps the exercise as the hero (Wave B direction #301),
  // and the per-technique hue guests (glow, buttons, badges) sit on top.
  const roomStyle = useRoomStyle("clay");

  // Declared before the not-found early return below so the hook call is unconditional.
  const handleSave = useSingleFlight(async () => {
    if (!technique) return;
    try {
      await saveMutation.mutateAsync({
        exerciseName: technique.slug,
        durationMinutes: 1,
        reflection: "",
        feelingAfter: null,
      });
      showToast({ title: t("common:feedback.saved"), tone: "success" });
      router.replace("/tools/grounding" as Parameters<typeof router.replace>[0]);
    } catch {
      showToast({ title: t("common:feedback.problem"), tone: "error" });
    }
  });

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

  const title = t(`grounding.techniques.${technique.slug}.title`);
  const total = stepsText.length;

  const handleNext = () => {
    if (stepIndex < total - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setPhase("done");
    }
  };

  const handleExit = () => {
    setStepIndex(0);
    setPhase("intro");
  };

  const phaseContent = () => {
    if (phase === "intro") {
      return (
        <GroundingIntro
          technique={technique}
          title={title}
          description={t(`grounding.techniques.${technique.slug}.shortDescription`)}
          steps={stepsText}
          onStart={() => {
            setStepIndex(0);
            setPhase("active");
          }}
        />
      );
    }

    if (phase === "active") {
      return (
        <GroundingSession
          technique={technique}
          techniqueTitle={title}
          stepText={stepsText[stepIndex]}
          stepLabel={stepLabels[stepIndex] ?? ""}
          stepIndex={stepIndex}
          total={total}
          isLast={stepIndex === total - 1}
          onNext={handleNext}
          onExit={handleExit}
        />
      );
    }

    return <GroundingDone saving={saveMutation.isPending} onSave={() => void handleSave()} />;
  };

  return (
    <View className="flex-1" style={roomStyle} testID="grounding-flow-room">
      {phaseContent()}
    </View>
  );
}
