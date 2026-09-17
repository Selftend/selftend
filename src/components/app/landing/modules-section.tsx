import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_MARK, CHROME_MUTED_TEXT, CHROME_RULE } from "@/src/lib/theme/chrome";
import { modulesAreVisible } from "@/src/lib/module-visibility";
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
   * ☠️ The landing page is **marketing**, and a marketing page promising a module the
   * build behind it does not ship is not a styling problem — it is a false claim to
   * someone deciding whether to sign up. So the gate reaches here too (2026-09-17, owner
   * instruction): on a production web build the signed-out page stops advertising CBT and
   * ACT, because a visitor who signs up cannot reach either.
   *
   * ⚠️ This closes only the surface the repo controls. The **App Store description, the
   * Play listing and the landing hero copy** still commit the frame sentence's second beat
   * — "a CBT programme … to work through when you want one" — and this gate cannot edit
   * those. That gap is recorded in `docs/positioning.md` § 1 and needs a human before the
   * next store submission.
   */
  if (!modulesAreVisible()) {
    return null;
  }

  return (
    <View className="flex-col items-stretch gap-5 sm:flex-row">
      <ModuleCard
        icon="psychology"
        kicker={t("landingPage.cbtKicker")}
        title={t("landingPage.cbtTitle")}
        body={t("landingPage.cbtBody")}
      />
      <ModuleCard
        icon="explore"
        kicker={t("landingPage.actKicker")}
        title={t("landingPage.actTitle")}
        body={t("landingPage.actBody")}
      />
    </View>
  );
}

function ModuleCard({
  icon,
  kicker,
  title,
  body,
}: {
  icon: MaterialIconName;
  kicker: string;
  title: string;
  body: string;
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
      </View>
      <Text variant="h2" className="text-xl tracking-tight sm:text-xl">
        {title}
      </Text>
      <Text className="text-sm leading-[1.55] text-muted-foreground">{body}</Text>
    </View>
  );
}
