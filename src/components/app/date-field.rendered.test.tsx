import { act, fireEvent, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { DateField } from "./date-field";
import i18n from "@/src/i18n";
import { isolateCalendarLocale, weekdayLabels } from "@/test/calendar-testing";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The target-date field with the REAL calendar in the tree.
 *
 * Separate from `date-field.test.tsx` because `jest.mock` is per FILE: the
 * commit-semantics tests there need a drivable probe in place of the library,
 * and these need the library itself.
 *
 * The split matters most for the past-day clamp. `date-field.test.tsx` proves
 * the predicate answers correctly; only the grid can prove the library ever
 * asks it — and a `minDate` alongside it would short-circuit the whole thing
 * without changing a single prop assertion.
 */

// The clamp is anchored on today, so the month under test has to be. 06:00 UTC
// is 11:30 on 15 March in the suite's Asia/Kolkata frame — a Sunday, with a
// comfortable run of past and future days inside one grid.
const NOW = new Date("2026-03-15T06:00:00.000Z");

isolateCalendarLocale();

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

/** Render the field on a given stored value and open its calendar. */
function openPicker(value: string | null) {
  renderWithProviders(
    <DateField value={value} onChange={jest.fn()} accessibilityLabel="Target date" />,
  );
  fireEvent.press(screen.getByRole("button", { name: /^Target date: / }));
}

/**
 * One day cell in the grid, by the number it shows.
 *
 * ⚠️ Matched on the TAIL of the accessible name, not on the number alone. Since
 * #1301 a day is named in full — "Sunday, March 15, 2026", and today carries a
 * "Today, " prefix — precisely so a screen reader stops announcing bare digits.
 * The name change is the point of that ticket; these tests still assert the same
 * cells and the same clamp behaviour.
 *
 * The `\b` keeps `1` from matching `11`, and the search is scoped to the grid
 * because the TRIGGER's own label ends the same way — `formatDayKey` renders
 * "Tue, Mar 10, 2026", so an unscoped match finds the field as well as the day.
 */
function day(number: string) {
  return within(screen.getByTestId("days")).getByLabelText(new RegExp(`\\b${number}, 2026$`));
}

describe("the target-date field's calendar", () => {
  it("opens the week on Monday, matching every other date surface in the app", () => {
    openPicker(null);

    expect(weekdayLabels()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("renders Bulgarian month and weekday names under a Bulgarian app language", async () => {
    await act(async () => {
      await i18n.changeLanguage("bg");
    });

    openPicker(null);

    expect(weekdayLabels()).toEqual(["пн", "вт", "ср", "чт", "пт", "сб", "нд"]);
    expect(within(screen.getByTestId("btn-month")).getByText("март")).toBeTruthy();
  });

  it("keeps the English calendar English, so the Bulgarian proof above is not vacuous", () => {
    openPicker(null);

    expect(within(screen.getByTestId("btn-month")).getByText("March")).toBeTruthy();
  });

  it("hides outside days, so the grid holds one month and no ambiguous greys", () => {
    openPicker(null);

    // March 2026 runs Sun 1 to Tue 31, so a Monday-first grid that showed
    // outside days would carry Feb 23–28 in front and Apr 1–5 behind — eleven
    // cells indistinguishable from a disabled past day. With them hidden, each
    // number appears exactly once.
    const grid = within(screen.getByTestId("days"));
    expect(grid.getAllByLabelText(/\b1, 2026$/)).toHaveLength(1);
    expect(grid.getAllByLabelText(/\b5, 2026$/)).toHaveLength(1);
  });

  it("disables past days in the grid and leaves today and the future tappable", () => {
    openPicker(null);

    expect(day("14")).toBeDisabled();
    expect(day("1")).toBeDisabled();
    expect(day("15")).not.toBeDisabled();
    expect(day("16")).not.toBeDisabled();
    expect(day("31")).not.toBeDisabled();
  });

  describe("on the edit path, opened on a target date already in the past", () => {
    it("leaves the stored day tappable while the days around it stay disabled", () => {
      openPicker("2026-03-10");

      // A plain "today is the minimum" clamp would present the user's own saved
      // value as invalid. Exactly one legal past day — `minDate` set to
      // min(today, stored) would have unlocked 11 through 14 as well.
      expect(day("10")).not.toBeDisabled();
      expect(day("9")).toBeDisabled();
      expect(day("11")).toBeDisabled();
      expect(day("14")).toBeDisabled();
      expect(day("15")).not.toBeDisabled();
    });

    it("opens on the stored month, not on today's", () => {
      openPicker("2026-02-10");

      // Otherwise the saved date is off-screen the moment it is more than a
      // month old, and the exemption above is unreachable without paging back.
      expect(within(screen.getByTestId("btn-month")).getByText("February")).toBeTruthy();
      expect(day("10")).not.toBeDisabled();
    });

    it("shows the stored day as selected", () => {
      openPicker("2026-03-10");

      // The theme memo paints selection as a background on the cell itself, so
      // the proof is that this one day carries a fill its neighbours do not.
      const stored = StyleSheet.flatten(day("10").props.style) as { backgroundColor?: string };
      const neighbour = StyleSheet.flatten(day("11").props.style) as { backgroundColor?: string };
      expect(stored.backgroundColor).toBeTruthy();
      expect(stored.backgroundColor).not.toBe(neighbour.backgroundColor);
    });
  });
});
