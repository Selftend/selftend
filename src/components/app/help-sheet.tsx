import { Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { HelpSections } from "@/src/components/app/help-sections";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";
import { HELP_IMAGES } from "@/src/features/help/help-images";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface HelpSheetProps {
  helpKey: HelpKey;
  visible: boolean;
  onDismiss: () => void;
}

export function HelpSheet({ helpKey, visible, onDismiss }: HelpSheetProps) {
  const { t } = useTranslation("help");
  const entry = HELP_CONTENT[helpKey];
  const title = t(entry.titleKey);
  const imageSource = HELP_IMAGES[helpKey];

  return (
    // The in-scroll X below stays for now: several modals briefly show two
    // exits, and de-duplicating them (along with moving this sheet's title
    // down into the body, M5) is W19/#1257.
    <PressShieldModal visible={visible} onEscape={onDismiss} onRequestClose={onDismiss}>
      {/* No "top": the wrapper's escape row already sits in the top inset. */}
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
        <ScrollView contentContainerClassName="p-6">
          <View testID="help-sheet-content" className="w-full max-w-2xl mx-auto gap-6">
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
          </View>
        </ScrollView>
      </SafeAreaView>
    </PressShieldModal>
  );
}
