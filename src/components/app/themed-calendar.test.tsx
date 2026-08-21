import { act, screen, within } from "@testing-library/react-native";
import dayjs from "dayjs";

import { ThemedCalendar } from "./themed-calendar";
import i18n from "@/src/i18n";
import { isolateCalendarLocale, weekdayLabels } from "@/test/calendar-testing";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The real calendar, deliberately unmocked. Every finding this file pins was
 * produced by a prop that LOOKED correctly passed: the range picker already
 * passed `locale` and still opened on Sunday, because the library hard-defaults
 * `firstDayOfWeek` to 0 and never derives it from `locale`. So these assertions
 * read the RENDERED month and weekday names, never the props.
 */

isolateCalendarLocale();

describe("ThemedCalendar", () => {
  it("opens the week on Monday, matching every other date surface in the app", () => {
    renderWithProviders(
      <ThemedCalendar
        mode="range"
        value={{ start: dayjs("2026-03-15"), end: null }}
        onChange={jest.fn()}
      />,
    );

    // Sunday-first would read ["Su", "Mo", ...]; the app is unconditionally
    // Monday-first (mondayKeyOf, src/utils/date.ts).
    expect(weekdayLabels()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("renders Bulgarian month and weekday names under a Bulgarian app language", async () => {
    await act(async () => {
      await i18n.changeLanguage("bg");
    });

    renderWithProviders(
      <ThemedCalendar
        mode="range"
        value={{ start: dayjs("2026-03-15"), end: null }}
        onChange={jest.fn()}
      />,
    );

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
    renderWithProviders(
      <ThemedCalendar
        mode="range"
        value={{ start: dayjs("2026-03-15"), end: null }}
        onChange={jest.fn()}
      />,
    );

    expect(within(screen.getByTestId("btn-month")).getByText("March")).toBeTruthy();
  });

  it("opens the week on Monday in date mode too", () => {
    renderWithProviders(
      <ThemedCalendar mode="date" value={dayjs("2026-03-15")} onChange={jest.fn()} />,
    );

    expect(weekdayLabels()).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  });

  it("adds the time view in datetime mode, and only there", () => {
    // The two single-value modes share a branch and differ by one prop, so the
    // difference is worth pinning on rendered output: the library's time
    // affordance is labelled with the value's own time.
    const { unmount } = renderWithProviders(
      <ThemedCalendar mode="datetime" value={dayjs("2026-03-15T14:30:00")} onChange={jest.fn()} />,
    );
    expect(screen.getByLabelText("14:30")).toBeTruthy();
    unmount();

    renderWithProviders(
      <ThemedCalendar mode="date" value={dayjs("2026-03-15T14:30:00")} onChange={jest.fn()} />,
    );
    expect(screen.queryByLabelText("14:30")).toBeNull();
  });
});
