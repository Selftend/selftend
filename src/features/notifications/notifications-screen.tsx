import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { BackButton } from "@/src/components/app/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Switch } from "@/src/components/react-native-reusables/switch";
import { Text } from "@/src/components/react-native-reusables/text";
import { LoadingState } from "@/src/components/app/screen-state";
import { mergeUserPreferences } from "@/src/features/modules/types";
import { useUpdateUserPreferences, useUserPreferences } from "@/src/features/settings/queries";
import { NOTIFICATION_TARGETS } from "@/src/features/notifications/registry";
import { NotificationTargetCard } from "@/src/features/notifications/notification-target-card";
import { cancelAllReminders } from "@/src/lib/notifications";
import { useSession } from "@/src/providers/session-provider";

export default function NotificationsScreen() {
  const { t } = useTranslation("notifications");
  const { user } = useSession();
  const userId = user?.id ?? null;

  const { data: preferences, isLoading } = useUserPreferences(userId);
  const updatePreferences = useUpdateUserPreferences(userId);

  const globalEnabled = preferences?.notificationsEnabledGlobal ?? true;

  async function handleGlobalToggle(next: boolean) {
    if (!preferences || !userId) return;
    if (!next) {
      await cancelAllReminders(userId);
    }
    await updatePreferences.mutateAsync(
      mergeUserPreferences(preferences, { notificationsEnabledGlobal: next }),
    );
  }

  const modules = NOTIFICATION_TARGETS.filter((target) => target.kind === "module");
  const tools = NOTIFICATION_TARGETS.filter((target) => target.kind === "tool");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("title")}</Text>
            </View>
            <Text variant="muted" className="max-w-[64ch]">
              {t("description")}
            </Text>
          </View>

          {isLoading ? <LoadingState title={t("title")} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("globalMaster.label")}</CardTitle>
              <CardDescription>{t("globalMaster.hint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <View className="flex-row items-center justify-between">
                <Text className="flex-1">{t("globalMaster.label")}</Text>
                <Switch
                  accessibilityLabel={t("globalMaster.label")}
                  accessibilityHint={t("globalMaster.hint")}
                  checked={globalEnabled}
                  disabled={!preferences || updatePreferences.isPending}
                  onCheckedChange={(value) => void handleGlobalToggle(value)}
                />
              </View>
            </CardContent>
          </Card>

          {preferences ? (
            <>
              {modules.length > 0 ? (
                <View className="gap-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("sections.modules")}
                  </Text>
                  <View className="gap-3">
                    {modules.map((target) => (
                      <NotificationTargetCard
                        key={target.key}
                        target={target}
                        preferences={preferences}
                        userId={userId}
                        globalEnabled={globalEnabled}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {tools.length > 0 ? (
                <View className="gap-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("sections.tools")}
                  </Text>
                  <View className="gap-3">
                    {tools.map((target) => (
                      <NotificationTargetCard
                        key={target.key}
                        target={target}
                        preferences={preferences}
                        userId={userId}
                        globalEnabled={globalEnabled}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
