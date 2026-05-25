import * as Linking from "expo-linking";
import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Text } from "@/src/components/react-native-reusables/text";
import type { PolicyAction } from "@/src/features/policies/policy-content";
import { policyLastUpdated } from "@/src/features/policies/policy-content";
import { ScreenHeader } from "@/src/components/app/screen-header";

interface InfoScreenProps extends PropsWithChildren {
  actions?: PolicyAction[];
  /** i18n key prefix for action labels (e.g. "crisis.actions") */
  notice?: string;
  /** i18n key for the sections array (e.g. "privacy.sections") */
  sectionKey: string;
  showLastUpdated?: boolean;
  subtitle: string;
  title: string;
}

interface TranslatedSection {
  title: string;
  body: string[];
}

export function InfoScreen({
  actions = [],
  children,
  notice,
  sectionKey,
  showLastUpdated = false,
  subtitle,
  title,
}: InfoScreenProps) {
  const { t } = useTranslation("policies");
  const sections = t(sectionKey, { returnObjects: true }) as TranslatedSection[];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={title} />
            <Text variant="muted">
              {subtitle}
              {showLastUpdated ? ` ${t("lastUpdated", { date: policyLastUpdated })}` : null}
            </Text>
          </View>

          {notice ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("launchReview")}</CardTitle>
                <CardDescription>{notice}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {actions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("helpfulLinks")}</CardTitle>
              </CardHeader>
              <CardContent>
                <View className="gap-3">
                  {actions.map((action) => (
                    <Button
                      key={action.url}
                      onPress={() => void Linking.openURL(action.url)}
                      variant="secondary"
                    >
                      <Text>{action.label}</Text>
                    </Button>
                  ))}
                </View>
              </CardContent>
            </Card>
          ) : null}

          {children}

          {Array.isArray(sections)
            ? sections.map((section, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{section.title}</CardTitle>
                    {section.body.map((paragraph, pIndex) => (
                      <CardDescription key={pIndex}>{paragraph}</CardDescription>
                    ))}
                  </CardHeader>
                </Card>
              ))
            : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
