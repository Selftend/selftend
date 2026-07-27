import { fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";
import { saveMindfulnessSession } from "@/src/features/mindfulness/repository";
import { roomVariables } from "@/src/lib/module-room";
import { renderWithProviders } from "@/test/render-with-providers";

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

  it("returns to intro when the session is exited", () => {
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <GroundingFlow slug="cold-water" />,
    );
    fireEvent.press(getByText("Start"));
    // now in session
    expect(queryByText("Start")).toBeNull();
    fireEvent.press(getByLabelText("Close"));
    // back on intro
    expect(getByText("Start")).toBeTruthy();
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

    // Done
    expect(getByText("Done")).toBeTruthy();
    fireEvent.press(getByText("Save session"));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith("user-1", {
        exerciseName: "cold-water",
        durationMinutes: 1,
        reflection: "",
        feelingAfter: null,
      }),
    );

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/tools/grounding"));
  });

  it("pours the clay room over every phase, with no field header", () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProviders(
      <GroundingFlow slug="cold-water" />,
    );
    const clay = roomVariables("clay").light;

    // Intro: the room wrapper carries the pour; a wrong or missing room fails here.
    expect(getByTestId("grounding-flow-room").props.style).toEqual(clay);
    // Session screens take the pour only — the exercise is the hero (#301).
    expect(queryByTestId("module-field-gradient")).toBeNull();

    // The pour survives the phase swaps: intro -> session -> done.
    fireEvent.press(getByText("Start"));
    expect(getByTestId("grounding-flow-room").props.style).toEqual(clay);

    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Next"));
    fireEvent.press(getByText("Finish"));
    expect(getByTestId("grounding-flow-room").props.style).toEqual(clay);
    expect(queryByTestId("module-field-gradient")).toBeNull();
  });

  it("pours the clay room on the not-found branch", () => {
    const { getByTestId } = renderWithProviders(<GroundingFlow slug="nope" />);
    expect(getByTestId("grounding-flow-room").props.style).toEqual(roomVariables("clay").light);
  });
});
