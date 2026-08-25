import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { type Dayjs } from "dayjs";

/** The key a day cell is registered and addressed by. */
export const DAY_KEY_FORMAT = "YYYY-MM-DD";

/**
 * How far a day or week move will walk past unavailable days before giving up.
 *
 * A month, deliberately: enough to step over a blocked tail — the CBT target
 * date disables every past day but the one already stored — and short enough
 * that one arrow key can never carry focus into a different season.
 */
const WALK_LIMIT_DAYS = 31;

interface FocusableNode {
  focus?: () => void;
}

/** What a day cell is handed. Empty off web, where there is no Tab order. */
export interface CalendarDayFocusProps {
  ref?: (node: FocusableNode | null) => void;
  tabIndex?: 0 | -1;
  onKeyDown?: (event: CalendarKeyEvent) => void;
}

/** The slice of a web `KeyboardEvent` this hook reads. */
interface CalendarKeyEvent {
  key: string;
  preventDefault: () => void;
}

interface UseCalendarRovingFocusOptions {
  /**
   * Where focus sits before the user has moved it — the selected day, or today
   * when nothing is selected. Read once, on mount: after that the keyboard owns
   * it, and re-seeding from a changing selection would drag focus around behind
   * the user.
   */
  initialDate: Dayjs;
  /**
   * True for a day the calendar will not let the user pick. Arrow keys step
   * OVER these rather than landing on them, so the grid never offers a target
   * that does nothing when it is pressed.
   */
  isUnavailable: (date: Dayjs) => boolean;
}

/** A move: where it aims, and which way it walks when that day is unavailable. */
type Move =
  | { kind: "step"; days: number }
  | { kind: "weekEdge"; edge: "first" | "last" }
  | { kind: "month"; months: number };

/**
 * The APG date-grid key map: arrows move by day and by week, Home/End along the
 * week, PageUp/PageDown by month.
 *
 * Enter and Space are absent on purpose. react-native-web's own `Pressable`
 * already turns both into a press, and it runs before anything spread onto it,
 * so a second handler here would select the day twice.
 */
const MOVES: Record<string, Move> = {
  ArrowLeft: { kind: "step", days: -1 },
  ArrowRight: { kind: "step", days: 1 },
  ArrowUp: { kind: "step", days: -7 },
  ArrowDown: { kind: "step", days: 7 },
  Home: { kind: "weekEdge", edge: "first" },
  End: { kind: "weekEdge", edge: "last" },
  PageUp: { kind: "month", months: -1 },
  PageDown: { kind: "month", months: 1 },
};

/**
 * The Monday of a day's week.
 *
 * ⚠️ Hand-rolled rather than `startOf("week")`, which reads the GLOBAL dayjs
 * locale — and `react-native-ui-datepicker` rewrites that on every render. The
 * app is unconditionally Monday-first (`mondayKeyOf`, `src/utils/date.ts`) and
 * the calendar is mounted with `firstDayOfWeek: 1`, so the week start is a
 * constant here rather than something to derive. `.day()` is 0-Sunday and
 * locale-independent.
 */
function startOfWeek(date: Dayjs): Dayjs {
  return date.subtract((date.day() + 6) % 7, "day");
}

/**
 * The first available day at or after `from`, walking `step` days at a time.
 * Null once `limit` candidates have all been unavailable.
 */
function firstAvailable(
  from: Dayjs,
  step: number,
  limit: number,
  isUnavailable: (date: Dayjs) => boolean,
): Dayjs | null {
  let candidate = from;
  for (let tried = 0; tried < limit; tried += 1) {
    if (!isUnavailable(candidate)) return candidate;
    candidate = candidate.add(step, "day");
  }
  return null;
}

/**
 * Where a key press should move focus, or null when focus should not move at
 * all — an unhandled key, or a move whose whole search window is unavailable.
 *
 * ⚠️ This never selects. Committing on every move would fire roughly thirty
 * draft changes crossing a month, and would tie the selected state to focus —
 * an APG anti-pattern that would also make the screen-reader state #1301 added
 * (`aria-pressed`) lie about which day is selected.
 */
