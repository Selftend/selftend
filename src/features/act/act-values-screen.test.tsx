import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactElement } from "react";
import { Pressable, Text } from "react-native";

import ActValuesScreen from "@/src/features/act/act-values-screen";
import { useSaveBullsEyeSnapshot } from "@/src/features/act/queries";
import { useActValuesCheckInDraftStore } from "@/src/stores/act-values-check-in-draft-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/values",
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

const mockEntries = jest.fn(() => ({ data: [], isLoading: false }));
const mockLatest = jest.fn(() => ({ data: undefined }) as { data: unknown });
const mockSnapshots = jest.fn(() => ({ data: [] }) as { data: unknown });

jest.mock("@/src/features/act/queries", () => ({
  useValueEntries: (...args: unknown[]) => mockEntries(...(args as [])),
  useLatestBullsEyeByDomain: (...args: unknown[]) => mockLatest(...(args as [])),
  useBullsEyeSnapshots: (...args: unknown[]) => mockSnapshots(...(args as [])),
  useSaveBullsEyeSnapshot: jest.fn(),
}));

const mockUseSave = useSaveBullsEyeSnapshot as jest.MockedFunction<typeof useSaveBullsEyeSnapshot>;

function mockSaveResolving() {
  mockUseSave.mockReturnValue({
    mutateAsync: jest.fn(() => Promise.resolve({} as never)),
    isPending: false,
  } as unknown as ReturnType<typeof useSaveBullsEyeSnapshot>);
}

beforeEach(() => {
  jest.clearAllMocks();
  useActValuesCheckInDraftStore.getState().reset();
  mockEntries.mockReturnValue({ data: [], isLoading: false });
  mockLatest.mockReturnValue({ data: undefined });
  mockSnapshots.mockReturnValue({ data: [] });
  mockSaveResolving();
});

/**
 * ☠️ The bug this screen was folded to expose: two controls answered "how aligned is
 * my life with this value?" and the row read the one the check-in did not write. These
 * pin the resolved order - the check-in's newest rating wins, and the entry's retired
 * column is read ONLY where no check-in exists for that domain.
 */
describe("ActValuesScreen - which alignment number the row shows", () => {
  it("shows the check-in's latest rating, not the value entry's own column", () => {
    mockEntries.mockReturnValue({
      data: [{ lifeDomain: "work", valueStatement: "Careful work", currentAlignmentRating: 4 }],
      isLoading: false,
    } as never);
    mockLatest.mockReturnValue({ data: { work: 9 } });

    renderWithProviders(<ActValuesScreen />);

    expect(screen.getByText("Alignment: 9/10")).toBeTruthy();
    expect(screen.queryByText("Alignment: 4/10")).toBeNull();
  });

  it("falls back to the entry's column for a domain with no check-in yet", () => {
    mockEntries.mockReturnValue({
      data: [{ lifeDomain: "work", valueStatement: "Careful work", currentAlignmentRating: 4 }],
      isLoading: false,
    } as never);
    // Rated domains resolve; `work` has simply never been checked in.
    mockLatest.mockReturnValue({ data: { work: null, leisure: 6 } });

    renderWithProviders(<ActValuesScreen />);

    expect(screen.getByText("Alignment: 4/10")).toBeTruthy();
  });

  it("says nothing at all for a domain with neither", () => {
    mockLatest.mockReturnValue({ data: { work: null } });

    renderWithProviders(<ActValuesScreen />);

    expect(screen.queryByText(/Alignment:/)).toBeNull();
    // The unset state keeps its add affordance rather than a chevron.
    expect(screen.getAllByText("Not yet explored")).toHaveLength(4);
  });
});

/**
 * Carried over from the standalone check-in screen, which this fold deleted. It was
 * the ONLY jest coverage either screen had, and a user who saves four ratings and has
 * one fail must still be told which one.
 */
describe("ActValuesScreen - partial save failure", () => {
  it("keeps the ratings on screen, lists the failed domain, and retries ONLY that domain", async () => {
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

    renderWithProviders(<ActValuesScreen />);

    // Rate work (index 0) and leisure (index 1).
    const rateButtons = screen.getAllByText("rate");
    fireEvent.press(rateButtons[0]);
    fireEvent.press(rateButtons[1]);

    fireEvent.press(screen.getByText("Save ratings"));

    // Leisure rejected: the screen stays put and the error card names it.
    // "Leisure & play" now appears three times: the values row above, the rating
    // Label, and the error card entry - the row is what the fold added.
    expect(await screen.findByText("Could not save")).toBeTruthy();
    expect(screen.getAllByText("Leisure & play")).toHaveLength(3);
    expect(screen.getAllByText("Work & education")).toHaveLength(2); // row + label; it saved
    expect(mockShowToast).not.toHaveBeenCalled();

    // Both rated domains were attempted the first time.
    expect(mutateAsync.mock.calls.map((call) => call[0].domain)).toEqual(["work", "leisure"]);

    // Retry: only the FAILED domain is saved again - the fulfilled one must not
    // be duplicated on the server.
    leisureShouldFail = false;
    fireEvent.press(screen.getByText("Save ratings"));

    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Ratings saved", tone: "success" }),
      ),
    );
    expect(mutateAsync.mock.calls.slice(2).map((call) => call[0].domain)).toEqual(["leisure"]);
    // ☠️ The check-in no longer navigates anywhere on save. It is on the screen the
    // user came to read, and the numbers they just saved land on the rows above.
    expect(router.back).not.toHaveBeenCalled();
  });
});

/**
 * The values route is single-instance, so leaving it and coming back REUSES the
 * instance rather than remounting it. Ratings therefore have to survive in a place
 * that outlives the component, and be cleared on sign-out with the rest of the drafts.
 */
describe("ActValuesScreen - unsaved ratings", () => {
  it("keeps typed ratings in the draft store and restores them on a remount", () => {
    const { unmount } = renderWithProviders(<ActValuesScreen />);
    fireEvent.press(screen.getAllByText("rate")[2]);

    expect(useActValuesCheckInDraftStore.getState().values).toMatchObject({
      relationships: 5,
    });

    unmount();
    renderWithProviders(<ActValuesScreen />);

    expect(useActValuesCheckInDraftStore.getState().values).toMatchObject({
      relationships: 5,
    });
    // Still offering to save them, rather than a disabled button over a clean slate.
    expect(screen.getByText("Save ratings")).toBeTruthy();
  });

  it("clears the draft once every rating in it has saved", async () => {
    renderWithProviders(<ActValuesScreen />);
    fireEvent.press(screen.getAllByText("rate")[0]);

    fireEvent.press(screen.getByText("Save ratings"));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
    expect(useActValuesCheckInDraftStore.getState().values).toBeNull();
  });
});
