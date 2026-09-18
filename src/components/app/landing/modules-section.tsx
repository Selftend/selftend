import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK, CHROME_MUTED_TEXT, CHROME_RULE } from "@/src/lib/theme/chrome";
import { modulesAreBeta } from "@/src/lib/module-visibility";
import { cn } from "@/lib/utils";

/**
 * The two guided modules. They used to arrive on the landing page each in its
 * own tinted card - CBT violet, ACT green - explicitly so that the signed-out
 * page carried the same module identity the signed-in app did.
 *
 * It still does; the identity just stopped being a colour (#587). Both cards are
 * the same neutral card now, and what tells CBT from ACT here is what tells them
 * apart inside the app: a different glyph, a different kicker, a different name.
 * Leaving the landing page hued would have been the loudest possible
 * inconsistency - it is the first screen anyone sees, and every screen behind it
 * is neutral.
 */
export function ModulesSection() {
  const { t } = useTranslation("auth");

  /**
   * ☠️ **This section is NOT gated, and an earlier revision of this change wrongly gated
   * it.** The landing page is web, and the module gate is iOS-only — so a visitor reading
   * this page can reach both modules after signing up, and hiding the cards would have
   * understated the product to the one audience that still gets it in full.
   *
   * What it does carry is the beta mark, for the same reason the Home cards do: the page
   * is marketing, and marketing a module without saying it is beta is the claim running
   * ahead of the software.
   */
  return (
    <View className="flex-col items-stretch gap-5 sm:flex-row">
      <ModuleCard
        icon="psychology"
        kicker={t("landingPage.cbtKicker")}
        title={t("landingPage.cbtTitle")}
        body={t("landingPage.cbtBody")}
        beta={t("landingPage.moduleBeta")}
      />
      <ModuleCard
        icon="explore"
        kicker={t("landingPage.actKicker")}
        title={t("landingPage.actTitle")}
        body={t("landingPage.actBody")}
        beta={t("landingPage.moduleBeta")}
      />
    </View>
  );
}

function ModuleCard({
  icon,
  kicker,
  title,
  body,
  beta,
}: {
  icon: MaterialIconName;
  kicker: string;
  title: string;
  body: string;
  beta: string;
}) {
  return (
    <View className={cn("flex-1 gap-3 rounded-2xl border bg-card p-7", CHROME_RULE)}>
      <View className="flex-row items-center gap-2.5">
        {/* Glyph and kicker now share one colour. They used to be split - accent
            on the mark, ink on the text - because a hue legible as 12px text was
            too dark to read as a glyph, and vice versa. That tension was a
            property of the hue, not of the pairing. */}
        <Icon name={icon} size={22} className={CHROME_MARK} />
        <Text className={cn("text-xs font-bold uppercase tracking-[0.14em]", CHROME_MUTED_TEXT)}>
          {kicker}
        </Text>
        {modulesAreBeta() ? (
          <Text
            testID="landing-module-beta"
            className={cn(
              "rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
              CHROME_RULE,
              CHROME_MUTED_TEXT,
            )}
          >
            {beta}
          </Text>
        ) : null}
      </View>
      <Text variant="h2" className="text-xl tracking-tight sm:text-xl">
        {title}
      </Text>
      <Text className="text-sm leading-[1.55] text-muted-foreground">{body}</Text>
    </View>
  );
}
