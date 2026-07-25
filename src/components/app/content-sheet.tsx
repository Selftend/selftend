import { View } from "react-native";

import { cn } from "@/lib/utils";

/**
 * How far the sheet rises over the field above it (px). Direction B's field
 * header (ModuleHomeHeader variant="field") reserves this much extra bottom
 * padding so the overlap never eats into its content.
 */
export const CONTENT_SHEET_OVERLAP = 26;

/**
 * The Direction B content sheet: a large-radius surface that rises over the
 * module-hue field header. Place directly after a `ModuleHomeHeader
 * variant="field"` inside a gap-less full-width wrapper — the sheet pulls
 * itself up over the field's bottom edge. Content below the sheet continues
 * on `bg-background`, so on a room screen the sheet blends seamlessly into
 * the rest of the scroll.
 */
export function ContentSheet({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  return (
    <View className={cn("-mt-[26px] rounded-t-[28px] bg-background pt-6", className)} {...props}>
      {children}
    </View>
  );
}
