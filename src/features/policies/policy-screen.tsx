import * as Linking from "expo-linking";
import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { PolicyAction } from "@/src/features/policies/policy-content";
import { policyLastUpdated } from "@/src/features/policies/policy-content";

interface PolicyScreenProps extends PropsWithChildren {
  actions?: PolicyAction[];
  /** i18n key prefix for action labels (e.g. "crisis.actions") */
  actionLabelsKey?: string;
  notice?: string;
  /** i18n key for the sections array (e.g. "privacy.sections") */
  sectionKey: string;
  subtitle: string;
  title: string;
}

interface TranslatedSection {
  title: string;
  body: string[];
}

export function PolicyScreen({
  actions = [],
  actionLabelsKey,
  children,
  notice,
  sectionKey,
  subtitle,
  title,
}: PolicyScreenProps) {
  const { t } = useTranslation("policies");
  const sections = t(sectionKey, { returnObjects: true }) as TranslatedSection[];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{title}</Text>
            <Text variant="muted">
              {subtitle} {t("lastUpdated", { date: policyLastUpdated })}
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