export function nextFocusedDate(
  from: Dayjs,
  key: string,
  isUnavailable: (date: Dayjs) => boolean,
): Dayjs | null {
  const move = MOVES[key];
  if (!move) return null;

  if (move.kind === "weekEdge") {
    // Bounded by the week, and it always finds something: the day focus is
    // already on is in this week, and is available by construction.
    const monday = startOfWeek(from);
    return move.edge === "first"
      ? firstAvailable(monday, 1, 7, isUnavailable)
      : firstAvailable(monday.add(6, "day"), -1, 7, isUnavailable);
  }

  if (move.kind === "month") {
    // `add(n, "month")` clamps rather than overflowing, so paging off the 31st
    // lands on the last day of a shorter month instead of skipping the month.
    const target = from.add(move.months, "month");
    const backwards = firstAvailable(target, -1, target.date(), isUnavailable);
    const forwards = firstAvailable(
      target,
      1,
      target.daysInMonth() - target.date() + 1,
      isUnavailable,
    );
    // Both ways, direction of travel first, and both bounded by the month the
    // page aimed at — a search that fell through into the month beyond would
    // look like one press had moved two. Only searching the way it was heading
    // would strand PageUp: arriving on a blocked 5th, it would walk into the
    // 1st and give up with the whole back half of that month selectable.
    return (move.months < 0 ? (backwards ?? forwards) : (forwards ?? backwards)) ?? null;
  }

  return firstAvailable(
    from.add(move.days, "day"),
    move.days < 0 ? -1 : 1,
    WALK_LIMIT_DAYS,
    isUnavailable,
  );
}

/**
 * Roving focus over a calendar grid: the whole grid is ONE tab stop, and the
 * APG date-grid keys move focus inside it.
 *
 * Measured before this existed, tabbing through the open picker took 36 stops —
 * thirty of them individual day buttons — and no arrow key moved focus at all,
 * so crossing a month meant thirty presses of Tab.
 *
 * ⚠️ Not `useRovingFocus` (`src/lib/roving-focus.ts`). That one is 1-D
 * (`ArrowDown` is a synonym for `ArrowRight`, Home/End jump the whole list,
 * there is no paging) and it ACTIVATES on every move — the radiogroup pattern,
 * and exactly wrong for a calendar.
 *
 * Web only: `{}` per day everywhere else, because no other platform has a Tab
 * order to rove over.
 */
