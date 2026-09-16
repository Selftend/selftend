import { fireEvent, screen, within } from "@testing-library/react-native";

import { AMBIENT_SOUNDS } from "@/src/constants/breathing-sounds";
import { SoundPanel } from "@/src/features/meditation/sound-panel";
import { renderWithProviders } from "@/test/render-with-providers";

// ☠️ The one rule of §2 that a type cannot carry: the panel reads its bed and
// its volume from PROPS and never from the preferences query. A panel that read
// the query would show the rolled-back bed while the lane played the picked one
// - its selected chip and what is audible would disagree exactly when it
// matters. Reaching for either hook here is a test failure, not a code review
// note.
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => {
    throw new Error("the sound panel must never read useUserPreferences (docs/sound.md §2)");
  },
  useUpdateUserPreferences: () => {
    throw new Error("the sound panel must never write preferences itself (docs/sound.md §2)");
  },
}));

const noop = () => {};

function renderPanel(props: Partial<React.ComponentProps<typeof SoundPanel>> = {}) {
  const handlers = {
    onClose: jest.fn(),
    onPickBed: jest.fn(),
    onChangeVolume: jest.fn(),
    onCommitVolume: jest.fn(),
  };
  renderWithProviders(
    <SoundPanel
      visible
      bedId="none"
      bedVolume={0.5}
      {...handlers}
      {...props}
      onClose={props.onClose ?? handlers.onClose}
    />,
  );
  return handlers;
}

describe("The sound panel (docs/sound.md §1.2)", () => {
  it("renders nothing until it is opened", () => {
    renderWithProviders(
      <SoundPanel
        visible={false}
        bedId="rain"
        bedVolume={0.5}
        onClose={noop}
        onPickBed={noop}
        onChangeVolume={noop}
        onCommitVolume={noop}
      />,
    );

    expect(screen.queryByText("Background sound")).toBeNull();
  });

  it("holds exactly the three elements of §1.2: a header row with Done, the beds, and nothing else while None is chosen", () => {
    renderPanel();

    // The heading and the ghost Done share the header row, and that Done is the
    // ONLY one: the full-width Done of the layout this one beat would have cost
    // 78px the ring needs (#2442's measurement).
    expect(screen.getByRole("heading", { name: "Background sound" })).toBeTruthy();
    expect(screen.getAllByText("Done")).toHaveLength(1);
    // Once, not twice: the chip row's own eyebrow is hidden because these are
    // its words. It stays the row's accessible NAME - see the beds test below.
    expect(screen.getAllByText("Background sound")).toHaveLength(1);
    // No hint copy, no empty state, and - with None chosen - no volume.
    expect(screen.queryByLabelText("Background sound volume")).toBeNull();
  });

  it("offers every bed, None first, with the chosen one checked", () => {
    renderPanel({ bedId: "ocean" });

    // By testID and props, not `getByRole("radiogroup", { name })`: the group is
    // a View that is deliberately not `accessible` (collapsing ten radios into
    // one node on iOS is worse), and RNTL's role queries cannot see it.
    const group = screen.getByTestId("sound-panel-beds");
    expect(group.props.accessibilityRole).toBe("radiogroup");
    // The heading IS the group's name - the eyebrow is hidden, the name is not.
    expect(group.props.accessibilityLabel).toBe("Background sound");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(AMBIENT_SOUNDS.length);
    // #1742's guardrail, restated here because this is the second place the
    // list is drawn: silence leads, and it is never presented as a gap.
    expect(within(radios[0]).getByText("None")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Ocean", checked: true })).toBeTruthy();
  });

  it("applies a pick live - one call, no confirm step, and the panel stays open", () => {
    const handlers = renderPanel({ bedId: "none" });

    fireEvent.press(screen.getByRole("radio", { name: "Rain" }));

    expect(handlers.onPickBed).toHaveBeenCalledWith("rain");
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("shows the rail only once a bed is chosen, reading the volume it was handed", () => {
    renderPanel({ bedId: "rain", bedVolume: 0.3 });

    // The short visible label is the rail's own (`Volume`); the accessible name
    // is the lane's full one, so a screen reader is told WHICH volume.
    expect(screen.getByText("Volume")).toBeTruthy();
    expect(screen.getByText("30%")).toBeTruthy();
    expect(screen.getByLabelText("Background sound volume").props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 30,
    });
  });

  it("commits a volume move without closing", () => {
    const handlers = renderPanel({ bedId: "rain", bedVolume: 0.3 });

    fireEvent(screen.getByLabelText("Background sound volume"), "responderRelease");

    expect(handlers.onCommitVolume).toHaveBeenCalledWith(0.3);
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  it("closes on Done and on the platform's own dismissal, and on nothing else", () => {
    const handlers = renderPanel({ bedId: "rain" });

    fireEvent.press(screen.getByText("Done"));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);

    // Android hardware back / the web Escape key arrive here.
    fireEvent(screen.getByTestId("sound-panel"), "requestClose");
    expect(handlers.onClose).toHaveBeenCalledTimes(2);
  });

  it("carries no tap-outside dismissal", () => {
    // §1.4, and the one place this sheet deliberately differs from breathing's:
    // a stray tap during a sit must not close the panel, so the backdrop is a
    // plain View. Breathing's backdrop `Pressable` is NOT copied.
    renderPanel({ bedId: "rain" });

    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    expect(
      screen.getAllByRole("button").map((node) => node.props.accessibilityLabel),
    ).not.toContain("Close");
  });

  it("is constrained to the shell's 620px content column", () => {
    renderPanel({ bedId: "rain" });

    // Not a full-width bar on a desktop window: the panel lines up with the
    // focus shell's column (`focus-session-shell.tsx`).
    expect(screen.getByTestId("sound-panel-sheet").props.className).toContain("max-w-[620px]");
  });
});
