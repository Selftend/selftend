import { Fragment } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

interface ScreenBreadcrumbProps {
  /**
   * The leading affordance's glyph. `ScreenTopBar` passes "close" on a
   * create/edit form, where the promise is "abandon this" rather than "go up a
   * level" - both do the same structural hop (#733).
   */
  backIcon?: "arrow-back" | "close";
}

// The breadcrumb trail rendered as a screen eyebrow (above the title). Hidden when
// there is no parent to show - a lone current-page crumb just repeats the title.
export function ScreenBreadcrumb({ backIcon = "arrow-back" }: ScreenBreadcrumbProps) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const crumbs = useBreadcrumbs();

  if (crumbs.length < 2) return null;

  // Wherever a breadcrumb trail renders, a back affordance rides with it
  // (#495). It is STRUCTURAL - always one step up the trail, Material's "Up",
  // not history (owner decision, 2026-07-29): the arrow sits inside the crumb
  // row so it reads as part of the trail, browser/system back already covers
  // history on every platform, and a deterministic single hop can never
  // bounce the way history-back does. `replace`, not `push`: climbing the
  // hierarchy shouldn't stack another history entry to climb back out of.
  const parentHref = [...crumbs].reverse().find((crumb) => crumb.href)?.href ?? "/";

  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <Pressable
        // The label follows the glyph, not the destination: an X announced as
        // "Go back" tells a screen-reader user the opposite of what the sighted
        // promise is. Both do the same structural hop (#733).
        accessibilityLabel={backIcon === "close" ? tc("close") : t("breadcrumb.back")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.replace(parentHref as never)}
        className="active:opacity-70"
      >
        <Icon name={backIcon} className="size-4 text-muted-foreground" />
      </Pressable>
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
