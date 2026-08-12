import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Text } from "@/src/components/react-native-reusables/text";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface GroundingDoneProps {
  /** The finished technique's display title — the meta line's first segment. */
  techniqueTitle: string;
  durationMinutes: number;
  onDone: () => void;
  onRunAnother: () => void;
}

/**
 * The finish screen (design 5c), on the same focus surface as the step screen
 * (#874). Saving already happened — the meta line states the record
 * (`5-4-3-2-1 · 2 min · saved to your history`) instead of demanding a tap.
 * The decided title "Grounding complete" stays (#782), and there is
 * deliberately no settledness rating.
 */
export function GroundingDone({
  techniqueTitle,
  durationMinutes,
  onDone,
  onRunAnother,
}: GroundingDoneProps) {
  const { t } = useTranslation("cbt");
  return (
    <FocusSessionShell eyebrow={techniqueTitle}>
      <View className="grow items-center justify-center gap-6 px-4 py-8">
        <HueIconBadge icon="spa" size={84} iconSize={32} shape="circle" />
        <View className="items-center gap-2">
          <Text variant="h1" className="text-center">
            {t("grounding.complete")}
          </Text>
          <Text variant="muted" className="text-center text-[13.5px]">
            {t("grounding.doneMeta", { title: techniqueTitle, minutes: durationMinutes })}
          </Text>
        </View>
        <View className="flex-row items-center gap-2 pt-2">
          <Button variant="outline" onPress={onDone}>
            <Text>{t("common:done")}</Text>
          </Button>
          {/* A quiet text action, not a second button — the design draws it as
              muted text that only asks for attention on hover. */}
          <Pressable
            accessibilityRole="button"
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={onRunAnother}
            className="px-3 py-2 active:opacity-70"
          >
            <Text className="text-[13.5px] font-semibold text-muted-foreground">
              {t("grounding.runAnother")}
            </Text>
          </Pressable>
        </View>
      </View>
    </FocusSessionShell>
  );
}
