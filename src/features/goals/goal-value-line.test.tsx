import { screen } from "@testing-library/react-native";

import { GoalValueLine, goalRowAccessibleName, goalValueText } from "./goal-value-line";
import i18n from "@/src/i18n";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

// Restored here rather than at the end of the Bulgarian test below: changing the
// language re-renders whatever is still mounted, and inside a test that update
// lands outside `act()`. Cleanup has unmounted everything by the time this runs,
// which is also why the Bulgarian case is deliberately the last in the file.
afterAll(async () => {
  await i18n.changeLanguage("en");
});

describe("GoalValueLine", () => {
  it("names the value it renders, resolving the label from the static value list", () => {
    renderWithProviders(<GoalValueLine valueKey="courageous" />);

    expect(screen.getByText("Guiding value: Courageous")).toBeTruthy();
  });

  it("renders a value the user no longer ranks exactly as any other, with nothing added", () => {
    // The component is handed a key and never the values profile, so a value that
    // has dropped out of the user's priorities cannot be treated differently - no
    // warning, no badge, no clearing. One line and nothing else, for a key that is
    // in no priority list at all, is what that guarantee looks like from outside.
    renderWithProviders(<GoalValueLine valueKey="tenacious" />);

    expect(screen.getByText("Guiding value: Tenacious")).toBeTruthy();
    expect(screen.getAllByText(/./)).toHaveLength(1);
  });

  it("renders nothing at all when the goal is anchored to nothing", () => {
    renderWithProviders(<GoalValueLine valueKey={null} />);

    expect(screen.toJSON()).toBeNull();
  });

  it("renders nothing for a key the static value list does not carry", () => {
    // `value_key` is free text to Postgres and `string` in TypeScript, so an
    // unrecognised key is reachable. Without the guard the label lookup falls
    // through and the raw path is what the user reads.
    renderWithProviders(<GoalValueLine valueKey="not-a-value" />);

    expect(screen.toJSON()).toBeNull();
  });
});

describe("goalRowAccessibleName", () => {
  it("carries the value, which the row's own name would otherwise hide", () => {
    expect(
      goalRowAccessibleName(i18n.getFixedT(null, "cbt"), "Swim once a week", "courageous"),
    ).toBe("Swim once a week, Guiding value: Courageous");
  });

  it("is the bare title when the goal is anchored to nothing", () => {
    expect(goalRowAccessibleName(i18n.getFixedT(null, "cbt"), "Swim once a week", null)).toBe(
      "Swim once a week",
    );
  });
});

describe("goalValueText", () => {
  it("is null when there is no value, so callers have nothing to render", () => {
    expect(goalValueText(i18n.getFixedT(null, "cbt"), null)).toBeNull();
  });

  it("is the same line the component renders, so the two surfaces cannot drift", () => {
    expect(goalValueText(i18n.getFixedT(null, "cbt"), "courageous")).toBe(
      "Guiding value: Courageous",
    );
  });
});

describe("GoalValueLine in Bulgarian", () => {
  it("keeps the value inside the line", async () => {
    await setLanguage("bg");

    renderWithProviders(<GoalValueLine valueKey="courageous" />);

    // Asserted whole rather than by fragment: a Bulgarian string that dropped the
    // `{{value}}` placeholder would still pass locale-key parity, and the user
    // would read a label with nothing after the colon.
    expect(screen.getByText("Водеща ценност: Смел")).toBeTruthy();
  });
});
