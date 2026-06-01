import { fireEvent, screen } from "@testing-library/react-native";

import { SoundsSheet } from "@/src/features/breathing/sounds-sheet";
import { renderWithProviders } from "@/test/render-with-providers";

const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));
jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: () => ({ data: undefined }),
  useUpdateUserPreferences: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

describe("SoundsSheet", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders both lane pickers", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    expect(screen.getByLabelText("Choose a breath sound")).toBeTruthy();
    expect(screen.getByLabelText("Choose an ambient sound")).toBeTruthy();
  });

  it("opens the breath picker and selects a sound, writing prefs", () => {
    renderWithProviders(<SoundsSheet visible onDismiss={() => {}} />);
    fireEvent.press(screen.getByLabelText("Choose a breath sound"));
    fireEvent.press(screen.getByText("Ocean swell"));
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0].breathSoundId).toBe("ocean-swell");
  });
});
