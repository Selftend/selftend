import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { Platform } from "react-native";
import dayjs, { type Dayjs } from "dayjs";
import type { ReactTestInstance } from "react-test-renderer";

import { ThemedCalendar } from "./themed-calendar";
import { isolateCalendarLocale } from "@/test/calendar-testing";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The calendar grid's keyboard contract (#1305), driven through the REAL
 * patched library rather than against the hook in isolation.
 *
 * Measured on a shipped modal before this existed: tabbing through the open
 * sheet took 36 stops, thirty of them individual day buttons, and no arrow key
 * moved focus at all — crossing a month meant thirty presses of Tab.
 *
 * ⚠️ Two things here are worth more than the rest. Arrow keys move focus and
 * NEVER select: `onChange` not firing is the assertion, because a version that
 * committed on every move would fire roughly thirty draft changes crossing a
 * month and make #1301's `aria-pressed` follow focus instead of selection. And
 * a move that leaves the visible month has to PAGE the grid, which only works
 * because the patch added a `visibleDate` prop — the library's public
 * `month`/`year` pair cannot say both halves at once without overflowing.
 */

isolateCalendarLocale();

/** A Tuesday, so the week has days either side of it inside one grid. */
const TODAY = new Date("2026-03-10T12:00:00.000Z");

/** A Sunday in the same month, deliberately not today. */
const SELECTED = dayjs("2026-03-15");

const ORIGINAL_OS = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.setSystemTime(TODAY);
  setPlatformOS("web");
});

afterEach(() => {
  jest.useRealTimers();
  setPlatformOS(ORIGINAL_OS as "web" | "ios" | "android");
});

function renderCalendar(
  overrides: Partial<{
    value: Dayjs | null;
    disabledDates: (date: unknown) => boolean;
    minDate: Dayjs;
  }> = {},
) {
  const onChange = jest.fn();
  renderWithProviders(
    <ThemedCalendar
      mode="date"
      value={overrides.value === undefined ? SELECTED : overrides.value}
      onChange={onChange}
      disabledDates={overrides.disabledDates}
      minDate={overrides.minDate}
    />,
  );
  return { onChange };
}

/** Every day cell currently rendered in the grid. */
function dayCells(): ReactTestInstance[] {
  return within(screen.getByTestId("days")).getAllByRole("button");
}

/** The accessible names of the days that Tab can reach — there should be one. */
function tabStops(): string[] {
  return dayCells()
    .filter((cell) => cell.props.tabIndex === 0)
    .map((cell) => cell.props.accessibilityLabel as string);
}

/** The one day Tab reaches, by name. Fails loudly if the grid has more or none. */
function tabStop(): string {
  const stops = tabStops();
  expect(stops).toHaveLength(1);
  return stops[0]!;
}

function pressKey(key: string) {
  const target = dayCells().find((cell) => cell.props.tabIndex === 0);
  expect(target).toBeDefined();
  act(() => {
    fireEvent(target!, "keyDown", { key, preventDefault: jest.fn() });
  });
}

