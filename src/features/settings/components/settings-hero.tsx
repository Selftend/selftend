import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { useWideFrame } from "@/src/features/settings/use-wide-frame";
import { cn } from "@/lib/utils";

/**
 * Settings hero: eyebrow + title + intro. Extracted verbatim from the screen.
 *
 * ☠️ **The `36px` h1 and this eyebrow's scale are both deliberately left alone
 * by #1830.** `14a` draws a 32px h1 and steps it to 27 on its phone frame, but
 * the audit (#1788) ruled the shipped 36/800 against the design system's own
 * kit and the drawing's inline numbers as the hand-rolled ones — so the base the
 * drawing steps DOWN FROM is not the base this page has, and #1830's acceptance
 * criteria say the h1 is untouched. The eyebrow is `variant="eyebrow"` doing the
 * PAGE-eyebrow job, which D7 explicitly must not reach (#1828 gave the group
 * labels their own component precisely so this one could stay at 700 / 0.14em).
 *
 * The intro does step, because nothing rules otherwise and it is the one hero
 * line the drawing and the kit agree on.
 */
export function SettingsHero() {
  const { t } = useTranslation("settings");
  const wide = useWideFrame();

  return (
    <View className="mt-2">
      <Text variant="eyebrow">{t("account.eyebrow")}</Text>
      <Text variant="h1" className="mt-2 text-[36px] font-extrabold leading-[1.1] tracking-tight">
        {t("title")}
      </Text>
      <Text
        className={cn(
          "mt-2.5 leading-[1.55] text-muted-foreground max-w-[60ch]",
          wide ? "text-[15px]" : "text-[13.5px]",
        )}
      >
        {t("account.intro")}
      </Text>
    </View>
  );
}
