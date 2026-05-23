import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";

export function HelpSections({ helpKey }: { helpKey: HelpKey }) {
  const { t } = useTranslation("help");
  const entry = HELP_CONTENT[helpKey];
  const sections = [
    { label: t("ui.whatLabel"), body: t(entry.whatKey) },
    { label: t("ui.howLabel"), body: t(entry.howKey) },
    { label: t("ui.whyLabel"), body: t(entry.whyKey) },
  ];
  return (
    <View className="gap-4">
      {sections.map((section) => (
        <View key={section.label} className="gap-1">
          <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.label}
          </Text>
          <Text className="text-sm leading-5">{section.body}</Text>
        </View>
      ))}
    </View>
  );
}
