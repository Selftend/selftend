import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { MEDITATION_PRACTICES, practicesLookup } from "@/src/features/meditation/practices";
import { exerciseHue } from "@/src/features/mindfulness/exercise-hue";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { cn } from "@/lib/utils";

interface MeditationPracticesSectionProps {
  /** Optional slug (e.g. from a deep link) to pre-open the section on that practice. */
  initialPractice?: string;
}

/**
 * Collapsible, info-only reference for the seated practices. Tapping the section header
 * reveals nested cards; tapping a card reveals its instructions. It launches nothing —
 * the actual sit happens via the meditation timer on the module home.
 */
export function MeditationPracticesSection({ initialPractice }: MeditationPracticesSectionProps) {
  const { t } = useTranslation("meditation");
  const preselected =
    initialPractice && initialPractice in practicesLookup ? initialPractice : null;
  const [sectionOpen, setSectionOpen] = useState(preselected !== null);
  const [selected, setSelected] = useState<string | null>(preselected);

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: sectionOpen }}
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={() => setSectionOpen((o) => !o)}
        className="flex-row items-center justify-between"
      >
        <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("practices.sectionLabel")}
        </Text>
        <Icon
          name={sectionOpen ? "expand-less" : "expand-more"}
          className="size-5 text-muted-foreground"
        />
      </Pressable>

      {sectionOpen
        ? MEDITATION_PRACTICES.map((p) => {
            const open = selected === p.slug;
            const hue = exerciseHue(p.hue);
            const rawSteps = t(`practices.${p.slug}.instructions`, { returnObjects: true });
            const steps = Array.isArray(rawSteps) ? (rawSteps as string[]) : [];
            return (
              <Pressable
                key={p.slug}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setSelected(open ? null : p.slug)}
                className={cn("overflow-hidden rounded-2xl border bg-card p-4", hue.classes.border)}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={cn(
                      "size-9 items-center justify-center rounded-lg",
                      hue.classes.chipBg,
                    )}
                  >
                    <Icon name={p.icon} className={cn("size-5", hue.classes.text)} size={20} />
                  </View>
                  <Text className="flex-1 text-sm font-semibold">
                    {t(`practices.${p.slug}.title`)}
                  </Text>
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
                          className={cn(
                            "size-6 items-center justify-center rounded-full",
                            hue.classes.chipBg,
                          )}
                        >
                          <Text className={cn("text-[10px] font-bold", hue.classes.text)}>
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
          })
        : null}
    </View>
  );
}
