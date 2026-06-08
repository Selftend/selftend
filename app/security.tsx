import * as Linking from "expo-linking";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenHeader } from "@/src/components/app/screen-header";
import { appEnv } from "@/src/lib/env";

interface TranslatedSection {
  title: string;
  body: string[];
}

export default function SecurityScreen() {
  const { t } = useTranslation("security");
  const sections = t("page.sections", { returnObjects: true }) as TranslatedSection[];

  const securityEmail = appEnv.securityEmail || "security@selftend.org";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <ScreenHeader title={t("page.pageTitle")} />
            <Text variant="muted">{t("page.pageDescription")}</Text>
          </View>

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

          {/* Link to full Privacy Policy */}
          <Button
            variant="outline"
            className="justify-start"
            onPress={() => router.push("/privacy")}
          >
            <Icon name="privacy-tip" size={18} />
            <Text className="flex-1">{t("page.privacyPolicyLink")}</Text>
            <Icon name="chevron-right" size={18} className="text-muted-foreground" />
          </Button>

          {/* Security contact */}
          <Button
            variant="outline"
            className="justify-start"
            onPress={() => void Linking.openURL(`mailto:${securityEmail}`)}
          >
            <Icon name="shield" size={18} />
            <Text className="flex-1">{t("page.securityContactLabel")}</Text>
            <Icon name="open-in-new" size={18} className="text-muted-foreground" />
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
