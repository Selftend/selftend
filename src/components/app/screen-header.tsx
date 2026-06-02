import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";

interface ScreenHeaderProps {
  title: string;
  right?: ReactNode;
  /** Title heading level. Defaults to "h1"; pass "h2" for screens that used the smaller heading. */
  titleVariant?: "h1" | "h2";
}

// Standard screen header: the breadcrumb eyebrow above the title, with an optional
// trailing element. No back button - parent crumbs handle "up".
export function ScreenHeader({ title, right, titleVariant = "h1" }: ScreenHeaderProps) {
  return (
    <View className="gap-1">
      <ScreenBreadcrumb />
      <View className="flex-row items-center gap-2">
        <Text variant={titleVariant} className="flex-1">
          {title}
        </Text>
        {right}
      </View>
    </View>
  );
}
