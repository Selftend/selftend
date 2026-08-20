import { Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";

interface ScreenEscapeProps {
  /**
   * The glyph. `ScreenTopBar` passes "close" on a create/edit form, where the
   * promise is "abandon this" rather than "go up a level" - both do the same
   * structural hop (#733).
   */
  glyph?: "arrow-back" | "close";
}

/**
 * The Escape: the single leading affordance that lets a user leave a screen
 * (#1163, spec on #1167).
 *
 * It is a slot of the chrome in its own right, deliberately NOT a child of the
 * breadcrumb trail. It used to live inside `ScreenBreadcrumb`, which returns
 * nothing below two crumbs - so on a one-crumb screen the way out vanished with
 * the trail. That disappearance was never a decision: the recorded ruling ("a
 * lone current-page crumb just repeats the title") is about the *trail*, and the
 * arrow only went with it as collateral of where it lived. The two are now
 * decoupled: the trail still hides at one crumb, the Escape never does.
 *
 * Every chrome component renders this **unconditionally** - never
 * `{cond ? <ScreenEscape/> : null}`. That is load-bearing beyond appearance: it
 * turns the enforcement gate's question from "does an escape render here?"
 * (which no static walk can answer) into "does this route reach the chrome at
 * all?" (which one can, exactly).
 *
 * The destination is structural - always one step up the screen's own trail,
 * Material's "Up", never history (owner decision, 2026-07-29; #1162 retired the
 * "system back covers it" justification but the ruling stands on determinism).
 * `replace`, not `push`: an Escape is a leave, not a drill-down, so it must not
 * stack another entry to climb back out of.
 */
export function ScreenEscape({ glyph = "arrow-back" }: ScreenEscapeProps) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const crumbs = useBreadcrumbs();

  // The deepest crumb that still carries an href - the same hop the arrow made
  // from inside the trail. That is the parent, because the terminal crumb is the
  // current screen and carries no href: `computeBreadcrumbs` now guarantees a
  // trail always ends href-less, which is what #1251 fixed (T1a). Before it, an
  // unmapped segment could swallow the one after it and strand an href on the
  // last crumb, and this lookup then read one crumb too shallow.
  //
  // The repo-wide assertion that keeps it true ships with the gate suite (#1263).
  //
  // A one-crumb screen has no ancestor crumb at all, and its Up is the root -
  // which is what CONTEXT.md's "Up" entry records.
  const upHref = [...crumbs].reverse().find((crumb) => crumb.href)?.href ?? "/";

  return (
    <Pressable
      // The label follows the glyph, not the destination: an X announced as
      // "Go back" tells a screen-reader user the opposite of what the sighted
      // promise is. Both do the same structural hop (#733).
      accessibilityLabel={glyph === "close" ? tc("close") : t("breadcrumb.back")}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.replace(upHref as never)}
      testID="screen-escape"
      className="active:opacity-70"
    >
      <Icon name={glyph} className="size-4 text-muted-foreground" />
    </Pressable>
  );
}
