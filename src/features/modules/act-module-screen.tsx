import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CompassIcon, SmilePlusIcon, WindIcon, BookHeartIcon } from "lucide-react-native";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/react-native-reusables/card";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { BackButton } from "@/src/components/app/back-button";
import { CrisisSupportCallout } from "@/src/components/app/safety-callout";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

const PROCESS_KEYS = [
  "defusion",
  "acceptance",
  "present",
  "selfAsContext",
  "values",
  "committedAction",
] as const;

interface SharedTool {
  href: string;
  icon: typeof SmilePlusIcon;
  labelKey: string;
}

const SHARED_TOOLS: SharedTool[] = [
  { href: "/tools/mood-tracker", icon: SmilePlusIcon, labelKey: "sidebar.moodTracker" },
  { href: "/tools/mindfulness", icon: WindIcon, labelKey: "sidebar.mindfulness" },
  { href: "/tools/gratitude-log", icon: BookHeartIcon, labelKey: "sidebar.gratitudeLog" },
];

export default function ActModuleScreen() {
  const { t } = useTranslation("modules");
  const { t: tNav } = useTranslation("navigation");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className="gap-6">
          <View className="gap-2">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("act.eyebrow")}
            </Text>
            <View className="flex-row items-center gap-2">
              <BackButton showLabel={false} className="-ml-2" />
              <Text variant="h1">{t("act.title")}</Text>
            </View>
            <Text variant="muted" className="max-w-[64ch]">
              {t("act.description")}
            </Text>
          </View>

          <Card className="border-act/30 bg-act/5">
            <CardHeader className="flex-row items-center gap-4">
              <View className="size-14 items-center justify-center rounded-xl border border-act/30 bg-act/15">
                <Icon as={CompassIcon} className="size-7 text-act" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-base font-semibold">{t("act.statusTitle")}</Text>
                <Text variant="muted" className="text-sm leading-5">
                  {t("act.statusBody")}
                </Text>
              </View>
            </CardHeader>
          </Card>

          <View className="gap-3">
            <Text variant="h3">{t("act.processesTitle")}</Text>
            <Text variant="muted" className="max-w-[60ch]">
              {t("act.processesDescription")}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-3">
              {PROCESS_KEYS.map((key) => (
                <View key={key} className="min-w-[260px] flex-1 basis-[260px]">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t(`act.processes.${key}.name`)}</CardTitle>
                      <CardDescription>{t(`act.processes.${key}.desc`)}</CardDescription>
                    </CardHeader>
                  </Card>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <Text variant="h3">{t("act.toolsTitle")}</Text>
            <Text variant="muted">{t("act.toolsDescription")}</Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {SHARED_TOOLS.map((tool) => (
                <Pressable
                  accessibilityLabel={tNav(tool.labelKey)}
                  accessibilityRole="button"
                  hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
                  key={tool.href}
                  onPress={() => router.push(tool.href as Parameters<typeof router.push>[0])}
                  className="min-w-[180px] flex-1 basis-[180px] flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
                >
                  <View className="size-10 items-center justify-center rounded-lg bg-be/15">
                    <Icon as={tool.icon} className="size-5 text-be" />
                  </View>
                  <Text className="flex-1 text-sm font-semibold">{tNav(tool.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <CrisisSupportCallout />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
