import { fireEvent, screen } from "@testing-library/react-native";

import { DateBar } from "@/src/components/app/date-bar";
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
});
