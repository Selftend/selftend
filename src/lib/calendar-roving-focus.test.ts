import { act, renderHook } from "@testing-library/react-native";
import { Platform } from "react-native";
import dayjs, { type Dayjs } from "dayjs";

import {
  nextFocusedDate,
  useCalendarRovingFocus,
  type CalendarDayFocusProps,
} from "@/src/lib/calendar-roving-focus";

/**
 * The calendar grid's keyboard map (#1305).
 *
 * Two things are load-bearing and easy to lose. Arrow keys move FOCUS and
 * nothing else — a version that selected on every move would fire roughly
 * thirty draft changes crossing a month and make `aria-pressed` follow focus
 * instead of selection. And a disabled day is never a landing spot, by arrow
 * key any more than by Tab.
 */

/** A Tuesday, with a comfortable run of days either side inside one grid. */
const MARCH_10 = dayjs("2026-03-10");

const ALL_AVAILABLE: (date: Dayjs) => boolean = () => false;

/** The shipped shape: every past day blocked, today and later open. */
function beforeToday(today: string) {
  return (date: Dayjs) => date.format("YYYY-MM-DD") < today;
}

function key(date: Dayjs | null) {
  return date ? date.format("YYYY-MM-DD") : null;
}

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

describe("nextFocusedDate", () => {
  it("moves one day sideways and one week vertically", () => {
    expect(key(nextFocusedDate(MARCH_10, "ArrowLeft", ALL_AVAILABLE))).toBe("2026-03-09");
    expect(key(nextFocusedDate(MARCH_10, "ArrowRight", ALL_AVAILABLE))).toBe("2026-03-11");
    // ☠️ The 1-D hook this replaces treats ArrowDown as a synonym for
    // ArrowRight; in a grid that is a one-day move where a week is meant.
    expect(key(nextFocusedDate(MARCH_10, "ArrowUp", ALL_AVAILABLE))).toBe("2026-03-03");
    expect(key(nextFocusedDate(MARCH_10, "ArrowDown", ALL_AVAILABLE))).toBe("2026-03-17");
  });

  it("puts Home and End on the week's own bounds, not the grid's", () => {
    // Monday and Sunday of the 10th's week. The app is Monday-first everywhere
    // and the calendar is mounted `firstDayOfWeek: 1`.
    expect(key(nextFocusedDate(MARCH_10, "Home", ALL_AVAILABLE))).toBe("2026-03-09");
    expect(key(nextFocusedDate(MARCH_10, "End", ALL_AVAILABLE))).toBe("2026-03-15");
  });

  it("keeps Home and End on a Sunday inside the same Monday-first week", () => {
    // ☠️ The one day the week start actually shows up on. Under a Sunday-first
    // week the 15th's Home would be the 15th itself.
    const sunday = dayjs("2026-03-15");
    expect(key(nextFocusedDate(sunday, "Home", ALL_AVAILABLE))).toBe("2026-03-09");
    expect(key(nextFocusedDate(sunday, "End", ALL_AVAILABLE))).toBe("2026-03-15");
  });

  it("pages by month, clamping into a shorter one rather than overshooting it", () => {
    expect(key(nextFocusedDate(MARCH_10, "PageUp", ALL_AVAILABLE))).toBe("2026-02-10");
    expect(key(nextFocusedDate(MARCH_10, "PageDown", ALL_AVAILABLE))).toBe("2026-04-10");

    // ☠️ The overflow trap: a naive month setter turns 31 January into 3 March
    // and skips February entirely.
    expect(key(nextFocusedDate(dayjs("2026-01-31"), "PageDown", ALL_AVAILABLE))).toBe("2026-02-28");
  });

  it("carries the year across a December boundary", () => {
    expect(key(nextFocusedDate(dayjs("2026-12-31"), "ArrowRight", ALL_AVAILABLE))).toBe(
      "2027-01-01",
    );
    expect(key(nextFocusedDate(dayjs("2026-12-15"), "PageDown", ALL_AVAILABLE))).toBe("2027-01-15");
  });

  it("ignores every key it does not own", () => {
    for (const ignored of ["Enter", " ", "Tab", "Escape", "a"]) {
      expect(nextFocusedDate(MARCH_10, ignored, ALL_AVAILABLE)).toBeNull();
    }
  });

  describe("disabled days", () => {
    const unavailable = beforeToday("2026-03-10");

    it("steps over a blocked run rather than landing in it", () => {
      // Everything before the 10th is blocked, so a left move from the 11th
      // lands on the 10th, and from the 10th there is nowhere to go.
      expect(key(nextFocusedDate(dayjs("2026-03-11"), "ArrowLeft", unavailable))).toBe(
        "2026-03-10",
      );
      expect(nextFocusedDate(MARCH_10, "ArrowLeft", unavailable)).toBeNull();
      expect(nextFocusedDate(MARCH_10, "ArrowUp", unavailable)).toBeNull();
    });

    it("reaches the one legal day inside a blocked run", () => {
      // The shipped CBT/ACT shape: a target date already saved in the past
      // stays selectable while the days around it do not.
      const stored = "2026-03-04";
      const withException = (date: Dayjs) =>
        date.format("YYYY-MM-DD") < "2026-03-10" && date.format("YYYY-MM-DD") !== stored;

      expect(key(nextFocusedDate(MARCH_10, "ArrowLeft", withException))).toBe(stored);
    });

    it("gives up rather than walking out of the season", () => {
      // A day move walks at most a month before it stops; nothing legal within
      // reach means focus does not move at all.
      const farException = (date: Dayjs) => date.format("YYYY-MM-DD") !== "2025-01-01";
      expect(nextFocusedDate(MARCH_10, "ArrowLeft", farException)).toBeNull();
    });

    it("holds Home and End inside the week", () => {
      // Monday the 9th is blocked, so Home is the first day of the week that
      // is not — never the Monday of the week before.
      expect(key(nextFocusedDate(MARCH_10, "Home", unavailable))).toBe("2026-03-10");
    });

    it("refuses a page into a month with nothing selectable in it", () => {
      // ⚠️ The search stays inside February; falling through into January
      // would look like PageUp had moved two months.
      expect(nextFocusedDate(MARCH_10, "PageUp", unavailable)).toBeNull();
    });

    it("turns around inside the month it paged into rather than giving up", () => {
      // ☠️ PageUp from the 5th of April aims at the 5th of March, which is
      // blocked, and walking the way it was heading only reaches the 1st. March
      // is half selectable; a version that searched one way would report the
      // month as empty and leave focus in April.
      expect(key(nextFocusedDate(dayjs("2026-04-05"), "PageUp", unavailable))).toBe("2026-03-10");
    });
  });
});

