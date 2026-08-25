import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { usePushWithOrigin } from "@/src/lib/escape-origin";

// Calm, persistent one-line affordance for exercise forms (not the destructive-red
// full callout used on module home screens and the crisis page - see safety-callout.tsx).
//
// A hairline row, not a filled box (#887, decided on #882/#868): the quiet
// redesign left the filled `bg-muted/40` container the loudest element on
// screens that gave up their cards, which is what the owner was reacting to —
// the affordance itself stays, everywhere, and the guardrail (crisis guidance
// visible, calm, separate from the self-help features) holds.
export function CrisisSupportBar() {
  const { t } = useTranslation("common");
  // Through the Origin-recording helper, never a bare `router.push` (#1265, O3).
  // This bar renders on eleven screens - eight ACT exercises, the CBT new-record
  // screen, grounding home, the mood entry editor - and `/crisis` sits at the
  // root, so its Up is Home. Without the Origin, a user in distress mid-exercise
  // who reaches for crisis support cannot get back to what they were doing.
  const pushWithOrigin = usePushWithOrigin();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("safety.barLabel")}
      onPress={() => pushWithOrigin("/crisis")}
      className="flex-row items-center gap-2.5 border-y border-border py-2.5 active:opacity-70"
    >
      <Icon name="info-outline" className="size-4 text-muted-foreground" />
      <Text variant="muted" className="flex-1 text-[12.5px]">
        {t("safety.barLabel")}
      </Text>
      <Icon name="chevron-right" className="size-4 text-muted-foreground" />
    </Pressable>
  );
}
