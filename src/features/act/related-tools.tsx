import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Icon, type MaterialIconName } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";

interface RelatedTool {
  icon: MaterialIconName;
  nameKey: string;
  href: string;
}

interface RelatedToolsProps {
  tools: RelatedTool[];
}

export function RelatedTools({ tools }: RelatedToolsProps) {
  const { t: tAct } = useTranslation("act");
  const { t: tNav } = useTranslation("navigation");

  return (
    <View className="gap-2">
      <Text variant="muted" className="text-xs font-semibold uppercase tracking-wider">
        {tAct("alsoTry")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {tools.map((tool) => (
          <Pressable
            key={tool.href}
            accessibilityRole="link"
            accessibilityLabel={tNav(`sidebar.${tool.nameKey}`)}
            onPress={() => router.push(tool.href as Parameters<typeof router.push>[0])}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 active:bg-accent/40"
          >
            <Icon name={tool.icon} className="size-3.5 text-muted-foreground" />
            <Text className="text-sm text-muted-foreground">{tNav(`sidebar.${tool.nameKey}`)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
