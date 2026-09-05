import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import DbtEmotionRecordDetailScreen from "./dbt-emotion-record-detail-screen";
import DbtEmotionRecordListScreen from "./dbt-emotion-record-list-screen";
import DbtEmotionRecordNewScreen from "./dbt-emotion-record-new-screen";
import {
  EMOTION_RECORD_PARTS,
  emptyEmotionRecordValues,
  filledEmotionRecordParts,
} from "./emotion-record-parts";
import {
  useDeleteEmotionRecord,
  useEmotionRecord,
  useEmotionRecordPages,
  useSaveEmotionRecord,
} from "@/src/features/dbt/queries";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { consumeThoughtRecordSeed } from "@/src/stores/thought-record-seed-store";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/dbt/emotions/new";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useSaveEmotionRecord: jest.fn(),
  useEmotionRecordPages: jest.fn(),
  useEmotionRecord: jest.fn(),
  useDeleteEmotionRecord: jest.fn(),
}));

const saveAsync = jest.fn().mockResolvedValue({});
const deleteAsync = jest.fn().mockResolvedValue(undefined);

const RECORD = {
  id: "rec-1",
  userId: "user-1",
  whatHappened: "She did not reply for three days",
  meaning: "She has decided I am not worth it",
  primaryEmotions: ["sad", "my-own-word"],
  secondaryEmotions: ["ashamed"],
  bodySensations: "tight chest",
  urges: "delete the thread",
  didAndSaid: "nothing",
  afterwards: "felt worse by the evening",
  createdAt: "2026-06-03T21:30:00.000Z",
  createdOffsetMinutes: 180,
  dayKey: "2026-06-04",
  updatedAt: "2026-06-03T21:30:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/modules/dbt/emotions/new";
  consumeThoughtRecordSeed();
  (useSaveEmotionRecord as unknown as jest.Mock).mockReturnValue({
    mutateAsync: saveAsync,
    isPending: false,
  });
  (useDeleteEmotionRecord as unknown as jest.Mock).mockReturnValue({
    mutateAsync: deleteAsync,
    isPending: false,
  });
  (useEmotionRecord as unknown as jest.Mock).mockReturnValue({ data: RECORD, isPending: false });
  (useEmotionRecordPages as unknown as jest.Mock).mockReturnValue({
    data: { pages: [[RECORD]] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    refetch: jest.fn(),
  });
});

