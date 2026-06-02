import { Fragment } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { Text } from "@/src/components/react-native-reusables/text";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

// The breadcrumb trail rendered as a screen eyebrow (above the title). Hidden when
// there is no parent to show - a lone current-page crumb just repeats the title.
export function ScreenBreadcrumb() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length < 2) return null;

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 ? <Text className="text-[11px] text-muted-foreground/50">·</Text> : null}
          {crumb.href ? (
            <Pressable
              accessibilityRole="link"
              hitSlop={4}
              onPress={() => router.push(crumb.href as never)}
            >
              <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground active:opacity-70">
                {crumb.label}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
              {crumb.label}
            </Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}
