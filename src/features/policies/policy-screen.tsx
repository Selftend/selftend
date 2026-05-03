import * as Linking from "expo-linking";
import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { PolicyAction, PolicySection } from "@/src/features/policies/policy-content";
import { policyLastUpdated } from "@/src/features/policies/policy-content";

interface PolicyScreenProps extends PropsWithChildren {
  actions?: PolicyAction[];
  notice?: string;
  sections: PolicySection[];
  subtitle: string;
  title: string;
}

export function PolicyScreen({
  actions = [],
  children,
  notice,
  sections,
  subtitle,
  title,
}: PolicyScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text variant="h1">{title}</Text>
            <Text variant="muted">
              {subtitle} Last updated: {policyLastUpdated}.
            </Text>
          </View>

      {notice ? (
        <Card>
          <CardHeader>
            <CardTitle>Launch review required</CardTitle>
            <CardDescription>{notice}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {actions.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Helpful links</CardTitle>
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

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.body.map((paragraph) => (
              <CardDescription key={paragraph}>{paragraph}</CardDescription>
            ))}
          </CardHeader>
        </Card>
      ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
