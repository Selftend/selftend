import { router, usePathname, type Href } from "expo-router";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";
import { DEFAULT_INTERACTIVE_HIT_SLOP } from "@/src/lib/accessibility";

interface BackButtonProps {
  /** Override the computed parent path. When omitted, derives from pathname. */
  targetHref?: Href;
  /** Use route hierarchy by default. Use history for flows with multiple possible source screens. */
  mode?: "parent" | "history";
  /** Fallback route when history mode has no browser/native history entry. */
  fallbackHref?: Href;
  className?: string;
  label?: string;
  /** When true (default), shows the "Back" label next to the icon. */
  showLabel?: boolean;
}

/**
 * Hierarchical back button. By default, navigates one segment up the URL
 * tree (eg. /a/b/c → /a/b → /a → /). Renders nothing on the home route.
 */
export function BackButton({
  targetHref,
  mode = "parent",
  fallbackHref,
  className,
  label,
  showLabel = true,
}: BackButtonProps) {
  const { t } = useTranslation("navigation");
  const pathname = usePathname();
  const computed: Href | null | undefined =
    targetHref ?? (mode === "history" ? fallbackHref : (getParentPath(pathname) as Href | null));
  const canUseHistory = mode === "history" && router.canGoBack();

  if (!computed && !canUseHistory) {
    return null;
  }

  const resolvedLabel = label ?? t("sidebar.back");

  return (
    <Pressable
      accessibilityLabel={resolvedLabel}
      accessibilityRole="button"
      hitSlop={DEFAULT_INTERACTIVE_HIT_SLOP}
      onPress={() => {
        if (canUseHistory) {
          router.back();
          return;
        }

        if (computed) {
          router.push(computed);
        }
      }}
      className={cn(
        "flex-row items-center gap-1 rounded-md px-2 py-1 active:bg-muted/60",
        className,
      )}
      role="button"
    >
      <Icon name="arrow-back" className="size-4 text-muted-foreground" />
      {showLabel ? (
        <Text className="text-sm font-medium text-muted-foreground">{resolvedLabel}</Text>
      ) : null}
    </Pressable>
  );
}

/**
 * Given the current pathname, returns the parent path one segment up, or null
 * if we're already at the root.
 *
 * Examples:
 *   "/"                  → null
 *   "/modules/cbt"               → "/"
 *   "/modules/cbt/activities"    → "/modules/cbt"
 *   "/modules/cbt/activities/12" → "/modules/cbt/activities"
 */
export function getParentPath(pathname: string): string | null {
  const cleaned = pathname.replace(/\/+$/, "");
  if (cleaned === "" || cleaned === "/") return null;

  const segments = cleaned.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) return null;
  if (segments.length === 1) return "/";

  segments.pop();
  return `/${segments.join("/")}`;
}
