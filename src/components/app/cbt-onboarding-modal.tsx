import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

import { RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";

const pillarAct = require("../../../assets/images/onboarding/pillar-act.png");
const pillarThink = require("../../../assets/images/onboarding/pillar-think.png");
const pillarBe = require("../../../assets/images/onboarding/pillar-be.png");
const toolBeliefs = require("../../../assets/images/onboarding/tool-beliefs.png");
const toolExposure = require("../../../assets/images/onboarding/tool-exposure.png");
const toolSleep = require("../../../assets/images/onboarding/tool-sleep.png");

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

interface CbtOnboardingProps {
  errorMessage?: string;
  isPending?: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
  visible: boolean;
}

export function CbtOnboarding({
  errorMessage,
  isPending = false,
  onComplete,
  onDismiss,
  visible,
}: CbtOnboardingProps) {
  const { t } = useTranslation("cbt");

  return (
    <RichOnboardingShell
      visible={visible}
      isPending={isPending}
      errorMessage={errorMessage}
      ctaLabel={t("onboarding.intro.continue")}
      onComplete={onComplete}
      onDismiss={onDismiss}
      footerSlot={
        <Text className="text-center text-xs text-muted-foreground">
          {t("onboarding.intro.attribution")}
        </Text>
      }
    >
      <View className="items-center gap-3">
        <Text variant="h2" className="text-center">
          {t("onboarding.intro.title")}
        </Text>
        <Text variant="muted" className="text-center">
          {t("onboarding.intro.subtitle")}
        </Text>
      </View>

      <View className="gap-4">
        <Card className="border-act/30 bg-act/5">
          <CardContent className="items-center gap-3 pt-6">
            <Image
              source={pillarAct}
              style={{ width: 200, height: 118 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.intro.actTitle")}
            />
            <CardTitle className="text-center text-act">{t("onboarding.intro.actTitle")}</CardTitle>
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
            <CardTitle className="text-center text-be">{t("onboarding.intro.beTitle")}</CardTitle>
            <Text variant="muted" className="text-center">
              {t("onboarding.intro.beBody")}
            </Text>
          </CardContent>
        </Card>
      </View>

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

      <View className="overflow-hidden rounded-lg border border-border">
        <View className="flex-row border-b border-border">
          <View className="w-1/4 border-r border-border p-2">
            <Text className="text-xs font-semibold">{t("onboarding.intro.tableCondition")}</Text>
          </View>
          <View className="w-1/4 border-r border-border p-2">
            <Text className="text-xs font-semibold">{t("onboarding.intro.tableCoreFeature")}</Text>
          </View>
          <View className="flex-1 p-2">
            <Text className="text-xs font-semibold">{t("onboarding.intro.tableCbtFocus")}</Text>
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
    </RichOnboardingShell>
  );
}
