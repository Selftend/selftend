import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent } from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const CONCERNS = [
  "depression",
  "anxiety",
  "panic",
  "socialAnxiety",
  "anger",
  "procrastination",
] as const;

interface CbtWizardProps {
  errorMessage?: string;
  isPending?: boolean;
  onComplete: (selectedConcerns: string[]) => void;
  onDismiss: () => void;
  visible: boolean;
}

export function CbtWizard({
  errorMessage,
  isPending = false,
  onComplete,
  onDismiss,
  visible,
}: CbtWizardProps) {
  const { t } = useTranslation("cbt");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );
  };

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
          <View className="gap-3">
            <Text variant="h2" className="text-center">
              {t("onboarding.concerns.title")}
            </Text>
            <Text variant="muted" className="text-center">
              {t("onboarding.concerns.subtitle")}
            </Text>
          </View>

          <View className="gap-4">
            {CONCERNS.map((concern) => {
              const checked = selectedConcerns.includes(concern);
              const label = t(`onboarding.concerns.${concern}`);
              return (
                <Card key={concern}>
                  <CardContent className="flex-row items-center gap-4 pb-4 pt-4">
                    <Checkbox
                      accessibilityLabel={label}
                      checked={checked}
                      onCheckedChange={() => toggleConcern(concern)}
                    />
                    <Label onPress={() => toggleConcern(concern)} className="flex-1">
                      {label}
                    </Label>
                  </CardContent>
                </Card>
              );
            })}
          </View>

          <View className="gap-4">
            <Button disabled={isPending} onPress={() => onComplete(selectedConcerns)}>
              {isPending ? <ActivityIndicator color="#ffffff" /> : null}
              <Text>{t("onboarding.concerns.continue")}</Text>
            </Button>
            {errorMessage ? <Text className="text-sm text-destructive">{errorMessage}</Text> : null}
            <Button onPress={onDismiss} variant="ghost">
              <Text>{t("onboarding.dismiss")}</Text>
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
