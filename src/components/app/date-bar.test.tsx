import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import { DateBar } from "@/src/components/app/date-bar";
import i18n from "@/src/i18n";
import { currentDateKey, useSelectedDateStore } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

describe("DateBar", () => {
  beforeEach(() => useSelectedDateStore.getState().resetToToday());

  // Restore the shared i18n singleton to "en" after every test so that
  // a failing assertion in the language-switch test cannot leak "bg" into
  // later tests that rely on English labels.
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("renders today as the selected chip by default", async () => {
    renderWithProviders(<DateBar />);
    // waitFor lets VirtualizedList's deferred _updateCellsToRender setTimeout fire
    // inside act() so the initial batch settle does not produce act() warnings.
    await waitFor(() => expect(screen.getByLabelText(/Today \d{4}-\d{2}-\d{2}/)).toBeTruthy());

    // Day chips are radios in a labelled radiogroup; today is the checked one.
    const todayChip = screen.getByLabelText(/Today \d{4}-\d{2}-\d{2}/);
    expect(todayChip.props.accessibilityRole).toBe("radio");
    expect(todayChip).toBeChecked();
    expect(screen.getByLabelText("Select date").props.accessibilityRole).toBe("radiogroup");
  });

  it("selecting a past chip updates the store", async () => {
    renderWithProviders(<DateBar />);
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yKey = d.toISOString().slice(0, 10);
    // waitFor lets VirtualizedList's deferred _updateCellsToRender fire inside act().
    await waitFor(() => expect(screen.getByLabelText(new RegExp(yKey))).toBeTruthy());
    fireEvent.press(screen.getByLabelText(new RegExp(yKey)));
    expect(useSelectedDateStore.getState().selectedDate).toBe(yKey);
  });

  it("shows a Today button when a past day is selected and resets on press", async () => {
    useSelectedDateStore.getState().setSelectedDate("2026-05-01");
    renderWithProviders(<DateBar />);
    // waitFor lets VirtualizedList's deferred _updateCellsToRender fire inside act().
    await waitFor(() => expect(screen.getByLabelText("Today")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Today"));
    expect(useSelectedDateStore.getState().selectedDate).toBe(currentDateKey());
  });

  it("renders chip labels in the active app language and updates on switch", async () => {
    // Ensure we start in English so we can observe actual English weekday names.
    await act(() => i18n.changeLanguage("en"));
    renderWithProviders(<DateBar />);

    // Under "en" the strip (initialNumToRender=45) always spans at least two months,
    // so chips from the previous month render their month short name in English (e.g. "Jun").
    // Weekday chips within the current month also show English names (e.g. "Mon").
    const english =
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/;
    expect(screen.getAllByText(english, { exact: true }).length).toBeGreaterThan(0);

    // Switch to Bulgarian: chip labels should update to Cyrillic/numeric, removing all
    // English abbreviated weekday/month names from the rendered output.
    await act(() => i18n.changeLanguage("bg"));
    expect(screen.queryAllByText(english, { exact: true })).toHaveLength(0);

    // Restore default language for subsequent tests.
    await act(() => i18n.changeLanguage("en"));
  });
});
