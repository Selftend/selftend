import { GratitudeOnboarding } from "@/src/components/app/gratitude-onboarding-modal";
import { GroundingOnboarding } from "@/src/components/app/grounding-onboarding-modal";
import { HabitsOnboarding } from "@/src/components/app/habits-onboarding-modal";
import { JournalOnboarding } from "@/src/components/app/journal-onboarding-modal";
import { MeditationInfo } from "@/src/components/app/meditation-info-modal";
import { MoodOnboarding } from "@/src/components/app/mood-onboarding-modal";
import { SleepOnboarding } from "@/src/components/app/sleep-onboarding-modal";
import type { AdvancedToolInfoKey } from "./cbt-home-config";

interface AdvancedToolInfoModalsProps {
  active: AdvancedToolInfoKey | null;
  onClose: () => void;
}

export function AdvancedToolInfoModals({ active, onClose }: AdvancedToolInfoModalsProps) {
  return (
    <>
      <JournalOnboarding visible={active === "journal"} onComplete={onClose} onDismiss={onClose} />
      <GratitudeOnboarding
        visible={active === "gratitude"}
        onComplete={onClose}
        onDismiss={onClose}
      />
      <HabitsOnboarding visible={active === "habits"} onComplete={onClose} onDismiss={onClose} />
      <MeditationInfo visible={active === "meditation"} onComplete={onClose} onDismiss={onClose} />
      <GroundingOnboarding
        visible={active === "grounding"}
        onComplete={onClose}
        onDismiss={onClose}
      />
      <MoodOnboarding visible={active === "mood"} onComplete={onClose} onDismiss={onClose} />
      <SleepOnboarding visible={active === "sleep"} onComplete={onClose} onDismiss={onClose} />
    </>
  );
}
