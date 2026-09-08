import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { EMOTION_GROUPS } from "@/src/constants/emotions";
import { COMPACT_CONTROL_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { cn } from "@/lib/utils";

interface SingleEmotionPickerProps {
  /** Names the group for assistive tech - the field's own label. */
  accessibilityLabel: string;
  value: string | null;
  onChange: (next: string | null) => void;
}

const EMOTION_IDS = EMOTION_GROUPS.flatMap((group) => group.ids);

/**
 * ONE feeling from the check-in's list - the opposite-action plan's and the
 * script's picker (#2199).
 *
 * A `radiogroup` of `radio`s, never a run of checkboxes. The choice is
 * exclusive by construction - picking one silently drops the last - and a
 * checkbox promises the opposite: a screen reader hearing "checkbox, checked"
 * on *Sad* is told nothing about *Angry* coming unchecked, and has to walk the
 * whole list to learn which one is set. With the radio role the reader hears
 * "2 of 22, selected", and the rest are known not to be. The emotion RECORD
 * keeps the checkbox shape because there the choice really is a set.
 *
 * Tapping the chosen one again clears it: a feeling is optional on the script,
 * and the plan's own validation names the missing field at save.
 *
 * `aria-checked`, never `accessibilityState`: react-native-web drops the
 * latter and the eslint gate forbids it; React Native maps `aria-checked` onto
 * `accessibilityState.checked` itself.
 */
export function SingleEmotionPicker({
  accessibilityLabel,
  value,
  onChange,
}: SingleEmotionPickerProps) {
  const { t: tCbt } = useTranslation("cbt");
  const activeIndex = value ? EMOTION_IDS.indexOf(value) : -1;
  const roving = useRovingFocus({
    count: EMOTION_IDS.length,
    // Nothing chosen yet: the first radio is the one that takes the tab stop.
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
    onActivate: (index) => onChange(EMOTION_IDS[index]),
  });

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      className="gap-1.5"
      role="radiogroup"
    >
      {EMOTION_GROUPS.map((group) => (
        <View key={group.valence} className="gap-1.5">
          <Text variant="muted" className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {group.valence === "difficult"
              ? tCbt("emotions.groupDifficult")
              : tCbt("emotions.groupPleasant")}
          </Text>
          {group.ids.map((id) => {
            const label = tCbt(`emotions.${id.toLowerCase()}`);
            const selected = value === id;
            const pick = () => onChange(selected ? null : id);
            return (
              <Pressable
                key={id}
                accessibilityLabel={label}
                accessibilityRole="radio"
                aria-checked={selected}
                role="radio"
                hitSlop={COMPACT_CONTROL_HIT_SLOP}
                onPress={pick}
                className="flex-row items-center gap-3"
                {...roving.getItemProps(EMOTION_IDS.indexOf(id), pick)}
              >
                {/* Selection is never colour alone: the dot appears, and the
                    ring darkens with it. */}
                <View
                  className={cn(
                    "size-4 items-center justify-center rounded-full border border-input shadow-sm shadow-black/5",
                    selected && "border-primary",
                  )}
                >
                  {selected ? <View className="size-2 rounded-full bg-primary" /> : null}
                </View>
                <Text className="text-sm font-medium">{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
