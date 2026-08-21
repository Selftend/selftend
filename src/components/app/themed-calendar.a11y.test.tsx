import { act, fireEvent, screen, within } from "@testing-library/react-native";
import dayjs from "dayjs";

import { ThemedCalendar } from "./themed-calendar";
import { isolateCalendarLocale } from "@/test/calendar-testing";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The calendar grid's screen-reader contract (#1301).
 *
 * Every defect these pin was measured on a real modal and shipped green: the
 * library gives each day the BARE NUMBER as its accessible name ("8, button"),
 * exposes selection as a background colour and nothing else, and hardcodes the
 * month buttons to English "Prev"/"Next" — inside its own `Pressable`, where
 * no public prop can reach them. Everything here therefore reads RENDERED
 * output through the patched library, never a prop we passed.
 *
 * ⚠️ Nothing else in the suite gates accessibility, so if these are deleted the
 * regressions come back silently.
 */

isolateCalendarLocale();

/** A Tuesday. The clock is pinned here so "today" is a fixed, nameable day. */
const TODAY = new Date("2026-03-10T12:00:00.000Z");

/**
 * A Sunday in the same visible month, deliberately NOT today: with one date
 * playing both roles, a label carrying only "Today" and a label carrying only
 * the date would both pass.
 */
const SELECTED = dayjs("2026-03-15");

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.setSystemTime(TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

function renderCalendar() {
  return renderWithProviders(<ThemedCalendar mode="date" value={SELECTED} onChange={jest.fn()} />);
}

describe("ThemedCalendar accessibility", () => {
  it("names a day in full rather than by its number alone", () => {
    renderCalendar();

    // The whole defect in one assertion: "15" was the entire accessible name.
    expect(screen.getByLabelText("Sunday, March 15, 2026")).toBeTruthy();
    expect(screen.queryByLabelText("15")).toBeNull();
  });

  it("announces today as today, and marks it current", () => {
    renderCalendar();

    const today = screen.getByLabelText("Today, Tuesday, March 10, 2026");

    // `aria-current` is the correct web semantic; the label prefix is the only
    // half a native screen reader can hear. Both, deliberately.
    expect(today.props["aria-current"]).toBe("date");
  });

  it("exposes the selected day as state, not as a background colour", () => {
    setPlatformOS("web");
    renderCalendar();

    const selected = screen.getByLabelText("Sunday, March 15, 2026");
    const other = screen.getByLabelText("Monday, March 16, 2026");

    // `aria-pressed`, not `aria-selected`: these stay real buttons, and
    // `aria-selected` is not valid on a button.
    expect(selected.props["aria-pressed"]).toBe(true);
    expect(other.props["aria-pressed"]).toBe(false);
  });

  it("exposes selection to a native screen reader too", () => {
    setPlatformOS("ios");
    renderCalendar();

    const selected = screen.getByLabelText("Sunday, March 15, 2026");

    // Native has no `aria-pressed`; the equivalent is the selected state.
    expect(selected.props.accessibilityState?.selected).toBe(true);
    expect(screen.getByLabelText("Monday, March 16, 2026").props.accessibilityState?.selected).toBe(
      false,
    );
  });

  it("keeps days real buttons, and disabled past days out of the tab order", () => {
    renderWithProviders(
      <ThemedCalendar
        mode="date"
        value={SELECTED}
        minDate={dayjs("2026-03-12")}
        onChange={jest.fn()}
      />,
    );

    const allowed = screen.getByLabelText("Sunday, March 15, 2026");
    const blocked = screen.getByLabelText("Wednesday, March 11, 2026");

    expect(allowed.props.accessibilityRole).toBe("button");
    expect(blocked.props.accessibilityRole).toBe("button");
    // Already correct before this ticket — pinned so the patch cannot regress it.
    expect(blocked.props.accessibilityState?.disabled).toBe(true);
  });

  it("announces the visible month when it changes", () => {
    renderCalendar();

    const region = screen.getByTestId("calendar-month-announcement");
    // Silent until something changes: a live region that ships with content
    // announces on mount, which is noise, not information.
    expect(region.props.children).toBe("");
    expect(region.props.accessibilityLiveRegion).toBe("polite");

    act(() => {
      fireEvent.press(screen.getByTestId("btn-next"));
    });

    expect(screen.getByTestId("calendar-month-announcement").props.children).toBe("April 2026");
  });

  it("carries the year across a December boundary", () => {
    renderWithProviders(
      <ThemedCalendar mode="date" value={dayjs("2026-12-05")} onChange={jest.fn()} />,
    );

    act(() => {
      fireEvent.press(screen.getByTestId("btn-next"));
    });

    // The month index alone would say "January 2026" — the year has to travel
    // with it, which is why both library callbacks are wired.
    expect(screen.getByTestId("calendar-month-announcement").props.children).toBe("January 2027");
  });

  it("announces month navigation in Bulgarian under a Bulgarian app language", async () => {
    // ☠️ `i18n.changeLanguage("bg")` alone hands back English — bg's bundles are
    // lazy. These are OUR strings, so the helper is mandatory here.
    await act(async () => {
      await setLanguage("bg");
    });

    renderCalendar();

    // The library hardcodes "Prev"/"Next" in English; this is the whole point
    // of routing the labels through the patch.
    expect(screen.getByLabelText("Следващ месец")).toBeTruthy();
    expect(screen.getByLabelText("Предишен месец")).toBeTruthy();
    expect(screen.queryByLabelText("Next")).toBeNull();
    expect(screen.queryByLabelText("Prev")).toBeNull();
  });

  it("names days in Bulgarian too, so the composed name is not English-only", async () => {
    await act(async () => {
      await setLanguage("bg");
    });

    renderCalendar();

    expect(screen.getByLabelText("неделя, 15 март 2026 г.")).toBeTruthy();
    expect(screen.getByLabelText("Днес, вторник, 10 март 2026 г.")).toBeTruthy();
  });

  it("announces the month in English, proving the Bulgarian case is not vacuous", () => {
    renderCalendar();

    expect(screen.getByLabelText("Next month")).toBeTruthy();
    // Every day of March carries the English month name in its own label.
    expect(within(screen.getByTestId("days")).getAllByLabelText(/March \d+, 2026$/).length).toBe(
      31,
    );
  });

  it("hides the live region from the eye without hiding it from a screen reader", () => {
    renderCalendar();

    const style = screen.getByTestId("calendar-month-announcement").props.style;

    // `display: none` / `visibility: hidden` would silence it on web, so the
    // region has to be clipped rather than hidden.
    expect(style).toMatchObject({ position: "absolute", width: 1, height: 1, opacity: 0 });
  });
});
