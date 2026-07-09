import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Button } from "@/src/components/react-native-reusables/button";
import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

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
 * "App preview" landing section: a calm, controlled carousel showing one real
 * screenshot at a time in a plain rounded frame (no device-chrome
 * illustration), with previous/next chevrons and tappable dot indicators.
 * No auto-advance - the visitor moves at their own pace.
 */
export function PreviewSection() {
  const { t } = useTranslation("auth");
  const [index, setIndex] = useState(0);
  const active = PREVIEW_IMAGES[index];

  return (
    <View className="gap-6 sm:gap-8">
      <Text variant="h2" className="text-center text-2xl sm:text-3xl">
        {t("landingPage.previewTitle")}
      </Text>

      <View className="flex-row items-center justify-center gap-2 sm:gap-4">
        <Button
          accessibilityLabel={t("landingPage.previewPrev")}
          disabled={index === 0}
          onPress={() => setIndex((current) => Math.max(0, current - 1))}
          size="icon"
          variant="ghost"
        >
          <Icon className="size-6 text-muted-foreground" name="chevron-left" />
        </Button>

        {/* The aspect ratio lives on the frame, and the image fills it: RN-Web
            defaults an Image's height to the asset's intrinsic pixel height,
            which an aspectRatio style on the image itself cannot override. */}
        <View
          className="max-w-[280px] flex-1 overflow-hidden rounded-2xl border border-border bg-card"
          style={{ aspectRatio: SCREENSHOT_ASPECT_RATIO }}
        >
          <Image
            key={active.altKey}
            accessibilityLabel={t(active.altKey)}
            accessibilityRole="image"
            resizeMode="contain"
            source={active.source}
            style={{ width: "100%", height: "100%" }}
          />
        </View>

        <Button
          accessibilityLabel={t("landingPage.previewNext")}
          disabled={index === PREVIEW_IMAGES.length - 1}
          onPress={() => setIndex((current) => Math.min(PREVIEW_IMAGES.length - 1, current + 1))}
          size="icon"
          variant="ghost"
        >
          <Icon className="size-6 text-muted-foreground" name="chevron-right" />
        </Button>
      </View>

      <View className="flex-row items-center justify-center gap-2">
        {PREVIEW_IMAGES.map((image, dotIndex) => (
          <Pressable
            key={image.altKey}
            accessibilityLabel={t("landingPage.previewGoTo", {
              n: dotIndex + 1,
              total: PREVIEW_IMAGES.length,
            })}
            accessibilityRole="button"
            accessibilityState={{ selected: dotIndex === index }}
            className={cn(
              "size-2.5 rounded-full",
              dotIndex === index ? "bg-primary" : "bg-muted-foreground/30",
            )}
            hitSlop={8}
            onPress={() => setIndex(dotIndex)}
          />
        ))}
      </View>
    </View>
  );
}
