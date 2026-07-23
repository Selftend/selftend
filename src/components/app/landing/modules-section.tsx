import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { TINT_TEXT } from "@/src/lib/design-tokens";
import { cn } from "@/lib/utils";

/**
 * The two guided modules, each on its own hue-tinted card: CBT on the primary
 * hue, ACT on its module hue. Unlike the equal-weight neutral cards this
 * section replaced, the tint is the point here - it carries each module's
 * identity from the signed-in app onto the landing page.
 */
export function ModulesSection() {
  const { t } = useTranslation("auth");

  return (
    <View className="flex-col items-stretch gap-5 sm:flex-row">
      <ModuleCard
        tint="primary"
        icon="psychology"
        kicker={t("landingPage.cbtKicker")}
        title={t("landingPage.cbtTitle")}
        body={t("landingPage.cbtBody")}
      />
      <ModuleCard
        tint="act"
        icon="explore"
        kicker={t("landingPage.actKicker")}
        title={t("landingPage.actTitle")}
        body={t("landingPage.actBody")}
      />
    </View>
  );
}

const CARD_TINT: Record<"primary" | "act", string> = {
  primary: "border-primary/30 bg-primary/5",
  act: "border-[hsl(var(--act)/0.30)] bg-[hsl(var(--act)/0.05)]",
};

function ModuleCard({
  tint,
  icon,
  kicker,
  title,
  body,
}: {
  tint: "primary" | "act";
  icon: MaterialIconName;
  kicker: string;
  title: string;
  body: string;
}) {
  const tintText = TINT_TEXT[tint];

  return (
    <View className={cn("flex-1 gap-3 rounded-2xl border p-7", CARD_TINT[tint])}>
      <View className="flex-row items-center gap-2.5">
        <Icon name={icon} size={22} className={tintText} />
        <Text className={cn("text-xs font-bold uppercase tracking-[0.14em]", tintText)}>
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
