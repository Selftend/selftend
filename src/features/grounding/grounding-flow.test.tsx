import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";
import { saveMindfulnessSession } from "@/src/features/mindfulness/repository";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

// The flow's beforeRemove listener is how an OS/web back exit asks to finish
// early (#874); tests trigger it by capturing the registered listener.
const beforeRemoveListeners: ((event: { preventDefault: () => void }) => void)[] = [];

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useNavigation: () => ({
    addListener: (name: string, listener: (event: { preventDefault: () => void }) => void) => {
      if (name === "beforeRemove") beforeRemoveListeners.push(listener);
      return () => {};
    },
  }),
  // Parent route (not /tools/grounding/cold-water) so ScreenBreadcrumb renders nothing, avoiding a duplicate technique-title node.
  usePathname: () => "/tools/grounding",
}));

jest.mock("@/src/features/mindfulness/repository", () => ({
  listMindfulnessSessionsByNames: jest.fn().mockResolvedValue([]),
  countMindfulnessSessionsByNames: jest.fn().mockResolvedValue(0),
  saveMindfulnessSession: jest.fn().mockResolvedValue({ id: "s1" }),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockSave = saveMindfulnessSession as jest.MockedFunction<typeof saveMindfulnessSession>;

/** Fires the flow's beforeRemove handler the way an OS back gesture would. */
function pressBack() {
  const preventDefault = jest.fn();
  // act(): the handler sets confirm-dialog state.
  act(() => {
    for (const listener of beforeRemoveListeners) listener({ preventDefault });
  });
  return preventDefault;
}

describe("GroundingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    beforeRemoveListeners.length = 0;
  });

  it("renders not-found for an unknown slug", () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="nope" />);
    expect(getByText("Technique not found")).toBeTruthy();
  });

  // No intro phase (#874, decided on #868): the session opens on step 1.
  it("opens directly on step 1, with no Start screen", () => {
    const { getByText, queryByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    expect(queryByText("Start")).toBeNull();
    expect(getByText("Prepare · 1 of 4")).toBeTruthy();
  });

  // Confirming an uninvited exit saves, then actually leaves the route the way
  // breathing and meditation do (#928 — it used to strand on the done screen).
  it("saves neutral partial progress and leaves when a back exit is confirmed", async () => {
    const { getByText, getByTestId, queryByText } = renderWithProviders(
      <GroundingFlow slug="cold-water" />,
    );

    // Mid-session, an uninvited exit asks rather than discarding.
    const preventDefault = pressBack();
    expect(preventDefault).toHaveBeenCalled();
    expect(getByText("Finish this session?")).toBeTruthy();
    fireEvent.press(getByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ stepsCompleted: 1, stepsTotal: 4 }),
      ),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/tools/grounding"));
    expect(queryByText("Grounding complete")).toBeNull();
  });

  // The invited exit (#928): the inline Finish early button saves the furthest
  // step and lands on the done screen — no dialog, exactly like the siblings'
  // explicit finish.
  it("saves and lands on the done screen when Finish early is pressed", async () => {
    const { getByText, queryByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish early"));

    expect(queryByText("Finish this session?")).toBeNull();
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ stepsCompleted: 2, stepsTotal: 4 }),
      ),
    );
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("saves the furthest reached step after navigating back within the session", async () => {
    const { getByText, getByLabelText, getByTestId } = renderWithProviders(
      <GroundingFlow slug="cold-water" />,
    );
    fireEvent.press(getByLabelText("Go to step 4 of 4"));
    fireEvent.press(getByText("Back"));
    pressBack();
    fireEvent.press(getByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ stepsCompleted: 4, stepsTotal: 4 }),
      ),
    );
  });

  it("keeps the session when the back exit is cancelled", () => {
    const { getByText, queryByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    pressBack();
    fireEvent.press(getByText("Keep going"));
    expect(queryByText("Grounding complete")).toBeNull();
    expect(getByText("Prepare · 1 of 4")).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("walks session -> done -> save, with the record on the done screen", async () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);

    // Session: cold-water has 4 steps; press Next 3 times then Finish.
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith("user-1", {
        exerciseName: "cold-water",
        durationMinutes: 1,
        reflection: "",
        feelingAfter: null,
        stepsCompleted: 4,
        stepsTotal: 4,
      }),
    );
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());
    // The meta line states the record — technique, length, saved (#874's 5c).
    expect(getByText("Cold water · 1 min · saved to your history")).toBeTruthy();

    fireEvent.press(getByText("Done"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/tools/grounding"));
  });

  it("offers a second, quieter path back to the technique picker", async () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());

    fireEvent.press(getByText("Run another technique"));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/tools/grounding"));
  });

  it("lets a back exit through once the session is done", async () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());

    const preventDefault = pressBack();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  // The session phases render on FocusSessionShell — the focus surface
  // breathing and meditation share (#777) — so the clay pour only remains on
  // the not-found branch.
  it("renders the focus wash over the session and done phases", async () => {
    const { getByTestId, getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    expect(getByTestId("focus-surface-wash", { includeHiddenElements: true })).toBeTruthy();

    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());
    expect(getByTestId("focus-surface-wash", { includeHiddenElements: true })).toBeTruthy();
  });

  it("pours the clay room on the not-found branch", () => {
    const { getByTestId } = renderWithProviders(<GroundingFlow slug="nope" />);
    expectNeutralRoom(getByTestId("grounding-flow-room"));
  });
});
