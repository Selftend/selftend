import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { HueButton } from "@/src/features/grounding/hue-button";
import { HueIconBadge } from "@/src/features/grounding/hue-icon-badge";
import { hueHsl, type ExerciseHue } from "@/src/features/mindfulness/exercise-hue";
import type { GroundingTechnique } from "@/src/constants/grounding";

interface GroundingIntroProps {
  technique: GroundingTechnique;
  title: string;
  description: string;
  steps: string[];
  onStart: () => void;
}

function StepNumber({ n, hue }: { n: number; hue: ExerciseHue }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: hueHsl(hue, isDark, 0.14),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text tint={hue} className="text-[13px] font-bold">
        {n}
      </Text>
    </View>
  );
}

export function GroundingIntro({
  technique,
  title,
  description,
  steps,
  onStart,
}: GroundingIntroProps) {
  const { t } = useTranslation("cbt");
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6 gap-6">
        <ScreenBreadcrumb />
        <HueIconBadge icon={technique.icon} hue={technique.hue} size={64} iconSize={32} />
        <View className="gap-2">
          <Text variant="h1">{title}</Text>
          <Text variant="muted">{description}</Text>
        </View>
        <Card>
          <CardContent className="gap-3 pt-4">
            {steps.map((step, i) => (
              <View key={i} className="flex-row items-start gap-3.5">
                <StepNumber n={i + 1} hue={technique.hue} />
                <Text className="flex-1 leading-relaxed">{step}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
        <HueButton
          hue={technique.hue}
          icon="play-arrow"
          label={t("grounding.start")}
          onPress={onStart}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
