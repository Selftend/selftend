import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/src/components/button";
import { Card } from "@/src/components/card";
import { NoticeCard } from "@/src/components/notice-card";
import { Screen } from "@/src/components/screen";
import { appEnv } from "@/src/lib/env";

export default function SupportScreen() {
  const supportEmail = appEnv.supportEmail;
  const supportSubject = encodeURIComponent("SelfTend support");

  return (
    <Screen
      subtitle="Project links, public contact paths, policy pages, and clear safety boundaries."
      title="Support"
    >
      <NoticeCard
        body="This app is built as guided self-help. If you need urgent help or crisis support, use local emergency and crisis resources instead of relying on the app."
        title="Important boundary"
        tone="warning"
      />

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Contact</Text>
          {supportEmail ? (
            <Button
              onPress={() => void Linking.openURL(`mailto:${supportEmail}?subject=${supportSubject}`)}
              text="Email support"
            />
          ) : (
            <Text className="text-sm leading-6 text-ink/70">
              Set EXPO_PUBLIC_SUPPORT_EMAIL before public launch. Until then, use GitHub issues for project feedback
              that does not include private health details.
            </Text>
          )}
          <Button onPress={() => router.push("/account-deletion")} text="Request account deletion" variant="ghost" />
        </View>
      </Card>

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Project links</Text>
          <Button onPress={() => void Linking.openURL(appEnv.githubRepoUrl)} text="Open repository" />
          <Button
            onPress={() => void Linking.openURL(`${appEnv.githubRepoUrl}/blob/main/CONTRIBUTING.md`)}
            text="Open contribution guide"
            variant="secondary"
          />
        </View>
      </Card>

      <Card>
        <View className="gap-4">
          <Text className="text-lg font-semibold text-ink">Policies and safety</Text>
          <Button onPress={() => router.push("/crisis")} text="Open crisis guidance" variant="secondary" />
          <Button onPress={() => router.push("/privacy")} text="Open privacy policy" variant="ghost" />
          <Button onPress={() => router.push("/terms")} text="Open terms and boundaries" variant="ghost" />
        </View>
      </Card>
    </Screen>
  );
}
