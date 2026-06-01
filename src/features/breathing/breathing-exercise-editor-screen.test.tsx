import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";
import { renderWithProviders } from "@/test/render-with-providers";

const mockSave = jest.fn().mockResolvedValue({ id: "e-1" });
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  router: { canGoBack: () => true, back: () => mockBack(), replace: jest.fn() },
  usePathname: () => "/tools/breathing/new",
}));
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: () => void }) => unknown) =>
    selector({ showToast: jest.fn() }),
}));
jest.mock("@/src/features/breathing/exercises-queries", () => ({
  useBreathingExercises: () => ({ data: [] }),
  useBreathingExercise: () => ({ data: null, isLoading: false }),
  useSaveBreathingExercise: () => ({ mutateAsync: mockSave, isPending: false }),
  useDeleteBreathingExercise: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

describe("BreathingExerciseEditorScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("blocks save when the name is blank and shows an error", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(screen.getByText("Give your exercise a name.")).toBeTruthy());
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("saves a named exercise with the default pattern", async () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    fireEvent.changeText(screen.getByLabelText("Name"), "Evening wind-down");
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(mockSave.mock.calls[0][0].input.name).toBe("Evening wind-down");
  });
});
