import * as React from "react";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { THEME_HEXES } from "@/lib/theme";
import { Text } from "@/src/components/react-native-reusables/text";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { useColorSchemeName } from "@/src/lib/color-scheme";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";
import { useRovingFocus } from "@/src/lib/roving-focus";
import { useSetStyle, useStyleName } from "@/src/lib/style";
import { DEFAULT_STYLE, STYLE_LABELS, STYLE_NAMES } from "@/src/lib/theme/styles";

// The style half of the theme control (#583). One component with two mount
// points — the user menu and Settings — rather than two implementations, so
// there is no second copy to drift. `scheme-picker.tsx` is the appearance half
// and now has the same two mounts (#1827).
//
// Placement note, because the design and the spec disagree and the spec won:
// the imported mock shows a dedicated header button opening a 344px popover.
// That is a desktop mock, and a phone pays for that chrome on every screen
// forever. The existing user menu is already popover-on-web / sheet-on-native,
// so expanding it needs no new surface machinery.

/**
 * The three chips a card shows: page, ink, accent.
 *
 * Read back off the RESOLVED tokens rather than from the palette's authored
 * hexes, so a card can never advertise a colour the app does not actually
 * paint — including for `quiet-lilac`, whose core hexes do not exist (it is
 * hand-authored as twenty tokens).
 */
function swatchHexes(style: (typeof STYLE_NAMES)[number], scheme: "light" | "dark") {
  const hexes = THEME_HEXES[style][scheme];
  return [hexes["--background"], hexes["--foreground"], hexes["--primary"]];
}

interface StylePickerProps {
  /**
   * The per-card wrapper's classes. Two-up in the user menu's 344px popover;
   * settings passes `"w-1/2 md:w-1/4 p-1"` for a 4-up desktop grid.
   *
   * The 4-up grid is measured safe: 136px per label on the settings frame against
   * the shipped popover's 108px, with the widest label - `Plum Manuscript` - at
   * 95.8px. Palette names are untranslated proper nouns, which makes this the one
   * grid on the settings page immune to Bulgarian.
   */
  itemClassName?: string;
  /**
   * The group's own `Switch style` caption. Settings passes `false`: the caption
   * sits directly under the page's palette line, and two labels for one grid is
   * one more than the grid needs.
   */
  heading?: boolean;
}

export function StylePicker({
  itemClassName = "w-1/2 p-1",
  heading = true,
}: StylePickerProps = {}) {
  const { t } = useTranslation("navigation");
  const scheme = useColorSchemeName();
  const active = useStyleName();
  const setStyle = useSetStyle();

  // A radiogroup is ONE tab stop, not eight: Tab enters the group, then
  // Arrow/Home/End move focus and selection inside it. Without this each card
  // was its own tab stop and the arrow keys did nothing - the same widget the
  // language and appearance groups directly above already get right.
  const activeIndex = STYLE_NAMES.indexOf(active);
  const roving = useRovingFocus({
    count: STYLE_NAMES.length,
    // A style is always set, so -1 only happens if a stored name outlives its
    // palette. Fall back to the first card so the group stays tab-reachable.
    activeIndex: activeIndex < 0 ? 0 : activeIndex,
    onActivate: (index) => setStyle(STYLE_NAMES[index]),
  });

  return (
    <View
      accessibilityRole="radiogroup"
      role="radiogroup"
      accessibilityLabel={t("styleToggle.toggle")}
    >
      {/* The group keeps its `accessibilityLabel` either way, so hiding the
          caption never leaves the radiogroup unnamed. */}
      {heading ? (
        <Text className="text-xs font-medium text-muted-foreground px-2 pb-1">
          {t("styleToggle.toggle")}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap">
        {STYLE_NAMES.map((style, index) => {
          const selected = style === active;
          return (
            // The wrapper carries the grid class, so it carries the testID that
            // proves which grid this mount point asked for.
            <View className={itemClassName} key={style} testID={`style-item-${style}`}>
              <Pressable
                // The palette name is a proper noun and is NOT translated; the
                // "Default" tag around it is.
                accessibilityLabel={
                  style === DEFAULT_STYLE
                    ? `${STYLE_LABELS[style]}, ${t("styleToggle.default")}`
                    : STYLE_LABELS[style]
                }
                accessibilityRole="radio"
                aria-checked={selected}
                className={`gap-2 rounded-md border p-2 active:bg-accent ${
                  selected ? "border-primary bg-primary/10" : "border-border"
                }`}
                hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                onPress={() => setStyle(style)}
                role="radio"
                testID={`style-card-${style}`}
                {...roving.getItemProps(index, () => setStyle(style))}
              >
                <View className="flex-row gap-1">
                  {swatchHexes(style, scheme).map((hex, index) => (
                    <View
                      // Inline because the colour is data, not a class: these are
                      // eight palettes' worth of arbitrary hexes, which Tailwind
                      // cannot compile and NativeWind cannot resolve.
                      style={{ backgroundColor: hex }}
                      className="size-4 rounded-full border border-border"
                      key={index}
                      testID={`style-chip-${style}-${index}`}
                    />
                  ))}
                </View>
                <View className="flex-row items-center gap-1">
                  {selected ? <Icon name="check" className="size-3 text-primary-ink" /> : null}
                  <Text className="text-xs" numberOfLines={1}>
                    {STYLE_LABELS[style]}
                  </Text>
                </View>
                {style === DEFAULT_STYLE ? (
                  <Text className="text-[10px] text-muted-foreground">
                    {t("styleToggle.default")}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}
