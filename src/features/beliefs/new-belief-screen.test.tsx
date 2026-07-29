import { act, fireEvent, screen } from "@testing-library/react-native";

import NewBeliefScreen from "@/app/(app)/modules/cbt/beliefs/new";
import { useCoreBelief, useSaveCoreBelief } from "@/src/features/beliefs/queries";
import { useBeliefDraftStore } from "@/src/stores/belief-draft-store";
import { backWithFallback } from "@/src/lib/back-with-fallback";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
  usePathname: () => "/modules/cbt/beliefs/new",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/beliefs/queries", () => ({
  useCoreBelief: jest.fn(),
  useSaveCoreBelief: jest.fn(),
}));

jest.mock("@/src/lib/back-with-fallback", () => ({
  backWithFallback: jest.fn(),
}));

const mockUseCoreBelief = jest.mocked(useCoreBelief);
const mockUseSaveCoreBelief = jest.mocked(useSaveCoreBelief);
const mockBackWithFallback = jest.mocked(backWithFallback);

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCoreBelief.mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof useCoreBelief>);
  mockUseSaveCoreBelief.mockReturnValue({
    mutateAsync: jest.fn(),
  } as unknown as ReturnType<typeof useSaveCoreBelief>);
});

describe("NewBeliefScreen discard draft", () => {
  it("offers Discard draft and clears the persisted draft on confirm (with nav fallback)", async () => {
    renderWithProviders(<NewBeliefScreen />);

    // Wait out the draft-store hydration gate.
    const discard = await screen.findByText("Discard draft");

    // Seed a draft as if the user had typed - discard must remove it.
    act(() => {
      useBeliefDraftStore.getState().setValues({
        beliefStatement: "probe",
        triggeringSituations: ["x"],
        evidenceFor: [""],
        evidenceAgainst: [""],
        alternativeBelief: "",
        originalBeliefStrength: 70,
        alternativeBeliefStrength: 30,
        reinforcementPlan: "",
        nextReviewDate: null,
      });
    });

    fireEvent.press(discard);
    expect(await screen.findByText("Discard this draft?")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    expect(useBeliefDraftStore.getState().values).toBeNull();
    expect(mockBackWithFallback).toHaveBeenCalledWith("/modules/cbt/beliefs");
  });
});
