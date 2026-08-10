import { fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";
import { saveMindfulnessSession } from "@/src/features/mindfulness/repository";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectNeutralRoom } from "@/test/room-pour";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
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

describe("GroundingFlow", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders not-found for an unknown slug", () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="nope" />);
    expect(getByText("Technique not found")).toBeTruthy();
  });

  it("saves neutral partial progress when the session is finished early", async () => {
    const { getByText, getByLabelText, queryByText, getByTestId } = renderWithProviders(
      <GroundingFlow slug="cold-water" />,
    );
    fireEvent.press(getByText("Start"));
    // now in session
    expect(queryByText("Start")).toBeNull();
    fireEvent.press(getByLabelText("Close"));
    expect(getByText("Finish this session?")).toBeTruthy();
    expect(queryByText("Start")).toBeNull();
    fireEvent.press(getByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ stepsCompleted: 1, stepsTotal: 4 }),
      ),
    );
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());
  });

  it("walks intro -> session -> done -> save", async () => {
    const { getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);

    // Intro
    expect(getByText("Cold water")).toBeTruthy();
    fireEvent.press(getByText("Start"));

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
    fireEvent.press(getByText("Done"));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/tools/grounding"));
  });

  it("pours the clay room over every phase", async () => {
    const { getByTestId, getByText } = renderWithProviders(<GroundingFlow slug="cold-water" />);
    // Intro: the room wrapper carries the pour; a wrong or missing room fails here.
    expectNeutralRoom(getByTestId("grounding-flow-room"));

    // The pour survives the phase swaps: intro -> session -> done.
    fireEvent.press(getByText("Start"));
    expectNeutralRoom(getByTestId("grounding-flow-room"));

    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));
    await waitFor(() => expect(getByText("Grounding complete")).toBeTruthy());
    expectNeutralRoom(getByTestId("grounding-flow-room"));
  });

  it("pours the clay room on the not-found branch", () => {
    const { getByTestId } = renderWithProviders(<GroundingFlow slug="nope" />);
    expectNeutralRoom(getByTestId("grounding-flow-room"));
  });
});