describe("useCalendarRovingFocus on web", () => {
  beforeEach(() => setPlatform("web"));
  afterEach(() => setPlatform("ios"));

  function render(initialDate = MARCH_10, isUnavailable = ALL_AVAILABLE) {
    return renderHook(() => useCalendarRovingFocus({ initialDate, isUnavailable }));
  }

  /**
   * The three props are optional on the type because they are absent off web;
   * inside this block the platform is web, so they are all there.
   */
  function web(props: CalendarDayFocusProps) {
    return props as Required<CalendarDayFocusProps>;
  }

  function press(props: CalendarDayFocusProps, name: string) {
    const preventDefault = jest.fn();
    act(() => web(props).onKeyDown({ key: name, preventDefault }));
    return preventDefault;
  }

  it("makes the grid a single tab stop, on the day focus starts", () => {
    const { result } = render();

    // The whole 36 → 7 defect in one assertion: thirty day buttons were thirty
    // separate tab stops.
    expect(result.current.getDayProps(MARCH_10).tabIndex).toBe(0);
    expect(result.current.getDayProps(dayjs("2026-03-11")).tabIndex).toBe(-1);
    expect(result.current.getDayProps(dayjs("2026-03-09")).tabIndex).toBe(-1);
  });

  it("moves the tab stop with the arrow keys", () => {
    const { result } = render();

    press(result.current.getDayProps(MARCH_10), "ArrowDown");

    expect(result.current.getDayProps(dayjs("2026-03-17")).tabIndex).toBe(0);
    expect(result.current.getDayProps(MARCH_10).tabIndex).toBe(-1);
    expect(result.current.visibleDate).toBe("2026-03-17");
  });

  it("asks the grid for the month a move crossed into", () => {
    const { result } = render();

    press(result.current.getDayProps(dayjs("2026-03-31")), "ArrowRight");

    // `visibleDate` is what pages the library; without it focus would move to a
    // day that is not on screen.
    expect(result.current.visibleDate).toBe("2026-04-01");
  });

  it("puts focus on the day the grid opened on, one task after mount", () => {
    jest.useFakeTimers();
    try {
      const { result } = render();
      const focus = jest.fn();

      act(() => web(result.current.getDayProps(MARCH_10)).ref({ focus }));
      // ⚠️ Nothing yet, on purpose. react-native-web's modal focus trap records
      // the element to restore on close, and focuses the first descendant, in
      // effects that run AFTER this hook's — so grabbing focus any earlier
      // makes the trap record a day cell as the opener.
      expect(focus).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(focus).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("opens focus on nothing when the whole month is blocked", () => {
    jest.useFakeTimers();
    try {
      // Everything in and before March is out of reach; there is no day to open
      // on, and stealing focus onto a dead cell would be worse than not moving.
      const { result } = render(MARCH_10, () => true);
      const focus = jest.fn();

      act(() => web(result.current.getDayProps(MARCH_10)).ref({ focus }));
      act(() => {
        jest.advanceTimersByTime(0);
      });

      expect(focus).not.toHaveBeenCalled();
      expect(result.current.getDayProps(MARCH_10).tabIndex).toBe(-1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("focuses the day it moved to", () => {
    const { result } = render();
    const focus = jest.fn();

    // The ref for a day is registered when its cell renders; the hook focuses
    // it on the commit after the move.
    act(() => web(result.current.getDayProps(dayjs("2026-03-11"))).ref({ focus }));
    press(result.current.getDayProps(MARCH_10), "ArrowRight");

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("waits for a day that has not rendered yet instead of dropping the move", () => {
    const { result } = render();
    const focus = jest.fn();

    // Crossing a month renders twice: this hook's state first, then the grid
    // once the library has taken the new month. The target only exists in the
    // second, and the focus must survive the gap.
    press(result.current.getDayProps(dayjs("2026-03-31")), "ArrowRight");
    expect(focus).not.toHaveBeenCalled();

    act(() => web(result.current.getDayProps(dayjs("2026-04-01"))).ref({ focus }));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("swallows the keys it owns and leaves the rest alone", () => {
    const { result } = render();

    // An arrow that reached the sheet's scroll container would scroll the
    // calendar out from under the user.
    expect(press(result.current.getDayProps(MARCH_10), "ArrowRight")).toHaveBeenCalled();
    // Enter and Space belong to react-native-web's own Pressable, which turns
    // both into a real press. Claiming them here would select twice.
    expect(press(result.current.getDayProps(MARCH_10), "Enter")).not.toHaveBeenCalled();
    expect(press(result.current.getDayProps(MARCH_10), " ")).not.toHaveBeenCalled();
    expect(press(result.current.getDayProps(MARCH_10), "Tab")).not.toHaveBeenCalled();
  });

  it("swallows an arrow that had nowhere to go", () => {
    const { result } = render(MARCH_10, beforeToday("2026-03-10"));

    // Still handled: the key is one of the grid's, and letting it through to
    // scroll the sheet would be a stranger answer than doing nothing.
    expect(press(result.current.getDayProps(MARCH_10), "ArrowLeft")).toHaveBeenCalled();
    expect(result.current.getDayProps(MARCH_10).tabIndex).toBe(0);
  });

  it("follows a month the library paged to on its own", () => {
    const { result } = render();

    act(() => result.current.followVisibleMonth(2026, 5));

    // The prev/next arrows and the month selector know nothing about focus;
    // without this the tab stop would be stranded in a month nobody can see.
    expect(result.current.getDayProps(dayjs("2026-06-10")).tabIndex).toBe(0);
    expect(result.current.visibleDate).toBe("2026-06-10");
  });

  it("clamps the day it follows with into a shorter month", () => {
    const { result } = render(dayjs("2026-01-31"));

    act(() => result.current.followVisibleMonth(2026, 1));

    expect(result.current.visibleDate).toBe("2026-02-28");
  });

  it("takes the month's first selectable day when the matching one is blocked", () => {
    const { result } = render(dayjs("2026-04-05"), beforeToday("2026-03-10"));

    act(() => result.current.followVisibleMonth(2026, 2));

    expect(result.current.visibleDate).toBe("2026-03-10");
  });

  it("follows the grid into a month with nothing selectable, and offers no tab stop there", () => {
    const { result } = render(MARCH_10, beforeToday("2026-03-10"));

    act(() => result.current.followVisibleMonth(2026, 1));

    // ☠️ It has to FOLLOW. Staying behind leaves `visibleDate` pointing at March
    // while the library shows February, and a controlled prop that disagrees
    // wins — so the grid was yanked forward again and the prev button could not
    // reach a past month at all. Caught by the goal e2e, which pages back to
    // last month to check its days are disabled.
    expect(result.current.visibleDate).toBe("2026-02-10");
    // Nothing there is selectable, so nothing there is a tab stop either.
    expect(result.current.getDayProps(dayjs("2026-02-10")).tabIndex).toBe(-1);
    expect(
      Array.from(
        { length: 28 },
        (_, i) =>
          result.current.getDayProps(dayjs(`2026-02-${String(i + 1).padStart(2, "0")}`)).tabIndex,
      ),
    ).not.toContain(0);
  });

  it("finds the way back out of a month it had no tab stop in", () => {
    const { result } = render(MARCH_10, beforeToday("2026-03-10"));

    act(() => result.current.followVisibleMonth(2026, 1));
    act(() => result.current.followVisibleMonth(2026, 2));

    // Paging forward again lands on the first day March actually offers, so the
    // grid is tabbable once more.
    expect(result.current.visibleDate).toBe("2026-03-10");
    expect(result.current.getDayProps(MARCH_10).tabIndex).toBe(0);
  });

  it("does not move focus when the library reports the month it is already on", () => {
    const { result } = render();
    const before = result.current.focusedDate;

    act(() => result.current.followVisibleMonth(2026, 2));

    // Fires on every month change, including the ones this hook caused itself.
    expect(result.current.focusedDate).toBe(before);
  });
});

describe("useCalendarRovingFocus off web", () => {
  it("adds nothing to a day cell, on a platform with no Tab order", () => {
    setPlatform("ios");
    const { result } = renderHook(() =>
      useCalendarRovingFocus({ initialDate: MARCH_10, isUnavailable: ALL_AVAILABLE }),
    );

    expect(result.current.getDayProps(MARCH_10)).toEqual({});
  });
});
