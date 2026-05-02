import * as Linking from "expo-linking";
import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
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
    <Screen subtitle={`${subtitle} Last updated: ${policyLastUpdated}.`} title={title}>
      {notice ? <NoticeCard body={notice} title="Launch review required" tone="warning" /> : null}

      {actions.length ? (
        <Card>
          <View className="gap-3">
            <Text className="text-lg font-semibold text-ink">Helpful links</Text>
            {actions.map((action) => (
              <Button
                key={action.url}
                onPress={() => void Linking.openURL(action.url)}
                text={action.label}
                variant="secondary"
              />
            ))}
          </View>
        </Card>
      ) : null}

      {children}

      {sections.map((section) => (
        <Card key={section.title}>
          <View className="gap-3">
            <Text className="text-lg font-semibold text-ink">{section.title}</Text>
            {section.body.map((paragraph) => (
              <TextBody key={paragraph}>{paragraph}</TextBody>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function TextBody({ children }: PropsWithChildren) {
  return <Text className="text-sm leading-6 text-ink/70">{children}</Text>;
}
