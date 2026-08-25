import { Image, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { PressShieldModal } from "@/src/components/app/press-shield-modal";
import { HelpSections } from "@/src/components/app/help-sections";
import { Text } from "@/src/components/react-native-reusables/text";
import { HELP_CONTENT, type HelpKey } from "@/src/features/help/help-content";
import { HELP_IMAGES } from "@/src/features/help/help-images";

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
    <PressShieldModal visible={visible} onEscape={onDismiss} onRequestClose={onDismiss}>
      {/* No "top": the wrapper's escape row already sits in the top inset. */}
      <SafeAreaView edges={["bottom", "left", "right"]} className="flex-1 bg-background">
        <ScrollView contentContainerClassName="p-6">
          <View testID="help-sheet-content" className="w-full max-w-2xl mx-auto gap-6">
            {/* Title in the scroll body, matching every other guide: the
                pinned row above holds only the Escape, so this sheet no
                longer carries an in-scroll X of its own (M5, #1257). */}
            <Text variant="h2">{title}</Text>
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
