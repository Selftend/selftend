import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/src/components/react-native-reusables/text";
import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { ScreenEscape } from "@/src/components/app/screen-escape";

interface ScreenHeaderProps {
  title: string;
  right?: ReactNode;
  /** Title heading level. Defaults to "h1"; pass "h2" for screens that used the smaller heading. */
  titleVariant?: "h1" | "h2";
}

/**
 * Standard screen header: the Escape and the breadcrumb eyebrow above the title,
 * with an optional trailing element.
 *
 * The Escape renders unconditionally, and must keep doing so - never wrap it in
 * a condition (#1250). The trail beside it still hides at one crumb, which is
 * why the two are separate components rather than one row.
 */
export function ScreenHeader({ title, right, titleVariant = "h1" }: ScreenHeaderProps) {
  return (
    <View className="gap-1">
      <View className="flex-row flex-wrap items-center gap-2">
        <ScreenEscape />
        <ScreenBreadcrumb />
      </View>
      <View className="flex-row items-center gap-2">
        <Text variant={titleVariant} className="flex-1">
          {title}
        </Text>
        {right}
      </View>
    </View>
  );
}
