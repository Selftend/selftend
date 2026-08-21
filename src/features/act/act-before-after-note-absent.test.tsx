import { fireEvent, screen } from "@testing-library/react-native";

import ActDefusionDetailScreen from "@/src/features/act/act-defusion-detail-screen";
import ActDefusionNewScreen from "@/src/features/act/act-defusion-new-screen";
import ActExpansionDetailScreen from "@/src/features/act/act-expansion-detail-screen";
import ActExpansionNewScreen from "@/src/features/act/act-expansion-new-screen";
import {
  useDefusionLog,
  useDefusionLogs,
  useExpansionLog,
  useExpansionLogs,
} from "@/src/features/act/queries";
import { useActDefusionDraftStore } from "@/src/stores/act-defusion-draft-store";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The before/after note is gone from ALL FOUR screens that carried it (#1367).
 *
 * Two strings shipped a false claim - `act:defusion.noFusionDrop` and
 * `act:expansion.noIntensityDrop`, both guarded `after < before`, so **equal or
 * higher** fell into the "no drop" branch: a user whose fusion went 60 -> 70 was
 * told it "stayed at 70", in a bold centred card, in both locales.
 *
 * The fix is not a third branch. The card goes from all four screens and nothing
 * replaces it - which is what makes the false branch unauthorable. The drop
 * branches go too: they were true, but they only restated two numbers the screen
 * already shows.
 *
 * ☠️ Before this file, ZERO tests asserted on any of the four strings, so
 * deleting the card from three screens and missing the fourth was invisible to
 * the suite. Every screen is rendered here, at every shape the retired guard
 * split on, and each absence assertion is paired with a positive control - the
 * value the note used to sit under - so a screen that failed to render cannot
 * pass by rendering nothing at all.
 *
 * This file covers four screens, so it is named for the behaviour rather than
 * for any one of them: `act-defusion-new-screen`, `act-defusion-detail-screen`,
 * `act-expansion-new-screen`, `act-expansion-detail-screen`.
 *
 * ⚠️ Its sibling guard is `test/restraint-copy.test.ts`, which scans the locale
 * JSON for the same phrasings. Neither subsumes the other: that one cannot see a
 * sentence hardcoded in a component, and this one cannot see a string no screen
 * renders yet. A fifth phrasing belongs in both.
 */
/**
 * The note in every form it could come back in.
 *
 * ☠️ The sentences alone are NOT enough, and a three-of-four deletion is exactly
 * how you find that out. If the keys are retired but one screen keeps its JSX,
 * i18next has nothing to resolve and renders the **key** - `defusion.noFusionDrop`
 * - which no amount of "stayed at" matching will ever see. So the key names are
 * part of the pattern: `fusionDrop` covers `noFusionDrop` too, and likewise for
 * intensity.
 */
const NOTE_PHRASING = /stayed at|dropped from|остана на|падна от|fusionDrop|intensityDrop/i;

/**
 * The offending sentences as plain text.
 *
 * ☠️ Asserting on the RNTL nodes themselves (`expect(queryAllByText(...)).toEqual([])`)
 * reports a *failure* as `Unexpected console.warn: ... isMounted`, because jest's
 * diff printer walks the node and touches React's deprecated `isMounted` getter,
 * which `test/setup.js` turns into a throw. The real assertion is lost. Reducing
 * to strings first keeps a red run readable.
 */
function noteSentences(): string[] {
  return screen.queryAllByText(NOTE_PHRASING).map((node) => String(node.props.children));
}

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  useLocalSearchParams: () => ({ id: "log-1" }),
  usePathname: () => "/modules/act",
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24" }),
  loggedAtForSelectedDate: () => "2026-05-24T09:00:00.000Z",
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

jest.mock("@/src/features/act/queries", () => ({
  useDefusionLog: jest.fn(),
  useDefusionLogs: jest.fn(),
  useDeleteDefusionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSaveDefusionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useExpansionLog: jest.fn(),
  useExpansionLogs: jest.fn(),
  useDeleteExpansionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useSaveExpansionLog: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

const mockUseDefusionLog = useDefusionLog as jest.MockedFunction<typeof useDefusionLog>;
const mockUseDefusionLogs = useDefusionLogs as jest.MockedFunction<typeof useDefusionLogs>;
const mockUseExpansionLog = useExpansionLog as jest.MockedFunction<typeof useExpansionLog>;
const mockUseExpansionLogs = useExpansionLogs as jest.MockedFunction<typeof useExpansionLogs>;

const FUSION_BEFORE_LABEL = "How strongly is this thought pulling you right now?";
const FUSION_AFTER_LABEL = "How strongly is it pulling you now?";
const INTENSITY_BEFORE_LABEL = "How intense is the feeling right now?";
const INTENSITY_AFTER_LABEL = "How intense is it now?";

function defusionLog(fusionLevelBefore: number, fusionLevelAfter: number) {
  return {
    id: "log-1",
    userId: "user-1",
    fusedThought: "I always fail",
    thoughtCategory: "selfJudgment",
    techniqueUsed: "havingTheThoughtThat",
    defusedVersion: "",
    fusionLevelBefore,
    fusionLevelAfter,
    notes: "",
    createdAt: "2026-05-24T09:00:00.000Z",
    updatedAt: "2026-05-24T09:00:00.000Z",
  };
}

function expansionLog(intensityBefore: number, intensityAfter: number) {
  return {
    id: "log-1",
    userId: "user-1",
    emotion: "dread",
    bodySensation: "",
    intensityBefore,
    intensityAfter,
    struggleSwitchOn: null,
    discomfortType: null,
    techniqueUsed: "makingRoom",
    notes: "",
    createdAt: "2026-05-24T09:00:00.000Z",
    updatedAt: "2026-05-24T09:00:00.000Z",
  };
}

/** The three shapes the retired `after < before` guard split on. */
const PAIRS: [label: string, before: number, after: number][] = [
  ["rose", 60, 70],
  ["held", 60, 60],
  ["fell", 70, 60],
];

beforeEach(() => {
  jest.clearAllMocks();
  useActDefusionDraftStore.getState().reset();
});

describe.each(PAIRS)("a defusion record whose fusion %s", (_shape, before, after) => {
  it("renders no note under the pair on the detail screen", () => {
    mockUseDefusionLogs.mockReturnValue({
      data: [defusionLog(before, after)],
      isLoading: false,
    } as unknown as ReturnType<typeof useDefusionLogs>);
    mockUseDefusionLog.mockReturnValue({
      data: defusionLog(before, after),
      isLoading: false,
    } as unknown as ReturnType<typeof useDefusionLog>);

    renderWithProviders(<ActDefusionDetailScreen />);

    // The pair is still readable: before and after each keep their own card, so
    // nothing the deleted sentence restated has left the screen.
    expect(screen.getByText(FUSION_BEFORE_LABEL)).toBeTruthy();
    expect(screen.getByText(FUSION_AFTER_LABEL)).toBeTruthy();
    expect(screen.getAllByText(`${before} / 100`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`${after} / 100`).length).toBeGreaterThan(0);

    expect(noteSentences()).toEqual([]);
  });
});

describe.each(PAIRS)("an expansion record whose intensity %s", (_shape, before, after) => {
  it("renders no note under the pair on the detail screen", () => {
    mockUseExpansionLogs.mockReturnValue({
      data: [expansionLog(before, after)],
      isLoading: false,
    } as unknown as ReturnType<typeof useExpansionLogs>);
    mockUseExpansionLog.mockReturnValue({
      data: expansionLog(before, after),
      isLoading: false,
    } as unknown as ReturnType<typeof useExpansionLog>);

    renderWithProviders(<ActExpansionDetailScreen />);

    expect(screen.getByText(INTENSITY_BEFORE_LABEL)).toBeTruthy();
    expect(screen.getByText(INTENSITY_AFTER_LABEL)).toBeTruthy();
    expect(screen.getAllByText(`${before} / 100`).length).toBeGreaterThan(0);
    expect(screen.getAllByText(`${after} / 100`).length).toBeGreaterThan(0);

    expect(noteSentences()).toEqual([]);
  });
});

describe.each(PAIRS)("a defusion entry whose fusion %s", (_shape, before, after) => {
  it("renders no note under the pair on the new screen", async () => {
    renderWithProviders(<ActDefusionNewScreen />);

    // Step 1: the thought - the only step whose Continue is gated on input.
    fireEvent.changeText(await screen.findByLabelText("What is the thought?"), "I always fail");
    fireEvent.press(screen.getByText("Continue"));
    // Step 2: category arrives pre-answered.
    fireEvent.press(screen.getByText("Continue"));
    // Step 3: fusion before.
    fireEvent.press(screen.getByText(String(before)));
    fireEvent.press(screen.getByText("Continue"));
    // Step 4: technique arrives pre-answered.
    fireEvent.press(screen.getByText("Continue"));
    // Step 5: fusion after - the step the note used to render on.
    fireEvent.press(screen.getByText(String(after)));

    expect(screen.getByText(FUSION_AFTER_LABEL)).toBeTruthy();
    expect(noteSentences()).toEqual([]);
  });
});

describe.each(PAIRS)("an expansion entry whose intensity %s", (_shape, before, after) => {
  it("renders no note under the pair on the new screen", async () => {
    renderWithProviders(<ActExpansionNewScreen />);

    // Step 1 carries both the emotion and the before rating.
    fireEvent.changeText(await screen.findByLabelText("What emotion is present?"), "dread");
    fireEvent.press(screen.getByText(String(before)));
    fireEvent.press(screen.getByText("Continue"));
    // Steps 2-4: body, struggle switch and technique all arrive pre-answered.
    fireEvent.press(screen.getByText("Continue"));
    fireEvent.press(screen.getByText("Continue"));
    fireEvent.press(screen.getByText("Continue"));
    // Step 5: intensity after - the step the note used to render on.
    fireEvent.press(screen.getByText(String(after)));

    expect(screen.getByText(INTENSITY_AFTER_LABEL)).toBeTruthy();
    expect(noteSentences()).toEqual([]);
  });
});
