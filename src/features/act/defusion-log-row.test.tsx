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
   * Compact since #1539, and ACT home's recent block moves with it — this row is
   * shared by both surfaces on purpose (#1388), so the shape cannot change on one
   * of them alone.
   *
   * ☠️ The clock is frozen because the compact form is relative to today: read
   * against the real clock this assertion changes meaning as the year turns (an
   * entry outside the current year regains its year, which is how the previous
   * `/2026/` assertion would have quietly started passing again).
   *
   * Still not `formatRelativeActivity` — that one is restricted to last-updated
   * labels by the captured-frame gate, and this is a creation timestamp.
   */
  it("reads compact on the meta line, not as a full date-time", () => {
    // 09:00Z reads 2:30 PM in the runner's pinned Asia/Kolkata frame; ACT captures
    // no offset, so the viewer frame is the only frame (#1513).
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    jest.setSystemTime(new Date("2026-05-24T12:00:00.000Z"));

    renderWithProviders(<DefusionLogRow log={log()} onPress={jest.fn()} />);

    expect(screen.getByText("2:30 PM")).toBeTruthy();
    expect(screen.queryByText("May 24, 2026, 2:30 PM")).toBeNull();

    jest.useRealTimers();
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
