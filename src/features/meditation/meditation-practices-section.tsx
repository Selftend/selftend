import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { MEDITATION_PRACTICES, practicesLookup } from "@/src/features/meditation/practices";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { CHROME_MARK, CHROME_RULE, CHROME_TEXT, CHROME_WASH } from "@/src/lib/theme/chrome";
import { cn } from "@/lib/utils";

interface MeditationPracticesSectionProps {
  /** Optional slug (e.g. from a deep link) to pre-open one practice's card. */
  initialPractice?: string;
}

/**
 * Info-only reference for the seated practices. Tapping a card reveals its
 * instructions. It launches nothing - the actual sit happens via the meditation
 * timer on the module home.
 *
 * The list itself is always open: the collapsible section header it used to
 * carry belonged to its life as an overview section. On its own screen (#853)
 * the screen header names it once, and the #865 audit's doubled `PRACTICES`
 * label goes with the move.
 */
export function MeditationPracticesSection({ initialPractice }: MeditationPracticesSectionProps) {
  const { t } = useTranslation("meditation");
  const preselected =
    initialPractice && initialPractice in practicesLookup ? initialPractice : null;
  const [selected, setSelected] = useState<string | null>(preselected);

  return (
    <View className="gap-3">
      {MEDITATION_PRACTICES.map((p) => {
        const open = selected === p.slug;
        const rawSteps = t(`practices.${p.slug}.instructions`, { returnObjects: true });
        const steps = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];
        return (
          <Pressable
            key={p.slug}
            accessibilityRole="button"
            aria-expanded={open}
            hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
            onPress={() => setSelected(open ? null : p.slug)}
            className={cn("overflow-hidden rounded-2xl border bg-card p-4", CHROME_RULE)}
          >
            <View className="flex-row items-center gap-3">
              <View className={cn("size-9 items-center justify-center rounded-lg", CHROME_WASH)}>
                <Icon name={p.icon} className={cn("size-5", CHROME_MARK)} size={20} />
              </View>
              <Text className="flex-1 text-sm font-semibold">{t(`practices.${p.slug}.title`)}</Text>
              <Icon
                name={open ? "expand-less" : "expand-more"}
                className="size-5 text-muted-foreground"
              />
            </View>

            {open ? (
              <View className="mt-3 gap-3">
                <Text variant="muted" className="text-xs leading-snug">
                  {t(`practices.${p.slug}.shortDescription`)}
                </Text>
                {steps.map((step, i) => (
                  <View key={i} className="flex-row gap-3">
                    <View
                      className={cn("size-6 items-center justify-center rounded-full", CHROME_WASH)}
                    >
                      {/*
                        Accent ink, not the accent (#403): a 10px numeral
                        on `chipBg`, a `bg-<hue>/15` tint of its own hue.
                        Practices carry guest hues (mist, be, ink) as well
                        as the room's iris, so this must be the hue-keyed
                        ink — `text-primary-ink` would repaint all four as
                        the room's accent.
                      */}
                      <Text className={cn("text-[10px] font-bold", CHROME_TEXT)}>
                        {String(i + 1).padStart(2, "0")}
                      </Text>
                    </View>
                    <Text className="flex-1 text-sm leading-relaxed">{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
