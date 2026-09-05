import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import DbtJudgementDetailScreen from "./dbt-judgement-detail-screen";
import DbtJudgementListScreen from "./dbt-judgement-list-screen";
import DbtJudgementNewScreen from "./dbt-judgement-new-screen";
import DbtWiseMindDetailScreen from "./dbt-wise-mind-detail-screen";
import DbtWiseMindListScreen from "./dbt-wise-mind-list-screen";
import DbtWiseMindNewScreen from "./dbt-wise-mind-new-screen";
import {
  useDeleteJudgement,
  useDeleteWiseMindCheckin,
  useJudgement,
  useJudgementPages,
  useSaveJudgement,
  useSaveWiseMindCheckin,
  useWiseMindCheckin,
  useWiseMindCheckinPages,
} from "@/src/features/dbt/queries";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { useActDefusionLogDraftStore } from "@/src/stores/act-defusion-log-draft-store";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/dbt/wise-mind/new";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useSaveWiseMindCheckin: jest.fn(),
  useWiseMindCheckinPages: jest.fn(),
  useWiseMindCheckin: jest.fn(),
  useDeleteWiseMindCheckin: jest.fn(),
  useSaveJudgement: jest.fn(),
  useJudgementPages: jest.fn(),
  useJudgement: jest.fn(),
  useDeleteJudgement: jest.fn(),
}));

const saveCheckin = jest.fn().mockResolvedValue({});
const saveJudgement = jest.fn().mockResolvedValue({});

const CHECKIN = {
  id: "wm-1",
  userId: "user-1",
  question: "Should I go to the thing tonight?",
  emotionMind: "Stay in",
  reason: "I said I would",
  wiseMind: "Go, and leave early if I need to",
  createdAt: "2026-06-03T21:30:00.000Z",
  createdOffsetMinutes: 180,
  dayKey: "2026-06-04",
  updatedAt: "2026-06-03T21:30:00.000Z",
};

const JUDGEMENT = {
  id: "j-1",
  userId: "user-1",
  judgement: "She is ignoring me",
  restatement: "She has not replied since Tuesday",
  valence: "negative" as const,
  createdAt: "2026-06-03T21:30:00.000Z",
  createdOffsetMinutes: 180,
  dayKey: "2026-06-04",
  updatedAt: "2026-06-03T21:30:00.000Z",
};

