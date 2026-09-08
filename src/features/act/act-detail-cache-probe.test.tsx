import { screen } from "@testing-library/react-native";

import ActChoicePointDetailScreen from "@/src/features/act/act-choice-point-detail-screen";
import ActCommittedActionDetailScreen from "@/src/features/act/act-committed-action-detail-screen";
import ActConnectionDetailScreen from "@/src/features/act/act-connection-detail-screen";
import ActDefusionDetailScreen from "@/src/features/act/act-defusion-detail-screen";
import ActExpansionDetailScreen from "@/src/features/act/act-expansion-detail-screen";
import ActObservingSelfDetailScreen from "@/src/features/act/act-observing-self-detail-screen";
import * as queries from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * #2190: every ACT detail screen probes the cache entry its LIST SCREEN fills.
 *
 * ☠️ The archive rewrite (#1517) moved the list screens onto `*Pages` infinite queries
 * under their own keys and left the detail screens probing the plain list hooks the
 * pre-rewrite screens had shared with them. Nothing on the list-to-detail path filled
 * those any more, so every tap missed: a full-screen spinner when the entry was absent,
 * and always an extra list read no surface rendered — for committed actions the one read
 * with no bound at all. The urge-surf detail, added in the same delta, probed its pages
 * hook from the start; this file pins the other six to the same shape.
 *
 * One file for six screens on purpose: it is one rule, and split six ways a later edit
 * regresses one screen invisibly.
 */

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "row-1" }),
  usePathname: () => "/modules/act",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24" }),
  loggedAtForSelectedDate: () => "2026-05-24T04:00:00.000Z",
}));

jest.mock("@/src/features/act/queries", () => {
  const idle = () => ({ mutateAsync: jest.fn(), isPending: false });
  return {
    // The entries the list screens fill.
    useChoicePointPages: jest.fn(),
    useConnectionLogPages: jest.fn(),
    useDefusionLogPages: jest.fn(),
    useExpansionLogPages: jest.fn(),
    useObservingSelfSessionPages: jest.fn(),
    useListedCommittedActions: jest.fn(),
    // The plain list hooks the detail screens used to probe. Present so a regression
    // calls a mock rather than throwing, and asserted never called.
    useChoicePoints: jest.fn(() => ({ data: undefined })),
    useConnectionLogs: jest.fn(() => ({ data: undefined })),
    useDefusionLogs: jest.fn(() => ({ data: undefined })),
    useExpansionLogs: jest.fn(() => ({ data: undefined })),
    useObservingSelfSessions: jest.fn(() => ({ data: undefined })),
    useCommittedActions: jest.fn(() => ({ data: undefined })),
    // The single-row reads, which must stay DISABLED on a cache hit.
    useChoicePoint: jest.fn(),
    useConnectionLog: jest.fn(),
    useDefusionLog: jest.fn(),
    useExpansionLog: jest.fn(),
    useObservingSelfSession: jest.fn(),
    useCommittedAction: jest.fn(),
    useActionSteps: jest.fn(() => ({ data: [] })),
    useSaveActionStep: idle,
    useToggleActionStep: idle,
    useDeleteActionStep: idle,
    useUpdateCommittedAction: idle,
    useDeleteCommittedAction: idle,
    useDeleteChoicePoint: idle,
    useDeleteConnectionLog: idle,
    useDeleteDefusionLog: idle,
    useDeleteExpansionLog: idle,
    useDeleteObservingSelfSession: idle,
  };
});

const mocked = queries as unknown as Record<string, jest.Mock>;

const AT = "2026-05-24T04:00:00.000Z";

/** One row shaped for every detail at once; each screen reads only its own fields. */
const row = {
  id: "row-1",
  userId: "user-1",
  createdAt: AT,
  updatedAt: AT,
  notes: "",
  // choice point
  hooks: ["from the cache"],
  awayMoves: [],
  towardMoves: [],
  // defusion
  fusedThought: "from the cache",
  thoughtCategory: "selfJudgment",
  techniqueUsed: "havingTheThoughtThat",
  defusedVersion: "",
  fusionLevelBefore: null,
  fusionLevelAfter: null,
  // expansion
  emotion: "from the cache",
  bodySensation: "",
  intensityBefore: null,
  intensityAfter: null,
  struggleSwitchOn: null,
  discomfortType: null,
  // connection
  technique: "noticeFiveThings",
  activityContext: "",
  noticesFromSenses: "from the cache",
  durationMinutes: null,
  moodAfter: null,
  // observing self
  whatWasObserved: "from the cache",
  // committed action
  lifeDomain: "work",
  title: "from the cache",
  description: "",
  status: "completed",
  targetDate: null,
  obstacles: "",
};

function pageResult(rows: unknown[] | undefined) {
  return { data: rows ? { pages: [rows], pageParams: [null] } : undefined };
}

/**
 * `[label, screen, the hook the list screen fills, the single-row hook, the plain list
 * hook the detail used to probe]`.
 */
const DETAILS = [
  [
    "choice point",
    ActChoicePointDetailScreen,
    "useChoicePointPages",
    "useChoicePoint",
    "useChoicePoints",
  ],
  [
    "connection",
    ActConnectionDetailScreen,
    "useConnectionLogPages",
    "useConnectionLog",
    "useConnectionLogs",
  ],
  ["defusion", ActDefusionDetailScreen, "useDefusionLogPages", "useDefusionLog", "useDefusionLogs"],
  [
    "expansion",
    ActExpansionDetailScreen,
    "useExpansionLogPages",
    "useExpansionLog",
    "useExpansionLogs",
  ],
  [
    "observing self",
    ActObservingSelfDetailScreen,
    "useObservingSelfSessionPages",
    "useObservingSelfSession",
    "useObservingSelfSessions",
  ],
  [
    "committed action",
    ActCommittedActionDetailScreen,
    "useListedCommittedActions",
    "useCommittedAction",
    "useCommittedActions",
  ],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  for (const [, , listed, item] of DETAILS) {
    mocked[listed].mockReturnValue(pageResult(undefined));
    mocked[item].mockReturnValue({ data: null, isLoading: false });
  }
  // The committed-action probe returns a bare array, not pages — it is already the
  // flattened union of the three entries its list screen fills.
  mocked.useListedCommittedActions.mockReturnValue({ data: undefined });
});

describe.each(DETAILS)("the %s detail", (_label, Screen, listed, item, plainList) => {
  it("paints a tapped row from the entry its list screen filled, with the single-row read off", () => {
    mocked[listed].mockReturnValue(
      listed === "useListedCommittedActions" ? { data: [row] } : pageResult([row]),
    );

    renderWithProviders(<Screen />);

    expect(screen.getAllByText("from the cache").length).toBeGreaterThan(0);
    expect(mocked[item]).toHaveBeenCalledWith(null, null);
    // The unbounded, status-less committed-action read — and its five bounded-but-unfilled
    // siblings — is the read this probe replaced. It must not come back.
    expect(mocked[plainList]).not.toHaveBeenCalled();
  });

  it("falls back to the single-row read on a cold load, and only then", () => {
    mocked[item].mockReturnValue({ data: row, isLoading: false });

    renderWithProviders(<Screen />);

    expect(screen.getAllByText("from the cache").length).toBeGreaterThan(0);
    expect(mocked[item]).toHaveBeenCalledWith("user-1", "row-1");
    expect(mocked[plainList]).not.toHaveBeenCalled();
  });
});
