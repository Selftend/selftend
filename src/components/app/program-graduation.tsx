import { Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface ProgramGraduationProps {
  lines: string[];
  namespace?: string;
  dismissed: boolean;
  onDismiss: () => void;
  onReplay: () => void;
}

export function ProgramGraduation({
  lines,
  namespace = "cbt",
  dismissed,
  onDismiss,
  onReplay,
}: ProgramGraduationProps) {
  const { t } = useTranslation(namespace);

  if (dismissed) {
    return (
      <Pressable
        accessibilityRole="button"
        hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
        onPress={onReplay}
        className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:bg-accent/40"
        role="button"
      >
        <Icon name="replay" className="size-5 text-muted-foreground" />
        <Text className="flex-1 text-sm font-medium">{t("program.replay")}</Text>
        <Icon name="arrow-forward" className="size-4 text-muted-foreground" />
      </Pressable>
    );
  }

  const hasStats = lines.length > 0;

  return (
    <View className="gap-3 rounded-2xl border border-be/30 bg-be/5 p-5">
      <Text variant="h3" className="text-be">
        {t("program.graduationTitle")}
      </Text>
      <Text variant="muted">
        {hasStats ? t("program.graduationBody") : t("program.graduationBodyEmpty")}
      </Text>
      {hasStats ? (
        <View className="gap-1">
          {lines.map((line) => (
            <View key={line} className="flex-row items-center gap-2">
              <Icon name="check-circle" className="size-4 text-be" />
              <Text className="text-sm">{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Button onPress={onDismiss}>
        <Text>{t("program.graduationDismiss")}</Text>
      </Button>
    </View>
  );
}
