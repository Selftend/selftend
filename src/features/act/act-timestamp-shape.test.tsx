import { screen } from "@testing-library/react-native";

import ActChoicePointListScreen from "@/src/features/act/act-choice-point-list-screen";
import ActConnectionListScreen from "@/src/features/act/act-connection-list-screen";
import ActDefusionListScreen from "@/src/features/act/act-defusion-list-screen";
import ActExpansionListScreen from "@/src/features/act/act-expansion-list-screen";
import ActObservingSelfListScreen from "@/src/features/act/act-observing-self-list-screen";
import ActUrgeSurfScreen from "@/src/features/act/act-urge-surf-screen";
import ActChoicePointDetailScreen from "@/src/features/act/act-choice-point-detail-screen";
import ActConnectionDetailScreen from "@/src/features/act/act-connection-detail-screen";
import ActDefusionDetailScreen from "@/src/features/act/act-defusion-detail-screen";
import ActExpansionDetailScreen from "@/src/features/act/act-expansion-detail-screen";
import ActObservingSelfDetailScreen from "@/src/features/act/act-observing-self-detail-screen";
import ActUrgeSurfDetailScreen from "@/src/features/act/act-urge-surf-detail-screen";
import * as queries from "@/src/features/act/queries";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * #1539: ACT's archive rows read compact, its detail screens read absolute, and both
 * resolve a `null` offset in the viewer's frame.
 *
 * ☠️ One file for twelve surfaces on purpose. This is a single decision applied twelve
 * times, and ACT was previously the only module rendering ONE absolute string on both
 * its rows and its details. Split across twelve files, a later edit regresses half the
 * decision invisibly; here the shape of the file is the shape of the ruling.
 *
 * ☠️ Nothing in ACT asserted a rendered timestamp before this file (only
 * `defusion-log-row.test.tsx` matched a bare `/2026/`), so the shape was unpinned.
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

