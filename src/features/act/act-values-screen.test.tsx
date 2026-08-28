import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
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
const mockSnapshots = jest.fn(
  () =>
    ({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    }) as Record<string, unknown>,
);

/** One page of snapshots, in the `useInfiniteQuery` envelope the screen reads. */
function snapshotPages(rows: unknown[], over: Record<string, unknown> = {}) {
  mockSnapshots.mockReturnValue({
    data: { pages: [rows], pageParams: [null] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...over,
  });
}

jest.mock("@/src/features/act/queries", () => ({
  useValueEntries: (...args: unknown[]) => mockEntries(...(args as [])),
  useLatestBullsEyeByDomain: (...args: unknown[]) => mockLatest(...(args as [])),
  useBullsEyeSnapshotPages: (...args: unknown[]) => mockSnapshots(...(args as [])),
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
  snapshotPages([]);
  mockSaveResolving();
});

/**
 * ☠️ The cap #1517 removed, and why it was worse than it looked. This section sliced its
 * read to `HISTORY_ROWS = 12`. Twelve rows sounds like twelve reviews, but a check-in
 * writes ONE ROW PER RATED DOMAIN — up to four — so the visible history was **three
 * review dates**. #1379 chose the twelve deliberately ("enough to read as a run without
 * turning the screen into a log"), which is why this was the judgement call on #1517 and
 * not an obvious oversight; the resolution keeps the recap shape and lets the user extend
 * it, rather than turning the screen into a log by default.
 */
describe("ActValuesScreen - the bull's-eye history is no longer capped at twelve rows", () => {
  const snapshot = (i: number) => ({
    id: `snap-${i}`,
    userId: "user-1",
    domain: "work",
    alignmentRating: (i % 10) + 1,
    reviewedAt: `2026-05-${String((i % 28) + 1).padStart(2, "0")}T09:00:00.000Z`,
    createdAt: `2026-05-${String((i % 28) + 1).padStart(2, "0")}T09:00:00.000Z`,
  });

  it("renders every loaded snapshot, past the old twelve-row slice", () => {
    snapshotPages(Array.from({ length: 20 }, (_, i) => snapshot(i)));

    renderWithProviders(<ActValuesScreen />);

    // The pill text is unique per row's rating position; counting rows is what matters.
    expect(screen.getByTestId("bulls-eye-history").children.length).toBeGreaterThan(12);
  });

  it("offers to extend the recap only when another page exists", () => {
    snapshotPages([snapshot(0)], { hasNextPage: false });
    const { unmount } = renderWithProviders(<ActValuesScreen />);
    expect(screen.queryByText("Show more")).toBeNull();
    unmount();

    snapshotPages([snapshot(0)], { hasNextPage: true });
    renderWithProviders(<ActValuesScreen />);
    expect(screen.getByText("Show more")).toBeTruthy();
  });

  /**
   * ☠️ A failed read is NOT an empty history, and this is the section where it lies
   * loudest: "No previous ratings yet." over a network error tells a user who checks in
   * every week that none of it was recorded. Exactly the "cap wearing the face of an
   * absence" that `getLatestBullsEyeByDomain` already exists one surface over to avoid.
   */
  it("tells a failed history read apart from an empty one", () => {
    mockSnapshots.mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: true,
      isFetchingNextPage: false,
      refetch: jest.fn(),
    });

    renderWithProviders(<ActValuesScreen />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.queryByText("No previous ratings yet.")).toBeNull();
  });

  it("asks for the next page when the user presses Show more", () => {
    const fetchNextPage = jest.fn();
    snapshotPages([snapshot(0)], { hasNextPage: true, fetchNextPage });

    renderWithProviders(<ActValuesScreen />);
    fireEvent.press(screen.getByText("Show more"));

    expect(fetchNextPage).toHaveBeenCalled();
  });
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

  /**
   * ☠️ `undefined` from the latest read is "not answered yet", never "no check-in".
   * Let it fall through to the entry's retired column and the row renders the exact
   * number this fold exists to stop showing - a flash of it on first paint, and a
   * permanent one if the read failed, since a settled error also leaves data undefined.
   */
  it("shows no alignment at all while the latest read has not answered", () => {
    mockEntries.mockReturnValue({
      data: [{ lifeDomain: "work", valueStatement: "Careful work", currentAlignmentRating: 4 }],
      isLoading: false,
    } as never);
    mockLatest.mockReturnValue({ data: undefined });

    renderWithProviders(<ActValuesScreen />);

    expect(screen.queryByText("Alignment: 4/10")).toBeNull();
    expect(screen.queryByText(/Alignment:/)).toBeNull();
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
 * ☠️ The failure mode the draft store introduces, and the reason the retry set is
 * derived from the DRAFT rather than from the error card's list. The ratings now
 * outlive a remount; the card's list does not. Filter the retry by the card and a
 * user who hits a partial failure, walks away and comes back saves the domain that
 * already succeeded a SECOND time - a duplicate snapshot, with nothing failing.
 */
describe("ActValuesScreen - a partial failure survives leaving the screen", () => {
  it("retries only the failed domain after a remount, never the one that saved", async () => {
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

    const { unmount } = renderWithProviders(<ActValuesScreen />);
    const rateButtons = screen.getAllByText("rate");
    fireEvent.press(rateButtons[0]); // work
    fireEvent.press(rateButtons[1]); // leisure
    fireEvent.press(screen.getByText("Save ratings"));
    expect(await screen.findByText("Could not save")).toBeTruthy();

    // Work reached the server; only leisure is still owed.
    expect(useActValuesCheckInDraftStore.getState().values).toMatchObject({
      work: null,
      leisure: 5,
    });

    // Leave and come back: the card is gone with the component, the rating is not.
    unmount();
    mutateAsync.mockClear();
    leisureShouldFail = false;
    renderWithProviders(<ActValuesScreen />);
    expect(screen.queryByText("Could not save")).toBeNull();

    fireEvent.press(screen.getByText("Save ratings"));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
    expect(mutateAsync.mock.calls.map((call) => call[0].domain)).toEqual(["leisure"]);
  });
});

/**
 * The values route is single-instance, so leaving it and coming back REUSES the
 * instance rather than remounting it. Ratings therefore have to survive in a place
 * that outlives the component, and be cleared on sign-out with the rest of the drafts.
 */
describe("ActValuesScreen - unsaved ratings", () => {
  /**
   * ☠️ The draft store's `setValues` takes a VALUE, not an updater, so a handler that
   * spread the `ratings` it closed over would lose the earlier of two ratings set
   * inside one batch - silently, and only for the user quick enough to do it.
   */
  it("keeps both ratings when two are set inside a single batch", () => {
    renderWithProviders(<ActValuesScreen />);
    const rateButtons = screen.getAllByText("rate");

    act(() => {
      fireEvent.press(rateButtons[0]); // work
      fireEvent.press(rateButtons[1]); // leisure
    });

    expect(useActValuesCheckInDraftStore.getState().values).toMatchObject({
      work: 5,
      leisure: 5,
    });
  });

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
