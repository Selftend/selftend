import { fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";

import { CountrySelectField } from "./country-select-field";
import { renderWithProviders } from "@/test/render-with-providers";

/** A host that holds the code the way the gate does, so edits round-trip. */
function Host({ onChange }: { onChange: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <CountrySelectField
      value={value}
      onChange={(code) => {
        setValue(code);
        onChange(code);
      }}
    />
  );
}

describe("CountrySelectField", () => {
  it("offers nothing until something is typed", () => {
    renderWithProviders(<Host onChange={jest.fn()} />);

    expect(screen.queryByTestId("age-gate-country-option-DE")).toBeNull();
    expect(
      screen.queryByTestId("age-gate-country-selected", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("hands back the code of the country that was chosen", () => {
    const onChange = jest.fn();
    renderWithProviders(<Host onChange={onChange} />);

    fireEvent.changeText(screen.getByTestId("age-gate-country"), "Germ");
    fireEvent.press(screen.getByTestId("age-gate-country-option-DE"));

    expect(onChange).toHaveBeenLastCalledWith("DE");
    // The field now reads as the country, and the list stops re-offering it.
    expect(screen.getByTestId("age-gate-country").props.value).toBe("Germany");
    expect(screen.queryByTestId("age-gate-country-option-DE")).toBeNull();
    expect(
      screen.getByTestId("age-gate-country-selected", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("drops the stored code as soon as the text stops naming it", () => {
    // ☠️ The invariant: what the person reads and what the gate would store
    // must never disagree. Without this, editing "Germany" to "Germanyx"
    // leaves DE held behind text that names no country.
    const onChange = jest.fn();
    renderWithProviders(<Host onChange={onChange} />);

    fireEvent.changeText(screen.getByTestId("age-gate-country"), "Germ");
    fireEvent.press(screen.getByTestId("age-gate-country-option-DE"));
    onChange.mockClear();

    fireEvent.changeText(screen.getByTestId("age-gate-country"), "Germanyx");

    expect(onChange).toHaveBeenCalledWith("");
    expect(
      screen.queryByTestId("age-gate-country-selected", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("says so when nothing matches, rather than showing an empty box", () => {
    renderWithProviders(<Host onChange={jest.fn()} />);

    fireEvent.changeText(screen.getByTestId("age-gate-country"), "zzzzz");

    expect(screen.getByText("No country matches that search.")).toBeTruthy();
  });

  it("finds a country by its code", () => {
    const onChange = jest.fn();
    renderWithProviders(<Host onChange={onChange} />);

    fireEvent.changeText(screen.getByTestId("age-gate-country"), "bg");
    fireEvent.press(screen.getByTestId("age-gate-country-option-BG"));

    expect(onChange).toHaveBeenLastCalledWith("BG");
  });

  it("shows a country already chosen when it mounts", () => {
    renderWithProviders(<CountrySelectField value="FR" onChange={jest.fn()} />);

    expect(screen.getByTestId("age-gate-country").props.value).toBe("France");
    expect(
      screen.getByTestId("age-gate-country-selected", { includeHiddenElements: true }),
    ).toBeTruthy();
  });
});
