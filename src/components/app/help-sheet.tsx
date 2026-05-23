import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { HelpSections } from "@/src/components/app/help-sections";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";
import { HELP_IMAGES } from "@/src/features/help/help-images";
import { useReduceMotionEnabled, DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface HelpSheetProps {
  helpKey: HelpKey;
  visible: boolean;
  onDismiss: () => void;
}

export function HelpSheet({ helpKey, visible, onDismiss }: HelpSheetProps) {
  const { t } = useTranslation("help");
  const reduceMotion = useReduceMotionEnabled();
  const entry = HELP_CONTENT[helpKey];
  const title = t(entry.titleKey);
  const imageSource = HELP_IMAGES[helpKey];

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
              {title}
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
          {imageSource ? (
            <Image
              accessibilityLabel={title}
              resizeMode="contain"
              source={imageSource}
              style={{ alignSelf: "center", height: 220, maxWidth: 320, width: "100%" }}
            />
          ) : null}
          <HelpSections helpKey={helpKey} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
