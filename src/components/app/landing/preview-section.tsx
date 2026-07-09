import { Image, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Text } from "@/src/components/react-native-reusables/text";

// Screenshots are 402x874 (mobile viewport) captures; the aspect ratio keeps
// the frame matching the image exactly, so "contain" never letterboxes.
const SCREENSHOT_ASPECT_RATIO = 402 / 874;

const PREVIEW_IMAGES = [
  {
    source: require("../../../../assets/landing/preview-dashboard.png"),
    altKey: "landingPage.previewAlt1",
  },
  {
    source: require("../../../../assets/landing/preview-thought-record.png"),
    altKey: "landingPage.previewAlt2",
  },
  {
    source: require("../../../../assets/landing/preview-checkin.png"),
    altKey: "landingPage.previewAlt3",
  },
] as const;

/**
 * "App preview" landing section: three real screenshots in plain rounded
 * frames (no device-chrome illustration) so visitors see the calm,
 * uncluttered UI itself rather than a marketing rendering of it. Stacks
 * on narrow viewports, wraps into a row as space allows.
 */
export function PreviewSection() {
  const { t } = useTranslation("auth");

  return (
    <View className="gap-6 sm:gap-8">
      <Text variant="h2" className="text-center text-2xl sm:text-3xl">
        {t("landingPage.previewTitle")}
      </Text>
      <View className="flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-6">
        {PREVIEW_IMAGES.map(({ source, altKey }) => (
          <View
            key={altKey}
            className="w-full max-w-[240px] overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Image
              source={source}
              accessibilityRole="image"
              accessibilityLabel={t(altKey)}
              resizeMode="contain"
              style={{ width: "100%", aspectRatio: SCREENSHOT_ASPECT_RATIO }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