describe("the calendar grid under a keyboard", () => {
  it("is a single tab stop, on the selected day", () => {
    renderCalendar();

    // The whole 36 → 7 defect in one assertion: thirty day buttons used to be
    // thirty separate stops, and the sheet's cycle was 36 long.
    expect(tabStop()).toBe("Sunday, March 15, 2026");
    expect(dayCells().length).toBeGreaterThan(28);
  });

  it("opens on today when nothing is selected", () => {
    renderCalendar({ value: null });

    expect(tabStop()).toBe("Today, Tuesday, March 10, 2026");
  });

  it("moves focus by a day and by a week, and selects nothing on the way", () => {
    const { onChange } = renderCalendar();

    pressKey("ArrowRight");
    expect(tabStop()).toBe("Monday, March 16, 2026");

    pressKey("ArrowLeft");
    pressKey("ArrowLeft");
    expect(tabStop()).toBe("Saturday, March 14, 2026");

    pressKey("ArrowDown");
    expect(tabStop()).toBe("Saturday, March 21, 2026");

    pressKey("ArrowUp");
    pressKey("ArrowUp");
    expect(tabStop()).toBe("Saturday, March 7, 2026");

    // ⚠️ The load-bearing assertion. Selecting on every move is the radiogroup
    // pattern, and in a calendar it fires a draft change per keystroke.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves the selected day where it is while focus travels", () => {
    renderCalendar();

    pressKey("ArrowRight");
    pressKey("ArrowRight");

    // Selection is what #1301 exposes as `aria-pressed`; if it followed focus
    // that state would describe the cursor rather than the value.
    const selected = dayCells().filter((cell) => cell.props["aria-pressed"] === true);
    expect(selected.map((cell) => cell.props.accessibilityLabel)).toEqual([
      "Sunday, March 15, 2026",
    ]);
  });

  it("puts Home and End on the week's own bounds", () => {
    renderCalendar();

    // The 15th is a Sunday, and the app is Monday-first everywhere — so Home is
    // the 9th, six days back, and End is the 15th itself.
    pressKey("Home");
    expect(tabStop()).toBe("Monday, March 9, 2026");

    pressKey("End");
    expect(tabStop()).toBe("Sunday, March 15, 2026");
  });

  it("pages the visible month with PageDown and PageUp", () => {
    const { onChange } = renderCalendar();

    pressKey("PageDown");

    // The grid itself moved, not just the tab stop: April's days are what is
    // rendered now. This is the half that needs the patch.
    expect(tabStop()).toBe("Wednesday, April 15, 2026");
    expect(within(screen.getByTestId("days")).queryByLabelText(/March/)).toBeNull();
    expect(screen.getByTestId("calendar-month-announcement").props.children).toBe("April 2026");

    pressKey("PageUp");
    expect(tabStop()).toBe("Sunday, March 15, 2026");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("carries the grid with an arrow that walks off the end of the month", () => {
    renderCalendar({ value: dayjs("2026-03-31") });

    pressKey("ArrowRight");

    // Outside days are not rendered, so without paging the grid focus would
    // move to a day that is not on screen.
    expect(tabStop()).toBe("Wednesday, April 1, 2026");
    expect(screen.getByTestId("calendar-month-announcement").props.children).toBe("April 2026");
  });

  it("carries the year across a December boundary", () => {
    renderCalendar({ value: dayjs("2026-12-15") });

    pressKey("PageDown");

    // ☠️ The library's own `month`/`year` props apply the two halves against
    // different bases and land on December 2027 instead.
    expect(tabStop()).toBe("Friday, January 15, 2027");
    expect(screen.getByTestId("calendar-month-announcement").props.children).toBe("January 2027");
  });

  it("steps over disabled days instead of landing on one", () => {
    // The 13th and 14th blocked, the days around them open — the shipped shape
    // in miniature, where a stored past target date is the one legal exception
    // inside a blocked run.
    const blocked = new Set(["2026-03-13", "2026-03-14"]);
    renderCalendar({
      value: dayjs("2026-03-15"),
      disabledDates: (date) => blocked.has(dayjs(date as string).format("YYYY-MM-DD")),
    });

    pressKey("ArrowLeft");

    // Not the 14th, and not a refusal to move either: the walk continues in the
    // direction it was going until it finds a day the user could actually pick.
    expect(tabStop()).toBe("Thursday, March 12, 2026");
    // The days it stepped over are still on screen, and still unreachable.
    for (const name of ["Friday, March 13, 2026", "Saturday, March 14, 2026"]) {
      expect(screen.getByLabelText(name).props.tabIndex).toBe(-1);
    }
  });

  it("keeps focus put when there is nowhere legal to go", () => {
    renderCalendar({ value: dayjs("2026-03-12"), minDate: dayjs("2026-03-12") });

    // Everything before the 12th is clamped away, in this month and every month
    // before it, so neither move has anywhere to land.
    pressKey("ArrowLeft");
    pressKey("PageUp");

    expect(tabStop()).toBe("Thursday, March 12, 2026");
  });

  it("follows the month the prev/next arrows moved to", () => {
    renderCalendar();

    act(() => {
      fireEvent.press(screen.getByTestId("btn-next"));
    });

    // The library's own chrome knows nothing about focus. Without following it
    // the tab stop would be stranded in March and the visible grid would have
    // no way in at all.
    expect(tabStop()).toBe("Wednesday, April 15, 2026");
  });

  it("still lets a press select the focused day", () => {
    const { onChange } = renderCalendar();

    pressKey("ArrowRight");
    const focused = dayCells().find((cell) => cell.props.tabIndex === 0);
    act(() => {
      fireEvent.press(focused!);
    });

    // Enter and Space are react-native-web's, not this hook's — it deliberately
    // leaves both alone so the press below is the only thing that selects.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(dayjs(onChange.mock.calls[0]![0] as Dayjs).format("YYYY-MM-DD")).toBe("2026-03-16");
  });
});

describe("the calendar grid off web", () => {
  it("adds no tab order to a platform that has none", () => {
    setPlatformOS("ios");
    renderCalendar();

    for (const cell of dayCells()) {
      expect(cell.props.tabIndex).toBeUndefined();
      expect(cell.props.onKeyDown).toBeUndefined();
    }
  });
});
