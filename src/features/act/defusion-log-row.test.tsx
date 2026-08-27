import { fireEvent, screen } from "@testing-library/react-native";

import { DefusionLogRow } from "./defusion-log-row";
import type { DefusionLog } from "@/src/features/act/types";
import { renderWithProviders } from "@/test/render-with-providers";

function log(over: Partial<DefusionLog> = {}): DefusionLog {
  return {
    id: "log-1",
    userId: "user-1",
    fusedThought: "I'm going to fail",
    thoughtCategory: "selfJudgment",
    fusionLevelBefore: 60,
    techniqueUsed: "musicalThoughts",
    defusedVersion: "",
    fusionLevelAfter: 20,
    notes: "",
    createdAt: "2026-05-24T09:00:00.000Z",
    updatedAt: "2026-05-24T09:00:00.000Z",
    ...over,
  };
}

describe("DefusionLogRow", () => {
  it("leads with the thought and opens the log", () => {
    const onPress = jest.fn();
    renderWithProviders(<DefusionLogRow log={log()} onPress={onPress} />);

    fireEvent.press(screen.getByText("I'm going to fail"));
    expect(onPress).toHaveBeenCalled();
  });

  /**
   * Two logs in the same category are told apart by how the user worked with
   * them, so the meta line names the technique; the category stays on the
   * detail screen.
   */
  it("names the technique, never the category", () => {
    renderWithProviders(<DefusionLogRow log={log()} onPress={jest.fn()} />);

    expect(screen.getByText("Musical thoughts")).toBeTruthy();
    expect(screen.queryByText("Self-judgment")).toBeNull();
  });

  it("puts before → after on the meta line as one readable run", () => {
    renderWithProviders(<DefusionLogRow log={log()} onPress={jest.fn()} />);

    // Nested text joins into one run, so assistive tech reads the whole pair -
    // and a third column would have taken ~130dp off a two-line thought.
    expect(screen.getByText("60 → 20")).toBeTruthy();
  });

  it("omits the pair when either number is missing", () => {
    const { rerender } = renderWithProviders(
      <DefusionLogRow log={log({ fusionLevelAfter: null })} onPress={jest.fn()} />,
    );
    expect(screen.queryByText(/→/)).toBeNull();

    rerender(<DefusionLogRow log={log({ fusionLevelBefore: null })} onPress={jest.fn()} />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("renders a zero pair, which is a value and not an absence", () => {
    renderWithProviders(
      <DefusionLogRow
        log={log({ fusionLevelBefore: 0, fusionLevelAfter: 0 })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("0 → 0")).toBeTruthy();
  });

  /**
   * Absolute, not relative: this is a creation timestamp, and the relative
   * formatter is restricted to last-updated labels by the captured-frame gate.
   */
  it("keeps an absolute date-time on the meta line", () => {
    renderWithProviders(<DefusionLogRow log={log()} onPress={jest.fn()} />);

    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  /**
   * ☠️ An explicit `accessibilityLabel` on the row would hide its children from
   * assistive tech on the web, silencing the pair and the timestamp.
   */
  it("has no explicit accessible name, so its children stay readable", () => {
    renderWithProviders(<DefusionLogRow log={log()} onPress={jest.fn()} />);

    const row = screen.getByRole("button");
    expect(row.props.accessibilityLabel).toBeUndefined();
    expect(row.props["aria-label"]).toBeUndefined();
  });
});
