import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import {
  SEGMENTED_RAISED_CLASS,
  SEGMENTED_TRACK_CLASS,
} from "@/src/components/app/segmented-control";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useThemeStore, type ThemePreference } from "@/src/stores/theme-store";

// The appearance half of the theme control (#583), extracted from `user-menu.tsx`
// — which was the only UI in the tree that mounted one — so Settings can reach
// the same control rather than a copy of it (#1781, #1827). `StylePicker` is the
// style half and the precedent for the two-mounts-one-component shape.
//
// "THEME" here is the store's word for the light/dark axis (`ThemePreference`,
// `navigation:themeToggle.*`), not the palette one — `THEME_HEXES` in
// `lib/theme` means the other axis entirely. The constants keep the names they
// shipped under in the menu.
const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
const THEME_ICONS: Record<ThemePreference, MaterialIconName> = {
  system: "desktop-windows",
  light: "light-mode",
  dark: "dark-mode",
};

interface SchemePickerProps {
  /**
   * The group's own visible `Switch theme` caption.
   *
   * ☠️ Load-bearing, and it defaults to the value a real mount takes rather than
   * to the one nobody does: `settings-preferences.e2e.test.ts` asserts the string
   * VISIBLE three times while driving the menu. Settings passes `false`, where
   * the group is named once above both its controls (#1828's `Appearance`
   * eyebrow) — never dropped outright to match `14a`, which draws no label at
   * all for anyone. The radiogroup keeps its
   * `accessibilityLabel` either way, so suppressing the caption never leaves the
   * group unnamed.
   */
  showLabel?: boolean;
}

/**
 * Light / Dark / System, as a segmented track.
 *
 * On shape the design and #583 agree and the shipped menu was the outlier: it
 * rendered a vertical radio list, and it is restyled here rather than kept
 * behind a prop whose only job would be preserving that drift. On order and
 * icons the drawing loses — `system` leads, because "the default is to follow
 * your device" belongs at the head of the track, and each option keeps its
 * glyph.
 *
 * ⚠️ Segmented, but NOT `SegmentedControl`: that component is a `tablist` of
 * `tab`s, which is the right widget for switching a view (week/month) and the
 * wrong one for choosing a stored value. This is a `radiogroup` of `radio`s —
 * the semantics `user-menu.test.tsx` and the preferences e2e spec both pin. The
 * two share the LOOK though (`SEGMENTED_TRACK_CLASS`), so the appearance has one
 * owner even where the roles cannot.
 *
 * The track fills its container: in the 288px menu that is the popover's width,
 * and on Settings it lines up with the palette grid directly below it.
 */
export function SchemePicker({ showLabel = true }: SchemePickerProps = {}) {
  const { t } = useTranslation("navigation");
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  // A radiogroup is ONE tab stop, not three: Tab enters, then Arrow/Home/End
  // move focus and selection inside it. Three tab stops is the regression this
  // guards against, and it survived extraction unchanged from the menu.
  const themeIndex = THEME_OPTIONS.indexOf(preference);
  const roving = useRovingFocus({
    count: THEME_OPTIONS.length,
    activeIndex: themeIndex < 0 ? 0 : themeIndex,
    onActivate: (index) => setPreference(THEME_OPTIONS[index]),
  });

  return (
    <View
      accessibilityLabel={t("themeToggle.toggle")}
      accessibilityRole="radiogroup"
      role="radiogroup"
    >
      {showLabel ? (
        <Text className="text-xs font-medium text-muted-foreground px-2 pb-1">
          {t("themeToggle.toggle")}
        </Text>
      ) : null}
      <View className={SEGMENTED_TRACK_CLASS}>
        {THEME_OPTIONS.map((value, index) => {
          const selected = preference === value;
          return (
            <Pressable
              accessibilityLabel={t(`themeToggle.${value}`)}
              accessibilityRole="radio"
              aria-checked={selected}
              key={value}
              // `flex-1` is what makes the three options equal-width; `py-2`
              // is the tap target, since react-native-web ignores `hitSlop`
              // and real padding is the only lever there (#1231). The Bulgarian
              // labels are the tight case - `Системна` against roughly 58px of
              // text room in the 288px menu - hence `px-1` and `gap-1`.
              //
              // `active:bg-accent` is the PRESS state, which the raised fill
              // does not cover: the vertical rows this replaced had one, and a
              // control that only shows what is already chosen says nothing
              // back when you tap the option you have not chosen yet.
              className={cn(
                "flex-1 flex-row items-center justify-center gap-1 rounded-full px-1 py-2 active:bg-accent",
                selected ? SEGMENTED_RAISED_CLASS : "",
              )}
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={() => setPreference(value)}
              role="radio"
              testID={`scheme-option-${value}`}
              {...roving.getItemProps(index, () => setPreference(value))}
            >
              <Icon
                name={THEME_ICONS[value]}
                className={cn(
                  "size-4 shrink-0",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <Text
                className={cn(
                  "text-xs font-semibold",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
                numberOfLines={1}
              >
                {t(`themeToggle.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
