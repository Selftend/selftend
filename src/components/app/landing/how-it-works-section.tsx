import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";

/**
 * "How it works" in three numbered cards. The copy is the anti-pressure
 * pitch (no intake quiz, no expiry, no streak to protect), so the layout
 * stays deliberately flat: same card chrome for all three, big quiet
 * numbers instead of icons or imagery.
 */
export function HowItWorksSection() {
  const { t } = useTranslation("auth");

  const steps = [1, 2, 3].map((n) => ({
    n: `0${n}`,
    title: t(`landingPage.step${n}Title`),
    body: t(`landingPage.step${n}Body`),
  }));

  return (
    <View className="items-center gap-6">
      <Text
        variant="h2"
        className="text-center text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {t("landingPage.howTitle")}
      </Text>
      <View className="w-full flex-col items-stretch gap-4 sm:flex-row">
        {steps.map((step) => (
          <View
            key={step.n}
            className="flex-1 gap-2 rounded-xl border border-border bg-card p-5 shadow-sm shadow-black/5"
          >
            <Text className="text-2xl font-extrabold tracking-tight text-primary/45">{step.n}</Text>
            <Text className="text-[15.5px] font-semibold">{step.title}</Text>
            <Text className="text-[13.5px] leading-[1.5] text-muted-foreground">{step.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