export function useCalendarRovingFocus({
  initialDate,
  isUnavailable,
}: UseCalendarRovingFocusOptions) {
  // The seed can itself be blocked — a goal whose stored target date has since
  // been overtaken by a stricter clamp — so it is resolved the same way a month
  // change is, rather than trusted.
  const [focusedDate, setFocusedDate] = useState<Dayjs>(
    () =>
      firstAvailable(
        initialDate,
        1,
        initialDate.daysInMonth() - initialDate.date() + 1,
        isUnavailable,
      ) ?? initialDate,
  );

  const dayNodes = useRef(new Map<string, FocusableNode>());
  const dayRefs = useRef(new Map<string, (node: FocusableNode | null) => void>());
  /**
   * The day waiting to receive real DOM focus, set only by a key press — never
   * by the month buttons, which would otherwise pull focus out of the button
   * being clicked and stop a second click from ever landing.
   */
  const pendingFocus = useRef<string | null>(null);

  /** Hand DOM focus to the pending day, if that day is on screen by now. */
  const flushPendingFocus = useCallback(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const node = dayNodes.current.get(pending);
    if (!node) return;
    pendingFocus.current = null;
    node.focus?.();
  }, []);

  // Deliberately dependency-free, so it runs after EVERY commit. This is the
  // path for a move INSIDE the visible month: the target day was already
  // mounted, its ref callback is stable, and so React never calls it again.
  useEffect(flushPendingFocus);

  // Read through a ref so a caller can rebuild the predicate every render (the
  // CBT field's closes over the stored value) without re-creating every day's
  // props, and so the callbacks below stay stable.
  const isUnavailableRef = useRef(isUnavailable);
  useEffect(() => {
    isUnavailableRef.current = isUnavailable;
  });

  /**
   * Focus on open lands on the day the user is actually on — the selected day,
   * or today — rather than on the chrome above the grid.
   *
   * ⚠️ Deferred by a task rather than done in the effect itself, and the delay
   * is load-bearing. react-native-web's modal focus trap does two things on
   * mount, BOTH of them after this hook's effects, because a parent's effects
   * run after its children's: it records `document.activeElement` as the
   * element to restore focus to on close, and it focuses the first descendant.
   * Focusing the grid from an effect would make the trap record a DAY CELL as
   * the opener, and closing the sheet would hand focus back to a node that no
   * longer exists — losing the return-to-opener the modal already gets right.
   * A task later, both have happened correctly and this is a plain move.
   */
  const openOn = useRef(isUnavailable(focusedDate) ? null : focusedDate.format(DAY_KEY_FORMAT));
  useEffect(() => {
    if (Platform.OS !== "web" || !openOn.current) return;
    const key = openOn.current;
    const handle = setTimeout(() => dayNodes.current.get(key)?.focus?.(), 0);
    return () => clearTimeout(handle);
    // Mount only: after this the keyboard owns where focus is.
  }, []);

  /**
   * A stable ref callback per day key. Building these fresh on every render
   * would make React detach and re-attach all forty-two on every keystroke.
   */
  const dayRef = useCallback(
    (key: string) => {
      const existing = dayRefs.current.get(key);
      if (existing) return existing;
      const register = (node: FocusableNode | null) => {
        if (!node) {
          dayNodes.current.delete(key);
          return;
        }
        dayNodes.current.set(key, node);
        // The path for a move that CROSSED a month: the day focus is owed did
        // not exist a moment ago, and this is the first instant it does.
        flushPendingFocus();
      };
      dayRefs.current.set(key, register);
      return register;
    },
    [flushPendingFocus],
  );

  const handleKeyDown = useCallback((event: CalendarKeyEvent, from: Dayjs) => {
    if (!(event.key in MOVES)) return;
    // Swallowed even when nothing moves: an arrow reaching the sheet's scroll
    // container would scroll the calendar out from under the user.
    event.preventDefault();

    const next = nextFocusedDate(from, event.key, isUnavailableRef.current);
    if (!next) return;
    pendingFocus.current = next.format(DAY_KEY_FORMAT);
    setFocusedDate(next);
  }, []);

  const focusedKey = focusedDate.format(DAY_KEY_FORMAT);
  /**
   * A grid whose focused day is blocked offers NO tab stop at all, rather than
   * one that does nothing when it is pressed. It happens when the library has
   * paged somewhere with nothing selectable in it, and the way back is the
   * month buttons, which keep their own stops.
   */
  const tabbable = !isUnavailable(focusedDate);

  const getDayProps = useCallback(
    (date: Dayjs): CalendarDayFocusProps => {
      // ⚠️ `Platform.OS ===`, not `Platform.select({ web })`: the latter is
      // resolved inside react-native and is unobservable from a jest test.
      if (Platform.OS !== "web") return {};

      const key = date.format(DAY_KEY_FORMAT);
      return {
        ref: dayRef(key),
        // Exactly one day in the grid is tabbable; the rest are reachable by
        // arrow key alone. RN types this as the literal union.
        tabIndex: (key === focusedKey && tabbable ? 0 : -1) as 0 | -1,
        onKeyDown: (event: CalendarKeyEvent) => handleKeyDown(event, date),
      };
    },
    [dayRef, focusedKey, handleKeyDown, tabbable],
  );

  /**
   * Follow a month the LIBRARY moved to on its own — its prev/next arrows and
   * its month and year selectors, none of which know anything about focus.
   *
   * Without this the tabbable day would be left behind in a month nobody can
   * see, and the visible grid would have no tab stop at all.
   */
  const followVisibleMonth = useCallback((year: number, month: number) => {
    setFocusedDate((previous) => {
      if (previous.year() === year && previous.month() === month) return previous;

      // `.date(1)` FIRST: the `.month()` setter overflows, so moving a 31st
      // into February would land in March and page the grid straight past the
      // month the user just asked for.
      const firstOfMonth = previous.date(1).year(year).month(month);
      const preferred = Math.min(previous.date(), firstOfMonth.daysInMonth());

      const found =
        firstAvailable(
          firstOfMonth.date(preferred),
          1,
          firstOfMonth.daysInMonth() - preferred + 1,
          isUnavailableRef.current,
        ) ?? firstAvailable(firstOfMonth, 1, firstOfMonth.daysInMonth(), isUnavailableRef.current);

      // A month with nothing selectable in it keeps focus where it was: parking
      // the tab stop on a disabled day would hand the user a stop that does
      // nothing when they press Enter.
      return found ?? previous;
    });
  }, []);

  return {
    focusedDate,
    /** The day the grid should be showing — feed the picker's `visibleDate`. */
    visibleDate: focusedKey,
    getDayProps,
    followVisibleMonth,
  };
}
