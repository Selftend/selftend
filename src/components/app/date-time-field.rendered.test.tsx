import { act, fireEvent, screen, within } from "@testing-library/react-native";

import { DateTimeField } from "./date-time-field";
import i18n from "@/src/i18n";
import { isolateCalendarLocale, weekdayLabels } from "@/test/calendar-testing";
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
 */

isolateCalendarLocale();

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
  });

  it("keeps the English calendar English, so the Bulgarian proof above is not vacuous", () => {
    openPicker();

    expect(within(screen.getByTestId("btn-month")).getByText("March")).toBeTruthy();
  });
});