// ---------------------------------------------------------------------------
// The parts, pure.
// ---------------------------------------------------------------------------
describe("the emotion record's parts", () => {
  it("has six, each with a name and a hint in the copy", () => {
    expect(EMOTION_RECORD_PARTS).toHaveLength(6);
    for (const part of EMOTION_RECORD_PARTS) {
      expect((enDbt.emotions.parts as Record<string, string>)[part]).toBeTruthy();
      expect((enDbt.emotions.hints as Record<string, string>)[part]).toBeTruthy();
    }
  });

  it("counts nothing filled on an empty record", () => {
    const filled = filledEmotionRecordParts(emptyEmotionRecordValues());
    expect(Object.values(filled).every((value) => value === false)).toBe(true);
  });

  /**
   * Feelings lights as soon as ANY of its three halves has something in it. A
   * part that only lit when every optional field was answered would read as a
   * demand rather than as a summary of what is there.
   */
  it("lights the feelings part from any one of its three halves", () => {
    const base = emptyEmotionRecordValues();
    expect(filledEmotionRecordParts({ ...base, primaryEmotions: ["sad"] }).feelings).toBe(true);
    expect(filledEmotionRecordParts({ ...base, secondaryEmotions: ["guilty"] }).feelings).toBe(
      true,
    );
    expect(filledEmotionRecordParts({ ...base, bodySensations: "tight" }).feelings).toBe(true);
  });

  it("does not count whitespace as an answer", () => {
    const filled = filledEmotionRecordParts({ ...emptyEmotionRecordValues(), urges: "   " });
    expect(filled.urges).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The form.
// ---------------------------------------------------------------------------
describe("the emotion record form", () => {
  it("puts all six parts on screen at once, with nothing to advance", () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    for (const part of EMOTION_RECORD_PARTS) {
      const label = (enDbt.emotions.parts as Record<string, string>)[part]!;
      expect(screen.getAllByText(new RegExp(label)).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/^Next$/)).toBeNull();
  });

  /**
   * ☠️ S2. The cap line is plain copy under the bar: it is not a question, it
   * gates nothing, and no answer anywhere changes what this form shows.
   */
  it("carries the cap line as a statement, and the crisis bar above it", () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
    expect(screen.getByText("If right now feels too heavy, this can wait")).toBeTruthy();
    expect(enDbt.emotions.capLine).not.toMatch(/\?/);
  });

  /**
   * ☠️ No rating of any kind - no intensity, no before-and-after. Nothing in
   * the app reads one, and a number nobody reads is a score to be compared
   * against. The whole namespace is checked, not just this screen, because the
   * copy is where a rating would announce itself first.
   */
  it("asks for no rating anywhere in the record", () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    expect(screen.queryByText(/out of 10|intensity|rate |how strong/i)).toBeNull();
    expect(JSON.stringify(enDbt.emotions)).not.toMatch(/intensity|out of 10|0-10/i);
  });

  it("refuses to save without what happened, and says which part is missing", async () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    fireEvent.press(screen.getByText("Save record"));

    expect(await screen.findByText("Add what happened to save this record")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  it("refuses to save without a first feeling", async () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    fireEvent.changeText(screen.getByLabelText("What happened"), "Missed the bus");
    fireEvent.press(screen.getByText("Save record"));

    expect(await screen.findByText("Pick one first feeling")).toBeTruthy();
    expect(saveAsync).not.toHaveBeenCalled();
  });

  it("saves the record with its captured offset once both are answered", async () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    fireEvent.changeText(screen.getByLabelText("What happened"), "Missed the bus");
    fireEvent.press(screen.getByLabelText("First feeling: Anxious"));
    fireEvent.press(screen.getByText("Save record"));

    await waitFor(() => expect(saveAsync).toHaveBeenCalledTimes(1));
    expect(saveAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        whatHappened: "Missed the bus",
        primaryEmotions: ["anxious"],
        createdOffsetMinutes: expect.any(Number),
      }),
    );
    expect(router.replace).toHaveBeenCalledWith("/modules/dbt/emotions");
  });

  it("counts the parts the person has filled in", () => {
    renderWithProviders(<DbtEmotionRecordNewScreen />);

    expect(screen.getByText("0 of 6 parts filled in")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("What happened"), "Missed the bus");
    expect(screen.getByText("1 of 6 parts filled in")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// The list.
// ---------------------------------------------------------------------------
describe("the emotion record list", () => {
  beforeEach(() => {
    mockPathname = "/modules/dbt/emotions";
  });

  it("shows each record by its first line, and a way to write a new one", () => {
    renderWithProviders(<DbtEmotionRecordListScreen />);

    expect(screen.getByText("She did not reply for three days")).toBeTruthy();
    expect(screen.getByText("New emotion record")).toBeTruthy();
  });

  /**
   * ☠️ A failed read is not an empty history: telling someone their own work
   * is gone is worse than telling them the read failed.
   */
  it("shows an error rather than an empty state when the read failed", () => {
    (useEmotionRecordPages as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isError: true,
      isFetchingNextPage: false,
      isPending: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<DbtEmotionRecordListScreen />);

    expect(screen.queryByText("Nothing recorded yet.")).toBeNull();
  });

  it("keeps no counts", () => {
    renderWithProviders(<DbtEmotionRecordListScreen />);

    expect(screen.queryByText(/\d+ records?\b|this week|streak/i)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The detail, and its one door.
// ---------------------------------------------------------------------------
describe("the emotion record detail", () => {
  beforeEach(() => {
    mockPathname = "/modules/dbt/emotions/rec-1";
  });

  it("reads the record back, in the frame it was written in", () => {
    renderWithProviders(<DbtEmotionRecordDetailScreen id="rec-1" />);

    expect(screen.getByText("She did not reply for three days")).toBeTruthy();
    expect(screen.getByText("delete the thread")).toBeTruthy();
    expect(screen.getByText("felt worse by the evening")).toBeTruthy();
  });

  /**
   * ☠️ The seed travels in memory, never as a route parameter: Expo Router
   * serialises params into the web address bar, and a person's emotions in a
   * URL is health data on the navigation path (#739). And only BUILT-IN ids
   * cross - a custom emotion is the person's own word and has no counterpart
   * in the thought record's fixed list.
   */
  it("hands the whole picture to a thought record, in memory and built-ins only", () => {
    renderWithProviders(<DbtEmotionRecordDetailScreen id="rec-1" />);

    fireEvent.press(screen.getByText("Look at the whole picture"));

    expect(consumeThoughtRecordSeed()).toEqual({
      emotions: ["sad", "ashamed"],
      situation: "She did not reply for three days",
    });
    // `push`, never `replace`: the record must still be there to come back to.
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("offers delete behind a confirmation, and nothing to edit", () => {
    renderWithProviders(<DbtEmotionRecordDetailScreen id="rec-1" />);

    expect(screen.getByText("Delete this record")).toBeTruthy();
    expect(screen.queryByText(/^Edit$/)).toBeNull();
  });

  it("says so plainly when the record is gone", () => {
    (useEmotionRecord as unknown as jest.Mock).mockReturnValue({ data: null, isPending: false });
    renderWithProviders(<DbtEmotionRecordDetailScreen id="rec-1" />);

    expect(screen.getByText("That record is not here any more.")).toBeTruthy();
  });
});
