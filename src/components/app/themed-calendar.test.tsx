import { act, screen, within } from "@testing-library/react-native";
import dayjs from "dayjs";

import { ThemedCalendar } from "./themed-calendar";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The real calendar, deliberately unmocked. Every finding this file pins was
 * produced by a prop that LOOKED correctly passed: the range picker already
 * passed `locale` and still opened on Sunday, because the library hard-defaults
 * `firstDayOfWeek` to 0 and never derives it from `locale`. So these assertions
 * read the RENDERED month and weekday names, never the props.
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
});
