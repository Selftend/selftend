import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardTitle } from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";

import { HelpSections } from "@/src/components/app/help-sections";
import { RichOnboardingShell } from "@/src/components/app/rich-onboarding-shell";

const pillarAct = require("../../../assets/images/onboarding/cbt_act_lead_with_action.png");
const pillarThink = require("../../../assets/images/onboarding/cbt_think_challenge_patterns.png");
const pillarBe = require("../../../assets/images/onboarding/cbt_be_mindful_presence.png");
const toolBeliefs = require("../../../assets/images/onboarding/cbt_core_beliefs_schemas.png");
const toolExposure = require("../../../assets/images/onboarding/cbt_exposure_door.png");
const toolSleep = require("../../../assets/images/onboarding/cbt_sleep_target.png");

interface TableRowProps {
  condition: string;
  focus: string;
  isLast?: boolean;
}

/**
 * ☠️ Two columns, and the third is not coming back (#1867). A "Core Feature"
 * column sat between these two — pairing a named condition with its defining
 * feature — and that pairing is what turned background reading into a
 * self-identification prompt once the eligibility floor moved to 13+ (#1767).
 * Condition + CBT Focus keeps the useful half. The condition column is wider
 * than the old quarter because the acronym it used to hide is now spelled out.
 */
function TableRow({ condition, focus, isLast = false }: TableRowProps) {
  return (
    <View className={`flex-row${isLast ? "" : " border-b border-border"}`}>
      <View className="w-2/5 border-r border-border p-2">
        <Text className="text-xs font-medium">{condition}</Text>
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
  onDismiss: () => void;
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
      accessibilityLabel={t("onboarding.intro.title")}
      ctaLabel={t("onboarding.intro.continue")}
      onComplete={onComplete}
      onDismiss={onDismiss}
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
        <Card className="border-border bg-muted">
          <CardContent className="items-center gap-3 pt-6">
            <Image
              source={pillarThink}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.intro.thinkTitle")}
            />
            <CardTitle className="text-center text-foreground">
              {t("onboarding.intro.thinkTitle")}
            </CardTitle>
            <Text variant="muted" className="text-center">
              {t("onboarding.intro.thinkBody")}
            </Text>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted">
          <CardContent className="items-center gap-3 pt-6">
            <Image
              source={pillarAct}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.intro.actTitle")}
            />
            <CardTitle className="text-center text-foreground">
              {t("onboarding.intro.actTitle")}
            </CardTitle>
            <Text variant="muted" className="text-center">
              {t("onboarding.intro.actBody")}
            </Text>
          </CardContent>
        </Card>

        <Card className="border-border bg-muted">
          <CardContent className="items-center gap-3 pt-6">
            <Image
              source={pillarBe}
              style={{ width: 180, height: 180 }}
              resizeMode="contain"
              accessibilityLabel={t("onboarding.intro.beTitle")}
            />
            <CardTitle className="text-center text-foreground">
              {t("onboarding.intro.beTitle")}
            </CardTitle>
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

      {/*
       * The table names three clinical diagnoses beside the techniques used for them,
       * which is the strongest thing in the app that reads as treatment information
       * (#1002). It is educational and never assesses anyone - this line makes that
       * true on the screen's face rather than only in argument (#1011).
       *
       * ☠️ Re-read at 13+ and softened rather than removed (#1867, ruling: option 3).
       * The floor moved in #1767 and this screen is now met by thirteen-year-olds on
       * their first entry to the module, which changed the character of three things:
       * the acronym `GAD` was expanded (it was spelled out nowhere in the app, in
       * either locale), the intro no longer says "clinically" - it framed the module
       * as clinical treatment on the very screen introducing it - and the
       * "Core Feature" column is gone. The "not a diagnosis, an assessment, or a
       * treatment plan" clause is untouched: it is doing real work and stays verbatim.
       */}
      <View className="gap-2">
        <Text variant="muted" className="text-sm">
          {t("onboarding.intro.tableIntro")}
        </Text>

        <View className="overflow-hidden rounded-lg border border-border">
          <View className="flex-row border-b border-border">
            <View className="w-2/5 border-r border-border p-2">
              <Text className="text-xs font-semibold">{t("onboarding.intro.tableCondition")}</Text>
            </View>
            <View className="flex-1 p-2">
              <Text className="text-xs font-semibold">{t("onboarding.intro.tableCbtFocus")}</Text>
            </View>
          </View>
          <TableRow
            condition={t("onboarding.intro.tableRow1Condition")}
            focus={t("onboarding.intro.tableRow1Focus")}
          />
          <TableRow
            condition={t("onboarding.intro.tableRow2Condition")}
            focus={t("onboarding.intro.tableRow2Focus")}
          />
          <TableRow
            condition={t("onboarding.intro.tableRow3Condition")}
            focus={t("onboarding.intro.tableRow3Focus")}
            isLast
          />
        </View>
      </View>

      <HelpSections helpKey="program" />
    </RichOnboardingShell>
  );
}
