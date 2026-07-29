import { Fragment } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

interface ScreenBreadcrumbProps {
  /**
   * "default" renders muted-on-surface text. "onField" renders white ink for
   * use on a module-hue field header (ModuleHomeHeader variant="field").
   */
  tone?: "default" | "onField";
}

// The breadcrumb trail rendered as a screen eyebrow (above the title). Hidden when
// there is no parent to show - a lone current-page crumb just repeats the title.
export function ScreenBreadcrumb({ tone = "default" }: ScreenBreadcrumbProps) {
  const { t } = useTranslation("navigation");
  const crumbs = useBreadcrumbs();
  const onField = tone === "onField";

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
        accessibilityLabel={t("breadcrumb.back")}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.replace(parentHref as never)}
        className="active:opacity-70"
      >
        <Icon
          name="arrow-back"
          className={onField ? "size-4 text-white/[0.88]" : "size-4 text-muted-foreground"}
        />
      </Pressable>
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <Text
              className={
                onField ? "text-[11px] text-white/60" : "text-[11px] text-muted-foreground/50"
              }
            >
              ·
            </Text>
          ) : null}
          {crumb.href ? (
            <Pressable
              accessibilityRole="link"
              hitSlop={4}
              onPress={() => router.push(crumb.href as never)}
            >
              <Text
                className={
                  onField
                    ? "text-[11px] font-semibold uppercase tracking-[0.14em] text-white/[0.88] active:opacity-70"
                    : "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground active:opacity-70"
                }
              >
                {crumb.label}
              </Text>
            </Pressable>
          ) : (
            <Text
              className={
                onField
                  ? "text-[11px] font-semibold uppercase tracking-[0.14em] text-white"
                  : "text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground"
              }
            >
              {crumb.label}
            </Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}
