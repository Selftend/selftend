import { screen } from "@testing-library/react-native";

import ActDefusionDetailScreen from "@/src/features/act/act-defusion-detail-screen";
import { DEFUSION_LIST_DEFAULT_LIMIT } from "@/src/features/act/queries";
import { actKeys } from "@/src/features/act/queries/keys";
import * as repo from "@/src/features/act/repository";
import type { DefusionLog } from "@/src/features/act/types";
import { createTestQueryClient, renderWithProviders } from "@/test/render-with-providers";

/**
 * #2256: the defusion detail has two doors, and it paints from whichever entry the door
 * filled — with no read for either.
 *
 * ☠️ Against a REAL query cache, on purpose. `act-detail-cache-probe.test.tsx` mocks the
 * queries barrel and can only see which hook the screen calls; it could not see that
 * #2190 moved the probe onto an entry ACT home never fills, so the home → "Recent" row →
 * detail hop went from an instant paint to a spinner plus two reads. This file seeds the
 * keys the two doors write and counts repository calls, so a probe that misses an entry,
 * or reads for one, fails here.
 */

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "row-1" }),
  usePathname: () => "/modules/act/defusion/row-1",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// Explicit factory rather than an automock of the re-export barrel — the pattern
// `queries/history-pages.test.tsx` established for the same reason.
jest.mock("@/src/features/act/repository", () => ({
  deleteDefusionLog: jest.fn(),
  getDefusionLog: jest.fn(),
  listDefusionLogs: jest.fn(),
  listDefusionLogsPage: jest.fn(),
}));

const AT = "2026-05-24T04:00:00.000Z";

const row: DefusionLog = {
  id: "row-1",
  userId: "user-1",
  fusedThought: "from the cache",
  thoughtCategory: "selfJudgment",
  techniqueUsed: "havingTheThoughtThat",
  defusedVersion: "",
  fusionLevelBefore: null,
  fusionLevelAfter: null,
  notes: "",
  createdAt: AT,
  updatedAt: AT,
};

/** The entry ACT home fills: the plain default-limit list, through `useActProgram`. */
const HOME_KEY = [...actKeys.defusionList("user-1"), DEFUSION_LIST_DEFAULT_LIMIT];
/** The entry the defusion list screen fills: the archive's pages. */
const LIST_KEY = actKeys.defusionHistoryPages("user-1");

function expectNoListRead() {
  expect(repo.listDefusionLogs).not.toHaveBeenCalled();
  expect(repo.listDefusionLogsPage).not.toHaveBeenCalled();
}

beforeEach(() => jest.clearAllMocks());

describe("the defusion detail's cache probe", () => {
  it("paints a row ACT home cached, with no read", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(HOME_KEY, [row]);

    renderWithProviders(<ActDefusionDetailScreen />, { queryClient });

    expect(screen.getAllByText("from the cache").length).toBeGreaterThan(0);
    expect(repo.getDefusionLog).not.toHaveBeenCalled();
    expectNoListRead();
  });

  it("paints a row the archive cached, with no read", () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(LIST_KEY, { pages: [[row]], pageParams: [null] });

    renderWithProviders(<ActDefusionDetailScreen />, { queryClient });

    expect(screen.getAllByText("from the cache").length).toBeGreaterThan(0);
    expect(repo.getDefusionLog).not.toHaveBeenCalled();
    expectNoListRead();
  });

  it("reads the one row on its own when neither entry holds it, and nothing else", async () => {
    jest.mocked(repo.getDefusionLog).mockResolvedValue(row);

    renderWithProviders(<ActDefusionDetailScreen />, { queryClient: createTestQueryClient() });

    expect((await screen.findAllByText("from the cache")).length).toBeGreaterThan(0);
    expect(repo.getDefusionLog).toHaveBeenCalledWith("user-1", "row-1");
    // The probes are passive: a cold deep link pays the single-row read, not a page or
    // a list for a screen that renders neither.
    expectNoListRead();
  });
});
