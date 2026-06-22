import { fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { GroundingFlow } from "@/src/features/grounding/grounding-flow";
import { saveMindfulnessSession } from "@/src/features/mindfulness/repository";
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
});
