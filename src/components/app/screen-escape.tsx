import { Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { findUpCrumb } from "@/src/lib/breadcrumbs";
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

  // The same hop the arrow made from inside the trail; the rule itself lives on
  // `findUpCrumb` so nothing re-derives it. A one-crumb screen has no ancestor
  // crumb at all, and its Up is the root - which is what CONTEXT.md's "Up" entry
  // records. The repo-wide assertion keeping the invariant true that this rests
  // on ships with the gate suite (#1263).
  const upCrumb = findUpCrumb(crumbs);
  const upHref = upCrumb?.href ?? "/";

  // What the Escape promises out loud (#1253). An explicit `accessibilityLabel`
  // REPLACES a pressable's children for a screen reader, so a glyph-only label
  // would hide from screen-reader users the destination the arrow is about to
  // name on screen (the off-trail Origin case).
  //
  // Where the trail has no name for the destination, the Escape says "Go back".
  // Two alternatives were weighed and rejected: announcing the fallback word
  // ("Back to Entry") puts a name in front of screen-reader users that is really
  // the absence of one, and naming the nearest *named* ancestor ("Back to
  // Journal") names a screen the Escape does not go to - the silent divergence
  // between promise and destination that this whole rule exists to close.
  //
  // With no ancestor crumb at all the hop is to the root, which does have a
  // name. That covers the one-crumb screens and the whole `(auth)` group.
  const destination = upCrumb ? (upCrumb.unresolved ? null : upCrumb.label) : t("sidebar.home");

  return (
    <Pressable
      // The label follows the glyph, not the destination: on a form the promise
      // is *abandoning* this, and where it lands is secondary - an X announced
      // as "Back to Goals" sells the wrong thing. Both do the same structural
      // hop (#733).
      accessibilityLabel={
        glyph === "close"
          ? tc("close")
          : destination
            ? t("breadcrumb.backTo", { name: destination })
            : t("breadcrumb.back")
      }
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
