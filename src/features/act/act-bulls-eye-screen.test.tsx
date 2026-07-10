import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";

import ActBullsEyeScreen from "@/src/features/act/act-bulls-eye-screen";
import { useSaveBullsEyeSnapshot } from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/values/bulls-eye",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockShowToast = jest.fn();

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (s: { showToast: jest.Mock }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

// Each NumberRating becomes a single "rate" button that sets 5. Instances render
// in ACT_LIFE_DOMAINS order (work, leisure, relationships, personalGrowth), so
// getAllByText("rate")[i] addresses the i-th domain. The component body lives in
// a `mock`-prefixed module variable because RN elements inside the jest.mock
// factory get rewritten by the css-interop babel plugin into out-of-scope refs.
let mockNumberRatingImpl: (props: { onChange: (value: number) => void }) => ReactElement;

jest.mock("@/src/components/app/number-rating", () => ({
  NumberRating: (props: { onChange: (value: number) => void }) => mockNumberRatingImpl(props),
}));

mockNumberRatingImpl = ({ onChange }) => (
  <Pressable accessibilityRole="button" onPress={() => onChange(5)}>
    <Text>rate</Text>
  </Pressable>
);

jest.mock("@/src/features/act/queries", () => ({
  useBullsEyeSnapshots: jest.fn(() => ({ data: [] })),
  useSaveBullsEyeSnapshot: jest.fn(),
}));

const mockUseSave = useSaveBullsEyeSnapshot as jest.MockedFunction<typeof useSaveBullsEyeSnapshot>;

describe("ActBullsEyeScreen - partial save failure", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps the screen open, lists the failed domain, and retries ONLY that domain", async () => {
    let leisureShouldFail = true;
    const mutateAsync = jest.fn(({ domain }: { domain: string; alignmentRating: number }) =>
      domain === "leisure" && leisureShouldFail
        ? Promise.reject(new Error("boom"))
        : Promise.resolve({} as never),
    );
    mockUseSave.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useSaveBullsEyeSnapshot>);

    renderWithProviders(<ActBullsEyeScreen />);

    // Rate work (index 0) and leisure (index 1).
    const rateButtons = screen.getAllByText("rate");
    fireEvent.press(rateButtons[0]);
    fireEvent.press(rateButtons[1]);

    fireEvent.press(screen.getByText("Save ratings"));

    // Leisure rejected: the screen stays open and the error card names it.
    // "Leisure & play" appears twice: its rating Label plus the error card entry.
    expect(await screen.findByText("Could not save")).toBeTruthy();
    expect(screen.getAllByText("Leisure & play")).toHaveLength(2);
    expect(screen.getAllByText("Work & education")).toHaveLength(1); // label only - it saved
    expect(router.back).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();

    // Both rated domains were attempted the first time.
    expect(mutateAsync.mock.calls.map((call) => call[0].domain)).toEqual(["work", "leisure"]);

    // Retry: only the FAILED domain is saved again - the fulfilled one must not
    // be duplicated on the server.
    leisureShouldFail = false;
    fireEvent.press(screen.getByText("Save ratings"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.slice(2).map((call) => call[0].domain)).toEqual(["leisure"]);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Ratings saved", tone: "success" }),
    );
  });
});