jest.mock("@/src/features/act/queries", () => ({
  useChoicePointPages: jest.fn(),
  useConnectionLogPages: jest.fn(),
  useDefusionLogPages: jest.fn(),
  useExpansionLogPages: jest.fn(),
  useObservingSelfSessionPages: jest.fn(),
  useUrgeSurfLogPages: jest.fn(),
  useChoicePoints: jest.fn(),
  useConnectionLogs: jest.fn(),
  useDefusionLogs: jest.fn(),
  useExpansionLogs: jest.fn(),
  useObservingSelfSessions: jest.fn(),
  useChoicePoint: jest.fn(),
  useConnectionLog: jest.fn(),
  useDefusionLog: jest.fn(),
  useExpansionLog: jest.fn(),
  useObservingSelfSession: jest.fn(),
  useUrgeSurfLog: jest.fn(),
  useSaveUrgeSurfLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteChoicePoint: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteConnectionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteDefusionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteExpansionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteObservingSelfSession: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

/**
 * The runner is pinned to Asia/Kolkata (`jest.config.js`), deliberately non-UTC and
 * non-whole-hour. ACT captures no offset, so every timestamp below resolves through the
 * `null` branch into that viewer frame — 04:00Z reads as 9:30 AM, which is exactly the
 * fallback #1513 requires ACT to take.
 */
const NOW = new Date("2026-05-24T12:00:00.000Z");
/** Same Kolkata day as NOW. */
const TODAY_AT = "2026-05-24T04:00:00.000Z";
/** Fourteen days back: past the compact form's weekday window, inside the same year. */
const OLD_AT = "2026-05-10T04:00:00.000Z";

const COMPACT_TODAY = "9:30 AM";
const COMPACT_OLD = "May 10";
const ABSOLUTE_TODAY = "May 24, 2026, 9:30 AM";
const ABSOLUTE_OLD = "May 10, 2026, 9:30 AM";

function pageResult(rows: unknown[]) {
  return {
    data: { pages: [rows], pageParams: [null] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: jest.fn(),
  };
}

const mocked = queries as unknown as Record<string, jest.Mock>;

const PAGE_HOOKS = [
  "useChoicePointPages",
  "useConnectionLogPages",
  "useDefusionLogPages",
  "useExpansionLogPages",
  "useObservingSelfSessionPages",
  "useUrgeSurfLogPages",
];

const LIST_HOOKS = [
  "useChoicePoints",
  "useConnectionLogs",
  "useDefusionLogs",
  "useExpansionLogs",
  "useObservingSelfSessions",
];

const ITEM_HOOKS = [
  "useChoicePoint",
  "useConnectionLog",
  "useDefusionLog",
  "useExpansionLog",
  "useObservingSelfSession",
  "useUrgeSurfLog",
];

/** Every paged and list read returns the given rows; every single-row read misses. */
function feed(rows: unknown[]) {
  for (const name of PAGE_HOOKS) mocked[name].mockReturnValue(pageResult(rows));
  // `useCachedItem` reads the list hook first, so the detail screens paint from here.
  for (const name of LIST_HOOKS) mocked[name].mockReturnValue({ data: rows });
  for (const name of ITEM_HOOKS) mocked[name].mockReturnValue({ data: null, isLoading: false });
}

/**
 * One row shaped for every feed at once. Each screen reads only its own fields, so a
 * union fixture keeps the twelve cases on one clock and one instant.
 */
const row = (createdAt: string) => ({
  id: "row-1",
  userId: "user-1",
  createdAt,
  updatedAt: createdAt,
  notes: "",
  // choice point
  hooks: ["a hook"],
  awayMoves: [],
  towardMoves: [],
  // defusion
  fusedThought: "a thought",
  thoughtCategory: "selfJudgment",
  techniqueUsed: "havingTheThoughtThat",
  defusedVersion: "",
  fusionLevelBefore: null,
  fusionLevelAfter: null,
  // expansion
  emotion: "an emotion",
  bodySensation: "",
  intensityBefore: null,
  intensityAfter: null,
  struggleSwitchOn: null,
  discomfortType: null,
  // connection
  technique: "noticeFiveThings",
  activityContext: "",
  noticesFromSenses: "a notice",
  durationMinutes: null,
  moodAfter: null,
  // observing self
  whatWasObserved: "an observation",
  // urge surf
  urgeDescription: "an urge",
  trigger: "",
  peakIntensity: null,
  surfingNotes: "",
  urgeActedOn: null,
  completedAt: createdAt,
});

const ARCHIVES = [
  ["choice point", ActChoicePointListScreen],
  ["connection", ActConnectionListScreen],
  ["defusion", ActDefusionListScreen],
  ["expansion", ActExpansionListScreen],
  ["observing self", ActObservingSelfListScreen],
  ["urge surf", ActUrgeSurfScreen],
] as const;

const DETAILS = [
  ["choice point", ActChoicePointDetailScreen],
  ["connection", ActConnectionDetailScreen],
  ["defusion", ActDefusionDetailScreen],
  ["expansion", ActExpansionDetailScreen],
  ["observing self", ActObservingSelfDetailScreen],
  ["urge surf", ActUrgeSurfDetailScreen],
] as const;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * #1515 made five of these screens each tool's archive in place and #1517 added urge
 * surf's. At #1516's page size of 20 most rows share a date, so the absolute form
 * repeats the same eleven characters down the screen — the compact form's stated
 * purpose (#870) is precisely this list.
 */
describe("ACT archive rows read compact", () => {
  it.each(ARCHIVES)("%s shows today's entry as a bare time", (_name, Screen) => {
    feed([row(TODAY_AT)]);

    renderWithProviders(<Screen />);

    expect(screen.getByText(COMPACT_TODAY)).toBeTruthy();
    // The absolute form would carry a month and a year alongside the same time.
    expect(screen.queryByText(ABSOLUTE_TODAY)).toBeNull();
  });

  it.each(ARCHIVES)("%s shows an older entry as a bare date", (_name, Screen) => {
    feed([row(OLD_AT)]);

    renderWithProviders(<Screen />);

    expect(screen.getByText(COMPACT_OLD)).toBeTruthy();
    // Past the weekday window the compact form drops the time entirely.
    expect(screen.queryByText(/\d:\d\d/)).toBeNull();
  });
});

/**
 * Absolute on details, matching the detail screens of five other modules (journal,
 * meditation session, sleep, cbt activities, mood). One timestamp, no density
 * pressure, and no reason to make the reader convert "Wed 7:40 pm" back into a date.
 */
describe("ACT detail screens read absolute", () => {
  it.each(DETAILS)("%s names the full date and time", (_name, Screen) => {
    feed([row(TODAY_AT)]);

    renderWithProviders(<Screen />);

    expect(screen.getByText(ABSOLUTE_TODAY)).toBeTruthy();
  });

  it.each(DETAILS)("%s keeps the full date on an older entry too", (_name, Screen) => {
    feed([row(OLD_AT)]);

    renderWithProviders(<Screen />);

    expect(screen.getByText(ABSOLUTE_OLD)).toBeTruthy();
  });
});
