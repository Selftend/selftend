import { Fragment } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { enterKeyActivationProps } from "@/src/lib/accessibility";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

/**
 * The breadcrumb trail rendered as a screen eyebrow (above the title). Hidden
 * when there is no parent to show - a lone current-page crumb just repeats the
 * title.
 *
 * The trail only. The leading back affordance used to live in here and so
 * disappeared with it, leaving one-crumb screens with no way out at all; it is
 * now `ScreenEscape`, a chrome slot of its own that never hides (#1250). This
 * component's own hiding rule is unchanged - it was always about the trail.
 *
 * `shrink`, so the trail wraps inside itself rather than pushing the Escape
 * beside it off the row at 360dp.
 */
/**
 * The chrome eyebrow: the type every crumb is set in, and the type the Escape
 * sets an Origin's name in when it carries one (#1261).
 *
 * Shared rather than spelled out at each site because the match is a design
 * requirement, not a coincidence - the Escape and the trail sit in the same row,
 * and a name beside the arrow in a different weight reads as a mistake.
 *
 * ⚠️ The weight is `font-semibold`, which is NOT what `Text variant="eyebrow"`
 * ships (`font-bold`), so that variant cannot stand in for this.
 */
export const CHROME_EYEBROW_TYPE = "text-[11px] font-semibold uppercase tracking-[0.14em]";

/**
 * A crumb with somewhere to go. The current crumb has no `href` and renders as
 * plain text in `ScreenBreadcrumb` itself.
 */
function ParentCrumb({ href, label }: { href: string; label: string }) {
  // A crumb targets an ANCESTOR, so the destination is in the stack by
  // definition and a plain push mounted a second copy of it every time
  // (#1027). Marked here rather than on the destination screens because
  // breadcrumbs reach routes the layouts never declare.
  const open = () => router.push(href as never, { dangerouslySingular: true });

  return (
    <Pressable
      accessibilityRole="link"
      hitSlop={4}
      onPress={open}
      // The crumb's `href` is a breadcrumb datum, never a Pressable prop, so on
      // web this is a `<div role="link">` - which react-native-web leaves to the
      // browser on Enter as though it were an anchor. The crumb brings its own
      // Enter handler, firing the same singular push (#1730).
      {...enterKeyActivationProps(open)}
    >
      <Text className={cn(CHROME_EYEBROW_TYPE, "text-muted-foreground active:opacity-70")}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ScreenBreadcrumb() {
  const crumbs = useBreadcrumbs();

  if (crumbs.length < 2) return null;

  return (
    <View className="shrink flex-row flex-wrap items-center gap-2">
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 ? <Text className="text-[11px] text-muted-foreground/50">·</Text> : null}
          {crumb.href ? (
            <ParentCrumb href={crumb.href} label={crumb.label} />
          ) : (
            <Text className={cn(CHROME_EYEBROW_TYPE, "text-foreground")}>{crumb.label}</Text>
          )}
        </Fragment>
      ))}
    </View>
  );
}