const pages = (rows: unknown[]) => ({
  data: { pages: [rows] },
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  isError: false,
  isFetchingNextPage: false,
  isPending: false,
  refetch: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/modules/dbt/wise-mind/new";
  useActDefusionLogDraftStore.getState().reset();
  (useSaveWiseMindCheckin as unknown as jest.Mock).mockReturnValue({
    mutateAsync: saveCheckin,
    isPending: false,
  });
  (useSaveJudgement as unknown as jest.Mock).mockReturnValue({
    mutateAsync: saveJudgement,
    isPending: false,
  });
  (useDeleteWiseMindCheckin as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  (useDeleteJudgement as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  (useWiseMindCheckin as unknown as jest.Mock).mockReturnValue({
    data: CHECKIN,
    isPending: false,
  });
  (useJudgement as unknown as jest.Mock).mockReturnValue({ data: JUDGEMENT, isPending: false });
  (useWiseMindCheckinPages as unknown as jest.Mock).mockReturnValue(pages([CHECKIN]));
  (useJudgementPages as unknown as jest.Mock).mockReturnValue(pages([JUDGEMENT]));
});

// ---------------------------------------------------------------------------
// The wise mind check-in.
// ---------------------------------------------------------------------------
describe("the wise mind check-in", () => {
  function walkToAsk() {
    fireEvent.press(screen.getByText("Start"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.changeText(screen.getByLabelText("What am I deciding?"), "Go tonight?");
    fireEvent.press(screen.getByText("Next"));
  }

  it("names the triad once, on the way in, as Linehan's term", () => {
    renderWithProviders(<DbtWiseMindNewScreen />);

    expect(screen.getByText(/Marsha Linehan/)).toBeTruthy();
    expect(screen.getByText("Emotion mind decides by how things feel.")).toBeTruthy();
    expect(screen.getByText("Reason decides by the facts.")).toBeTruthy();
  });

  /**
   * ☠️ No claim about a gut or an intuition, and nothing is "the right answer".
   * Wise mind is where feeling and thinking meet - a description of a way of
   * deciding, not a faculty that knows things.
   */
  it("claims no gut, no intuition and no right answer", () => {
    const copy = JSON.stringify(enDbt.wiseMind);
    expect(copy).not.toMatch(/\bgut\b|intuition|the right answer|enteric/i);
  });

  it("keeps Stop and the crisis bar on every beat", () => {
    renderWithProviders(<DbtWiseMindNewScreen />);

    for (let beat = 0; beat < 5; beat += 1) {
      expect(screen.getByText("Stop")).toBeTruthy();
      expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
      const advance = screen.queryByText("Start") ?? screen.queryByText("Next");
      if (!advance) break;
      // The question beat is the fourth (intro, settle, breathe, question),
      // and it will not advance empty.
      if (beat === 3) {
        fireEvent.changeText(screen.getByLabelText("What am I deciding?"), "Go tonight?");
      }
      fireEvent.press(advance);
    }
  });

  it("will not move past the question until there is one", () => {
    renderWithProviders(<DbtWiseMindNewScreen />);

    fireEvent.press(screen.getByText("Start"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));

    expect(screen.getByText("Write the question first")).toBeTruthy();
    expect(screen.getByLabelText("What am I deciding?")).toBeTruthy();
  });

  it("saves the question with whichever of the three answers were heard", async () => {
    renderWithProviders(<DbtWiseMindNewScreen />);
    walkToAsk();

    fireEvent.changeText(screen.getByLabelText("Wise mind says"), "Go, leave early");
    fireEvent.press(screen.getByText("Save check-in"));

    await waitFor(() => expect(saveCheckin).toHaveBeenCalledTimes(1));
    expect(saveCheckin).toHaveBeenCalledWith(
      expect.objectContaining({
        question: "Go tonight?",
        wiseMind: "Go, leave early",
        emotionMind: "",
        reason: "",
        createdOffsetMinutes: expect.any(Number),
      }),
    );
  });

  it("leaves at once on Stop, with nothing saved", () => {
    renderWithProviders(<DbtWiseMindNewScreen />);
    walkToAsk();

    fireEvent.press(screen.getByText("Stop"));

    expect(saveCheckin).not.toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });

  it("lists check-ins by their question, with no tally of any kind", () => {
    mockPathname = "/modules/dbt/wise-mind";
    renderWithProviders(<DbtWiseMindListScreen />);

    expect(screen.getByText("Should I go to the thing tonight?")).toBeTruthy();
    expect(screen.queryByText(/\d+ check-ins?|chose wisely|streak/i)).toBeNull();
  });

  /**
   * ☠️ No outcome field and no later prompt: a record with a waiting slot is a
   * surface engineered to be reopened (ADR-0004).
   */
  it("reads a check-in back with nothing left to fill in later", () => {
    mockPathname = "/modules/dbt/wise-mind/wm-1";
    renderWithProviders(<DbtWiseMindDetailScreen id="wm-1" />);

    expect(screen.getByText("Should I go to the thing tonight?")).toBeTruthy();
    expect(screen.getByText("Go, and leave early if I need to")).toBeTruthy();
    expect(screen.queryByText(/how did it go|outcome|did it work/i)).toBeNull();
    expect(JSON.stringify(enDbt.wiseMind)).not.toMatch(/outcome|how did it go/i);
  });
});

// ---------------------------------------------------------------------------
// The judgement record.
// ---------------------------------------------------------------------------
describe("the judgement record", () => {
  beforeEach(() => {
    mockPathname = "/modules/dbt/judgements/new";
  });

  it("is three fields and one tap, with the bar above them", () => {
    renderWithProviders(<DbtJudgementNewScreen />);

    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
    expect(screen.getByLabelText("The judgement")).toBeTruthy();
    expect(screen.getByLabelText("What was actually there")).toBeTruthy();
    expect(screen.getByText("Save judgement")).toBeTruthy();
  });

  it("marks which way a judgement leans, defaulting to negative", async () => {
    renderWithProviders(<DbtJudgementNewScreen />);

    fireEvent.changeText(screen.getByLabelText("The judgement"), "She is ignoring me");
    fireEvent.press(screen.getByText("Save judgement"));

    await waitFor(() => expect(saveJudgement).toHaveBeenCalledTimes(1));
    expect(saveJudgement).toHaveBeenCalledWith(
      expect.objectContaining({ judgement: "She is ignoring me", valence: "negative" }),
    );
  });

  /** The beginner's-mind record, folded in as a valence rather than a second tool. */
  it("records a glowing judgement on the same record", async () => {
    renderWithProviders(<DbtJudgementNewScreen />);

    fireEvent.changeText(screen.getByLabelText("The judgement"), "He is perfect");
    fireEvent.press(screen.getByText("Positive"));
    fireEvent.press(screen.getByText("Save judgement"));

    await waitFor(() => expect(saveJudgement).toHaveBeenCalledTimes(1));
    expect(saveJudgement).toHaveBeenCalledWith(expect.objectContaining({ valence: "positive" }));
  });

  it("refuses to save an empty judgement", async () => {
    renderWithProviders(<DbtJudgementNewScreen />);

    fireEvent.press(screen.getByText("Save judgement"));

    expect(await screen.findByText("Write the judgement first")).toBeTruthy();
    expect(saveJudgement).not.toHaveBeenCalled();
  });

  /** ☠️ No `where`: the module builds no pattern view, so a location column would be a health fact with no reader (S3). */
  it("asks for no location", () => {
    renderWithProviders(<DbtJudgementNewScreen />);

    expect(screen.queryByText(/where|location|place/i)).toBeNull();
    expect(JSON.stringify(enDbt.judgements)).not.toMatch(/\bwhere were you\b|location/i);
  });

  it("groups the history by day and counts nothing", () => {
    mockPathname = "/modules/dbt/judgements";
    renderWithProviders(<DbtJudgementListScreen />);

    expect(screen.getByText("She is ignoring me")).toBeTruthy();
    expect(screen.queryByText(/you caught \d+|\d+ this week|streak/i)).toBeNull();
  });

  /**
   * ☠️ The seed goes through ACT's own draft store, in memory - never a route
   * parameter, which would put the person's judgement in the web address bar
   * (#739). Neither the ACT form nor the journal takes one.
   */
  it("unhooks into ACT defusion, seeded in memory as a self-judgment", () => {
    mockPathname = "/modules/dbt/judgements/j-1";
    renderWithProviders(<DbtJudgementDetailScreen id="j-1" />);

    fireEvent.press(screen.getByText("Unhook from it"));

    expect(useActDefusionLogDraftStore.getState().values).toMatchObject({
      fusedThought: "She is ignoring me",
      thoughtCategory: "selfJudgment",
      techniqueUsed: null,
    });
  });

  it("says so plainly when the judgement is gone", () => {
    mockPathname = "/modules/dbt/judgements/j-1";
    (useJudgement as unknown as jest.Mock).mockReturnValue({ data: null, isPending: false });
    renderWithProviders(<DbtJudgementDetailScreen id="j-1" />);

    expect(screen.getByText("That judgement is not here any more.")).toBeTruthy();
  });
});

/** ⚠️ UI spelling is **Judgement**, in every English string the module ships. */
describe("the module's spelling of judgement", () => {
  it("never writes the American form", () => {
    expect(JSON.stringify(enDbt)).not.toMatch(/judgment/i);
  });
});
