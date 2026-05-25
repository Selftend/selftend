import { Fragment } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";

import { Text } from "@/src/components/react-native-reusables/text";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

export function Breadcrumbs() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length === 0) return null;

  return (
    <View className="border-t border-border/50">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center gap-2 px-4 py-1.5"
      >
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
      </ScrollView>
    </View>
  );
}
