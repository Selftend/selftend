import { act, fireEvent, screen, within } from "@testing-library/react-native";
import dayjs from "dayjs";

import { DateTimeField } from "./date-time-field";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The check-in picker with the REAL calendar in the tree.
 *
 * Separate from `date-time-field.test.tsx` because `jest.mock` is per FILE:
 * the commit-semantics tests there need a drivable probe in place of the
 * library, and these need the library itself.
 *
 * Not a duplicate of `themed-calendar.test.tsx` either. That file proves the
 * shared wrapper is configured correctly; this one proves the check-in field
 * actually routes THROUGH it. The field passed no `locale` at all until #1298
 * and rendered "September" under a Bulgarian app language — a defect entirely
 * invisible to a calendar test.
 *
 * Every finding here came from a prop that looked correctly passed: the mood
 * tracker's range picker already passed `locale` and still opened Sunday-first,
 * because the library hard-defaults `firstDayOfWeek` and never derives it from
 * `locale`. So these assertions read RENDERED month and weekday names, never
 * props.
 */

// ⚠️ `dayjs.locale()` is a GLOBAL mutation the library performs on every render
// (utils.getWeekdays). It is inert in the app only because all user-facing
// formatting goes through Intl — but inside one test file it would leak
// straight into the next test. Pin it back after each.
let localeBeforeTest: string;

beforeEach(() => {
  localeBeforeTest = dayjs.locale();
});

afterEach(async () => {
  dayjs.locale(localeBeforeTest);
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

/** The weekday header's labels, left to right, as rendered. */
function weekdayLabels() {
  return within(screen.getByTestId("weekdays"))
    .getAllByText(/\S/)
    .map((node) => node.props.children as string);
}

/** Render the check-in field and open its calendar. */
function openPicker() {
  renderWithProviders(
    <DateTimeField
      value="2026-03-15T09:00:00.000Z"
      onChange={jest.fn()}
      accessibilityLabel="Entry time"
    />,
  );
  fireEvent.press(screen.getByLabelText("Entry time"));
}

describe("the check-in picker's calendar", () => {
  it("opens the week on Monday, matching every other date surface in the app", () => {
    openPicker();

    // Sunday-first would read ["Su", "Mo", ...]; the app is unconditionally
    // Monday-first (mondayKeyOf, src/utils/date.ts).
    expect(weekdayLabels()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("offers the time view, because a check-in logs an instant and not a day", () => {
    openPicker();

    // The library's time affordance, labelled with the entry's own time —
    // 09:00Z read in the suite's Asia/Kolkata frame. Rendered rather than
    // asserted on the `timePicker` prop, which produces this button only in
    // single mode and would otherwise pass while producing nothing.
    expect(screen.getByLabelText("14:30")).toBeTruthy();
  });

  it("renders Bulgarian month and weekday names under a Bulgarian app language", async () => {
    await act(async () => {
      await i18n.changeLanguage("bg");
    });

    openPicker();

    expect(weekdayLabels()).toEqual(["пн", "вт", "ср", "чт", "пт", "сб", "нд"]);
    expect(within(screen.getByTestId("btn-month")).getByText("март")).toBeTruthy();
    // The global mutation, caught in the act — this is what the next test
    // proves has been undone, and without it that test would be vacuous.
    expect(dayjs.locale()).toBe("bg");
  });

  it("leaves the global dayjs locale as it found it", () => {
    // Order-dependent on purpose: this runs straight after the Bulgarian test,
    // and the library set the GLOBAL dayjs locale to `bg` while rendering it.
    // Without the afterEach restore, every later test in this file — and any
    // dayjs formatting inside one — silently inherits Bulgarian.
    expect(dayjs("2026-03-15").format("MMMM")).toBe("March");
  });

  it("keeps the English calendar English, so the Bulgarian proof above is not vacuous", () => {
    openPicker();

    expect(within(screen.getByTestId("btn-month")).getByText("March")).toBeTruthy();
  });
});
