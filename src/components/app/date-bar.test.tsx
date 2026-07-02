import { act, fireEvent, screen } from "@testing-library/react-native";

import { DateBar } from "@/src/components/app/date-bar";
import i18n from "@/src/i18n";
import { currentDateKey, useSelectedDateStore } from "@/src/stores/selected-date-store";
import { renderWithProviders } from "@/test/render-with-providers";

describe("DateBar", () => {
  beforeEach(() => useSelectedDateStore.getState().resetToToday());

  it("renders today as the selected chip by default", () => {
    renderWithProviders(<DateBar />);
    // The chip for today carries an accessible 'Today <date>' label
    // (distinct from the jump-to-today button, labelled just 'Today').
    expect(screen.getByLabelText(/Today \d{4}-\d{2}-\d{2}/)).toBeTruthy();
  });

  it("selecting a past chip updates the store", () => {
    renderWithProviders(<DateBar />);
    // Yesterday chip is present; pressing it sets the store.
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yKey = d.toISOString().slice(0, 10);
    fireEvent.press(screen.getByLabelText(new RegExp(yKey)));
    expect(useSelectedDateStore.getState().selectedDate).toBe(yKey);
  });

  it("shows a Today button when a past day is selected and resets on press", () => {
    useSelectedDateStore.getState().setSelectedDate("2026-05-01");
    renderWithProviders(<DateBar />);
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
