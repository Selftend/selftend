import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { BreathingExerciseEditorScreen } from "@/src/features/breathing/breathing-exercise-editor-screen";
import { BREATHING_EXERCISE_COLORS } from "@/src/features/breathing/exercise-types";
import { renderWithProviders } from "@/test/render-with-providers";
import { expectRoomPour } from "@/test/room-pour";

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

  it("exposes the color picker as radios with exactly one checked color", () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(BREATHING_EXERCISE_COLORS.length);

    fireEvent.press(radios[2]);

    const checked = screen.getAllByRole("radio", { checked: true });
    expect(checked).toHaveLength(1);
    expect(checked[0]).toBe(radios[2]);
  });

  it("renders the aqua room with the field header in create mode", () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId={null} />);

    // The room wrapper carries the aqua re-pour; a wrong or missing room fails here.
    expectRoomPour(screen.getByTestId("breathing-editor-room"), "aqua");
    // Create mode gets the full-bleed aqua field (Direction B create-editor rule).
    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
  });

  it("renders the plain aqua pour without a field in edit mode", () => {
    renderWithProviders(<BreathingExerciseEditorScreen exerciseId="e-1" />);

    expectRoomPour(screen.getByTestId("breathing-editor-room"), "aqua");
    // Edit mode is a plain-pour sub-surface — no field header.
    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
  });
});
