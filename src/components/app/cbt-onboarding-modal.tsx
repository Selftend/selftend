import { ActivityIndicator, Image, Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/src/components/react-native-reusables/button";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Checkbox } from "@/src/components/react-native-reusables/checkbox";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { useReduceMotionEnabled } from "@/src/lib/accessibility";

const pillarAct = require("../../../assets/images/onboarding/pillar-act.png");
const pillarThink = require("../../../assets/images/onboarding/pillar-think.png");
const pillarBe = require("../../../assets/images/onboarding/pillar-be.png");
const toolBeliefs = require("../../../assets/images/onboarding/tool-beliefs.png");
const toolExposure = require("../../../assets/images/onboarding/tool-exposure.png");
const toolSleep = require("../../../assets/images/onboarding/tool-sleep.png");

const CONCERNS = [
  "depression",
  "anxiety",
  "panic",
  "socialAnxiety",
  "anger",
  "procrastination",
] as const;

interface CbtOnboardingProps {
  errorMessage?: string;
  isPending?: boolean;
  onComplete: (selectedConcerns: string[]) => void;
  onDismiss?: () => void;
  visible: boolean;
}

interface TableRowProps {
  condition: string;
  feature: string;
  focus: string;
  isLast?: boolean;
}

function TableRow({ condition, feature, focus, isLast = false }: TableRowProps) {
  return (
    <View className={`flex-row${isLast ? "" : " border-b border-border"}`}>
      <View className="w-1/4 border-r border-border p-2">
        <Text className="text-xs font-medium">{condition}</Text>
      </View>
      <View className="w-1/4 border-r border-border p-2">
        <Text className="text-xs text-muted-foreground">{feature}</Text>
      </View>
      <View className="flex-1 p-2">
        <Text className="text-xs text-muted-foreground">{focus}</Text>
      </View>
    </View>
  );
}

export function CbtOnboarding({
  errorMessage,
  isPending = false,
  onComplete,
  onDismiss,
  visible,
}: CbtOnboardingProps) {
  const { t } = useTranslation("cbt");
  const reduceMotionEnabled = useReduceMotionEnabled();
  const [step, setStep] = useState<"intro" | "concerns">("intro");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);

  const toggleConcern = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern],
    );
  };

  return (
    <Modal
      animationType={reduceMotionEnabled ? "none" : "slide"}
      onRequestClose={onDismiss ?? (() => undefined)}
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background">
        {step === "intro" ? (
          <ScrollView contentContainerClassName="gap-8 p-6 pb-12">
            {/* Header */}
            <View className="items-center gap-3">
              <Text variant="h2" className="text-center">
                {t("onboarding.intro.title")}
              </Text>
              <Text variant="muted" className="text-center">
                {t("onboarding.intro.subtitle")}
              </Text>
            </View>

            {/* Three pillars */}
            <View className="gap-4">
              <Card className="border-act/30 bg-act/5">
                <CardContent className="items-center gap-3 pt-6">
                  <Image
                    source={pillarAct}
                    style={{ width: 200, height: 118 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.actTitle")}
                  />
                  <CardTitle className="text-center text-act">
                    {t("onboarding.intro.actTitle")}
                  </CardTitle>
                  <Text variant="muted" className="text-center">
                    {t("onboarding.intro.actBody")}
                  </Text>
                </CardContent>
              </Card>

              <Card className="border-think/30 bg-think/5">
                <CardContent className="items-center gap-3 pt-6">
                  <Image
                    source={pillarThink}
                    style={{ width: 200, height: 118 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.thinkTitle")}
                  />
                  <CardTitle className="text-center text-think">
                    {t("onboarding.intro.thinkTitle")}
                  </CardTitle>
                  <Text variant="muted" className="text-center">
                    {t("onboarding.intro.thinkBody")}
                  </Text>
                </CardContent>
              </Card>

              <Card className="border-be/30 bg-be/5">
                <CardContent className="items-center gap-3 pt-6">
                  <Image
                    source={pillarBe}
                    style={{ width: 200, height: 118 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.beTitle")}
                  />
                  <CardTitle className="text-center text-be">
                    {t("onboarding.intro.beTitle")}
                  </CardTitle>
                  <Text variant="muted" className="text-center">
                    {t("onboarding.intro.beBody")}
                  </Text>
                </CardContent>
              </Card>
            </View>

            {/* Tools for Lasting Change */}
            <View className="gap-4">
              <Text variant="h3" className="text-center">
                {t("onboarding.intro.toolsTitle")}
              </Text>

              <Card>
                <CardContent className="flex-row items-center gap-4 pt-6">
                  <Image
                    source={toolBeliefs}
                    style={{ width: 72, height: 72 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.beliefsTitle")}
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold">{t("onboarding.intro.beliefsTitle")}</Text>
                    <Text variant="muted">{t("onboarding.intro.beliefsBody")}</Text>
                  </View>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex-row items-center gap-4 pt-6">
                  <Image
                    source={toolExposure}
                    style={{ width: 72, height: 72 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.exposureTitle")}
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold">{t("onboarding.intro.exposureTitle")}</Text>
                    <Text variant="muted">{t("onboarding.intro.exposureBody")}</Text>
                  </View>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex-row items-center gap-4 pt-6">
                  <Image
                    source={toolSleep}
                    style={{ width: 72, height: 72 }}
                    resizeMode="contain"
                    accessibilityLabel={t("onboarding.intro.sleepTitle")}
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold">{t("onboarding.intro.sleepTitle")}</Text>
                    <Text variant="muted">{t("onboarding.intro.sleepBody")}</Text>
                  </View>
                </CardContent>
              </Card>
            </View>

            {/* Condition table */}
            <View className="overflow-hidden rounded-lg border border-border">
              <View className="flex-row border-b border-border">
                <View className="w-1/4 border-r border-border p-2">
                  <Text className="text-xs font-semibold">
                    {t("onboarding.intro.tableCondition")}
                  </Text>
                </View>
                <View className="w-1/4 border-r border-border p-2">
                  <Text className="text-xs font-semibold">
                    {t("onboarding.intro.tableCoreFeature")}
                  </Text>
                </View>
                <View className="flex-1 p-2">
                  <Text className="text-xs font-semibold">
                    {t("onboarding.intro.tableCbtFocus")}
                  </Text>
                </View>
              </View>
              <TableRow
                condition={t("onboarding.intro.tableRow1Condition")}
                feature={t("onboarding.intro.tableRow1Feature")}
                focus={t("onboarding.intro.tableRow1Focus")}
              />
              <TableRow
                condition={t("onboarding.intro.tableRow2Condition")}
                feature={t("onboarding.intro.tableRow2Feature")}
                focus={t("onboarding.intro.tableRow2Focus")}
              />
              <TableRow
                condition={t("onboarding.intro.tableRow3Condition")}
                feature={t("onboarding.intro.tableRow3Feature")}
                focus={t("onboarding.intro.tableRow3Focus")}
                isLast
              />
            </View>

            {/* CTA + attribution */}
            <View className="gap-4">
              {onDismiss ? (
                <Button onPress={onDismiss}>
                  <Text>{t("onboarding.dismiss")}</Text>
                </Button>
              ) : (
                <Button onPress={() => setStep("concerns")}>
                  <Text>{t("onboarding.intro.continue")}</Text>
                </Button>
              )}
              <Text className="text-center text-xs text-muted-foreground">
                {t("onboarding.intro.attribution")}
              </Text>
            </View>
          </ScrollView>
        ) : (
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
                    <CardContent className="flex-row items-center gap-4 pt-4 pb-4">
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
              {errorMessage ? (
                <Text className="text-sm text-destructive">{errorMessage}</Text>
              ) : null}
              <Button onPress={() => setStep("intro")} variant="ghost">
                <Text>{t("onboarding.concerns.back")}</Text>
              </Button>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
