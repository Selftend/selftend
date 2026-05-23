import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { HelpSections } from "@/src/components/app/help-sections";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";
import { useReduceMotionEnabled, DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface HelpSheetProps {
  helpKey: HelpKey;
  visible: boolean;
  onDismiss: () => void;
}

export function HelpSheet({ helpKey, visible, onDismiss }: HelpSheetProps) {
  const { t } = useTranslation("help");
  const reduceMotion = useReduceMotionEnabled();

  return (
    <Modal
      animationType={reduceMotion ? "none" : "slide"}
      visible={visible}
      onRequestClose={onDismiss}
    >
      <SafeAreaView className="flex-1 bg-background">
        <ScrollView contentContainerClassName="gap-6 p-6">
          <View className="flex-row items-start justify-between gap-3">
            <Text variant="h2" className="flex-1">
              {t(HELP_CONTENT[helpKey].titleKey)}
            </Text>
            <Pressable
              accessibilityLabel={t("ui.close")}
              accessibilityRole="button"
              hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
              onPress={onDismiss}
            >
              <Icon name="close" className="size-6 text-muted-foreground" />
            </Pressable>
          </View>
          <HelpSections helpKey={helpKey} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
