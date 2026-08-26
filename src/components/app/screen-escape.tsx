import { Pressable } from "react-native";
import { router, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import { Icon } from "@/src/components/react-native-reusables/icon";
import { Text } from "@/src/components/react-native-reusables/text";
import { CHROME_EYEBROW_TYPE } from "@/src/components/app/screen-breadcrumb";
import { isOffTrail, nameOrigin, useEscapeOrigin } from "@/src/lib/escape-origin";
import { findUpCrumb } from "@/src/lib/breadcrumbs";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import { cn } from "@/lib/utils";

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
 * The destination is structural - one step up the screen's own trail, Material's
 * "Up", never history (owner decision, 2026-07-29; #1162 retired the "system
 * back covers it" justification but the ruling stands on determinism) - **unless
 * the arrival carried an Origin that is not on this screen's trail**, in which
 * case it leads back there instead (R2, #1261). The reported symptom is the case
 * it was written for: the bell on the CBT module home lands on Reminders, whose
 * Up is Home, and the user loses their place.
 *
 * `replace`, not `push`, for both destinations: an Escape is a leave, not a
 * drill-down, so it must not stack another entry to climb back out of - and the
 * Origin is typically already in the stack, where a push would mount a second
 * copy (the defect #1027/#989 fixed).
 */
export function ScreenEscape({ glyph = "arrow-back" }: ScreenEscapeProps) {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const pathname = usePathname();
  const crumbs = useBreadcrumbs();
  // Consumed on mount and held for this screen's lifetime, never re-read from
  // the store: the Escape renders on every pass, and a consume-on-read would
  // clear the Origin before the second one (O4).
  const carriedOrigin = useEscapeOrigin(pathname);

  // The same hop the arrow made from inside the trail; the rule itself lives on
  // `findUpCrumb` so nothing re-derives it. A one-crumb screen has no ancestor
  // crumb at all, and its Up is the root - which is what CONTEXT.md's "Up" entry
  // records. The repo-wide assertion keeping the invariant true that this rests
  // on ships with the gate suite (#1263).
  const upCrumb = findUpCrumb(crumbs);
  const upHref = upCrumb?.href ?? "/";

  // R2's trigger is *off-trail*, not *whenever an Origin exists*. Inside a
  // subtree Up and the Origin are the same route, so an unconditional Origin
  // rule could only ever differ by being wrong - which is why recording a push
  // is opt-out and needs no judgement at the call site.
  const originHref =
    carriedOrigin && isOffTrail(carriedOrigin, pathname, crumbs, upHref) ? carriedOrigin : null;
  // `null` where the route map has no name for the Origin - an opaque record,
  // say. The Escape still GOES there and simply does not name it: naming is the
  // announcement's problem, never the destination's. Redirecting to Up instead
  // would be the worse failure of the two, because the whole point of the rule
  // is that a user who crossed subtrees gets back to what they were doing - a
  // journal entry someone left for `/crisis` is exactly the case where being
  // returned to Home instead is least acceptable.
  //
  // The Origin then reuses #1253's naming path unchanged, "Go back" fallback
  // included. What it must never do is render the generic crumb label, which
  // would put "Entry" beside the arrow as though it were a place (O6).
  const originName = originHref ? nameOrigin(originHref, t) : null;
  const escapeHref = originHref ?? upHref;

  // What the Escape promises out loud (#1253). An explicit `accessibilityLabel`
  // REPLACES a pressable's children for a screen reader, so a glyph-only label
  // would hide from screen-reader users the destination the arrow names on
  // screen in the off-trail Origin case.
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
  const upName = upCrumb ? (upCrumb.unresolved ? null : upCrumb.label) : t("sidebar.home");
  // The name follows the DESTINATION, so an unnameable Origin announces "Go
  // back" rather than borrowing Up's name. Falling back to `upName` here would
  // announce "Back to Home" on a press that goes to the journal entry instead -
  // precisely the divergence between promise and destination this rule exists
  // to close, reintroduced in the announcement.
  const destination = originHref ? originName : upName;

  return (
    <Pressable
      // The label follows the glyph, not the destination: on a form the promise
      // is *abandoning* this, and where it lands is secondary - an X announced
      // as "Back to Goals" sells the wrong thing. Both do the same structural
      // hop (#733), Origin included.
      accessibilityLabel={
        glyph === "close"
          ? tc("close")
          : destination
            ? t("breadcrumb.backTo", { name: destination })
            : t("breadcrumb.back")
      }
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.replace(escapeHref as never)}
      testID="screen-escape"
      className="shrink flex-row items-center gap-1 active:opacity-70"
    >
      {/* `shrink-0`, because the row above shrinks: the glyph is the affordance
          and must keep its full 16dp target however tight the row gets. Only the
          name beside it gives way. */}
      <Icon name={glyph} className="size-4 shrink-0 text-muted-foreground" />
      {/* R5: the arrow wears the destination's NAME when it leads to an Origin.
          A bare arrow identical to Up but leading elsewhere is a silent
          divergence - and on a one-crumb screen like Reminders the trail is
          hidden anyway, so this label is the only thing naming where the exit
          goes.

          Withheld under the close glyph even on an off-trail arrival: there the
          promise is *abandoning*, and `✕ CBT` reads as a location claim. The
          destination still follows R2; only the label is withheld.

          The trail's own eyebrow type, because it sits in that band. Measured
          rather than guessed (canvas `measureText`, the real Noto Sans 600 face):
          the widest name either shipped locale can put here is Bulgarian
          "Дневник на благодарността" at 216.5dp uppercase-and-tracked, against
          360 − 48 (the screen's `p-6`) − 16 (glyph) − 4 (`gap-1`) = 292dp of row
          on `/notifications` at 360dp, where the trail is hidden.
          It fits, so nothing truncates today; `numberOfLines` makes the fallback
          in a tighter host predictable - one line, ellipsis at the end, never a
          mid-word break and never a row pushed past the screen edge. */}
      {glyph === "arrow-back" && originName ? (
        <Text numberOfLines={1} className={cn(CHROME_EYEBROW_TYPE, "shrink text-muted-foreground")}>
          {originName}
        </Text>
      ) : null}
    </Pressable>
  );
}
