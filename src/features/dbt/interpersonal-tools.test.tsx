import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import DbtOppositeActionDetailScreen from "./dbt-opposite-action-detail-screen";
import DbtOppositeActionListScreen from "./dbt-opposite-action-list-screen";
import DbtOppositeActionNewScreen from "./dbt-opposite-action-new-screen";
import DbtScriptDetailScreen from "./dbt-script-detail-screen";
import DbtScriptListScreen from "./dbt-script-list-screen";
import DbtScriptNewScreen from "./dbt-script-new-screen";
import {
  EMOTIONS_WITH_GUIDANCE,
  OPPOSITE_ACTION_FAMILIES,
  familyForEmotion,
} from "./opposite-action-families";
import {
  useDeleteOppositeActionPlan,
  useDeleteScript,
  useMarkOppositeActionPlanDone,
  useMarkScriptDone,
  useOppositeActionPlan,
  useOppositeActionPlanPages,
  useSaveOppositeActionPlan,
  useSaveScript,
  useScript,
  useScriptPages,
} from "@/src/features/dbt/queries";
import { orderScriptsAsLadder } from "@/src/features/dbt/repository";
import type { Script } from "@/src/features/dbt/types";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/dbt/opposite-action/new";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => true), push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: jest.fn(),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/dbt/queries", () => ({
  useSaveOppositeActionPlan: jest.fn(),
  useOppositeActionPlanPages: jest.fn(),
  useOppositeActionPlan: jest.fn(),
  useMarkOppositeActionPlanDone: jest.fn(),
  useDeleteOppositeActionPlan: jest.fn(),
  useSaveScript: jest.fn(),
  useScriptPages: jest.fn(),
  useScript: jest.fn(),
  useMarkScriptDone: jest.fn(),
  useDeleteScript: jest.fn(),
}));

const savePlan = jest.fn().mockResolvedValue({});
const saveScript = jest.fn().mockResolvedValue({});
const markPlanDone = jest.fn().mockResolvedValue({ id: "p-1" });
const markScriptDone = jest.fn().mockResolvedValue({ id: "s-1" });

const PLAN = {
  id: "p-1",
  userId: "user-1",
  emotion: "angry",
  pull: "snap at him",
  oppositeAction: "soften my voice and step back",
  holdFor: "the whole conversation",
  whatShifted: "",
  createdAt: "2026-06-03T21:30:00.000Z",
  createdOffsetMinutes: 180,
  dayKey: "2026-06-04",
  doneAt: null as string | null,
  doneOffsetMinutes: null as number | null,
  doneDayKey: null as string | null,
  updatedAt: "2026-06-03T21:30:00.000Z",
};

const SCRIPT: Script = {
  id: "s-1",
  userId: "user-1",
  situation: "He is late without saying anything",
  wantChanged: "start",
  iThink: "You were late twice this week without a message",
  emotion: "frustrated",
  iFeel: "let down",
  iWant: "text me if you'll be late",
  selfCare: "I will eat without waiting",
  difficulty: 30,
  whenWhere: "Sunday, at home",
  howItWent: "",
  createdAt: "2026-06-03T21:30:00.000Z",
  createdOffsetMinutes: 180,
  dayKey: "2026-06-04",
  doneAt: null,
  doneOffsetMinutes: null,
  doneDayKey: null,
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
  mockPathname = "/modules/dbt/opposite-action/new";
  (useSaveOppositeActionPlan as unknown as jest.Mock).mockReturnValue({
    mutateAsync: savePlan,
    isPending: false,
  });
  (useSaveScript as unknown as jest.Mock).mockReturnValue({
    mutateAsync: saveScript,
    isPending: false,
  });
  (useMarkOppositeActionPlanDone as unknown as jest.Mock).mockReturnValue({
    mutateAsync: markPlanDone,
    isPending: false,
  });
  (useMarkScriptDone as unknown as jest.Mock).mockReturnValue({
    mutateAsync: markScriptDone,
    isPending: false,
  });
  (useDeleteOppositeActionPlan as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  (useDeleteScript as unknown as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  });
  (useOppositeActionPlan as unknown as jest.Mock).mockReturnValue({
    data: PLAN,
    isPending: false,
  });
  (useScript as unknown as jest.Mock).mockReturnValue({ data: SCRIPT, isPending: false });
  (useOppositeActionPlanPages as unknown as jest.Mock).mockReturnValue(pages([PLAN]));
  (useScriptPages as unknown as jest.Mock).mockReturnValue(pages([SCRIPT]));
});

// ---------------------------------------------------------------------------
// The families, pure.
// ---------------------------------------------------------------------------
describe("the per-emotion guidance", () => {
  it("maps the twelve difficult built-ins onto four families", () => {
    expect(OPPOSITE_ACTION_FAMILIES).toEqual(["anger", "fear", "sadness", "guiltShame"]);
    expect(EMOTIONS_WITH_GUIDANCE).toHaveLength(12);
    expect(familyForEmotion("angry")).toBe("anger");
    expect(familyForEmotion("overwhelmed")).toBe("fear");
    expect(familyForEmotion("numb")).toBe("sadness");
    expect(familyForEmotion("guilty")).toBe("guiltShame");
  });

  /**
   * ☠️ A pleasant built-in or a custom word resolves to NOTHING, and the hints
   * simply do not render. Guessing at guidance for a feeling the app has never
   * seen would be inventing advice about it.
   */
  it("has no line for a pleasant feeling or a word it has never seen", () => {
    expect(familyForEmotion("happy")).toBeNull();
    expect(familyForEmotion("my own word")).toBeNull();
    expect(familyForEmotion(null)).toBeNull();
  });

  it("gives every family both of its lines, and never says should", () => {
    for (const family of OPPOSITE_ACTION_FAMILIES) {
      const lines = (
        enDbt.oppositeAction.families as Record<string, { pull: string; opposite: string }>
      )[family]!;
      expect(lines.pull).toBeTruthy();
      expect(lines.opposite).toBeTruthy();
      // Hints, never rules.
      expect(`${lines.pull} ${lines.opposite}`).not.toMatch(/\bshould\b/i);
    }
  });
});

// ---------------------------------------------------------------------------
// The opposite-action plan.
// ---------------------------------------------------------------------------
describe("the opposite-action plan", () => {
  it("shows the family's two lines once a feeling is picked, and none before", () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    expect(screen.queryByText(/Anger usually pulls/)).toBeNull();

    fireEvent.press(screen.getByLabelText("Angry"));

    expect(screen.getByText(/Anger usually pulls towards attacking/)).toBeTruthy();
  });

  it("shows no guidance for a pleasant feeling", () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    fireEvent.press(screen.getByLabelText("Happy"));

    expect(screen.queryByText(/usually pulls towards/)).toBeNull();
  });

  it("needs the feeling, the pull and the opposite, and says which is missing", async () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    fireEvent.press(screen.getByText("Save plan"));
    expect(await screen.findByText("Pick the feeling first")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Angry"));
    fireEvent.press(screen.getByText("Save plan"));
    expect(await screen.findByText("Add what it pulls you to do")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("What it pulls me to do"), "snap");
    fireEvent.press(screen.getByText("Save plan"));
    expect(await screen.findByText("Add the opposite")).toBeTruthy();

    expect(savePlan).not.toHaveBeenCalled();
  });

  /** ☠️ Free text, never a duration picker: a countdown implies a required length. */
  it("takes how long as words, not as a clock", () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    expect(screen.getByLabelText("How long I'll hold it")).toBeTruthy();
    expect(screen.queryByText(/minutes?$|timer|countdown/i)).toBeNull();
  });

  it("saves an open plan with no done columns", async () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    fireEvent.press(screen.getByLabelText("Angry"));
    fireEvent.changeText(screen.getByLabelText("What it pulls me to do"), "snap");
    fireEvent.changeText(screen.getByLabelText("The opposite"), "soften my voice");
    fireEvent.press(screen.getByText("Save plan"));

    await waitFor(() => expect(savePlan).toHaveBeenCalledTimes(1));
    const [payload] = savePlan.mock.calls[0] as [Record<string, unknown>];
    expect(payload).toMatchObject({ emotion: "angry", oppositeAction: "soften my voice" });
    expect(payload).not.toHaveProperty("doneAt");
  });

  /**
   * ☠️ Nothing asks. No "3 plans waiting", no age, no overdue, no count of the
   * done ones - an open plan is a plain row until the person closes it.
   */
  it("lists plans without waiting, ageing or counting them", () => {
    mockPathname = "/modules/dbt/opposite-action";
    renderWithProviders(<DbtOppositeActionListScreen />);

    expect(screen.getByText("soften my voice and step back")).toBeTruthy();
    expect(screen.queryByText(/waiting|overdue|\d+ plans?\b|days ago/i)).toBeNull();
  });

  it("closes a plan from its detail, with the note optional", async () => {
    mockPathname = "/modules/dbt/opposite-action/p-1";
    renderWithProviders(<DbtOppositeActionDetailScreen id="p-1" />);

    fireEvent.press(screen.getByText("Done"));
    // The note opens, and skipping it still closes the plan.
    fireEvent.press(screen.getByText("Skip the note"));

    await waitFor(() => expect(markPlanDone).toHaveBeenCalledTimes(1));
    expect(markPlanDone).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "p-1",
        input: expect.objectContaining({ doneOffsetMinutes: expect.any(Number) }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// The script.
// ---------------------------------------------------------------------------
describe("the script", () => {
  beforeEach(() => {
    mockPathname = "/modules/dbt/scripts/new";
  });

  /**
   * ☠️ The order IS the teaching: facts, then feeling, then the one ask, and
   * the self-care line last so it never leaks into the ask.
   */
  it("asks for the facts before the feeling and the ask", () => {
    renderWithProviders(<DbtScriptNewScreen />);

    expect(screen.getByLabelText("What's going on")).toBeTruthy();
    expect(screen.queryByLabelText("I want")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("What's going on"), "He is late a lot");
    fireEvent.press(screen.getByText("Next"));

    expect(screen.getByLabelText("I think")).toBeTruthy();
    expect(screen.getByLabelText("I want")).toBeTruthy();
    expect(screen.getByLabelText("If the answer is no")).toBeTruthy();
  });

  it("will not leave a step with a required line empty", async () => {
    renderWithProviders(<DbtScriptNewScreen />);

    fireEvent.press(screen.getByText("Next"));
    expect(await screen.findByText("Add what's going on")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText("What's going on"), "He is late a lot");
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Next"));
    expect(await screen.findByText("Add the I think line")).toBeTruthy();
  });

  /** ☠️ No `who` field, and nothing structured about the other person. */
  it("stores nothing about the other person", () => {
    renderWithProviders(<DbtScriptNewScreen />);

    expect(screen.queryByText(/who|their name|the other person/i)).toBeNull();
    expect(JSON.stringify(enDbt.scripts)).not.toMatch(/\bwho\b.*name|their name/i);
  });

  /**
   * ☠️ **The list IS the ladder.** Rated open scripts easiest-first, unrated
   * after them newest-first, done ones below. No rung numbers, no gate.
   */
  it("orders the list as the ladder", () => {
    const rows = [
      { ...SCRIPT, id: "hard", difficulty: 80 },
      { ...SCRIPT, id: "done", doneAt: "2026-06-05T09:00:00.000Z", difficulty: 10 },
      { ...SCRIPT, id: "easy", difficulty: 20 },
      { ...SCRIPT, id: "unrated", difficulty: null },
    ];

    expect(orderScriptsAsLadder(rows).map((row) => row.id)).toEqual([
      "easy",
      "hard",
      "unrated",
      "done",
    ]);
  });

  it("shows no rung numbers and no exposure link", () => {
    mockPathname = "/modules/dbt/scripts";
    renderWithProviders(<DbtScriptListScreen />);

    expect(screen.getByText("text me if you'll be late")).toBeTruthy();
    expect(screen.queryByText(/rung|step \d+ of|exposure/i)).toBeNull();
  });

  it("reads the four lines back on the card, with no crisis bar", () => {
    mockPathname = "/modules/dbt/scripts/s-1";
    renderWithProviders(<DbtScriptDetailScreen id="s-1" />);

    expect(screen.getByText("You were late twice this week without a message")).toBeTruthy();
    expect(screen.getByText("text me if you'll be late")).toBeTruthy();
    expect(screen.getByText("I will eat without waiting")).toBeTruthy();
    // The card is a read-back surface opened at a specific moment, like the
    // coping-plan card - it shows the lines, not a warning above them.
    expect(screen.queryByLabelText("Not for emergencies · Crisis resources")).toBeNull();
  });

  /** ☠️ Read-only: five lines to remind yourself of, with no field behind them. */
  it("offers the push-back lines as reading, not as fields", () => {
    mockPathname = "/modules/dbt/scripts/s-1";
    renderWithProviders(<DbtScriptDetailScreen id="s-1" />);

    fireEvent.press(screen.getByText("If they push back"));

    expect(screen.getByText(/Grant the true part/)).toBeTruthy();
    expect(screen.getByText("Read-only. Nothing here is a field.")).toBeTruthy();
    expect(enDbt.scripts.pushBackLines).toHaveLength(5);
  });

  it("closes a script from its card, with the note optional", async () => {
    mockPathname = "/modules/dbt/scripts/s-1";
    renderWithProviders(<DbtScriptDetailScreen id="s-1" />);

    fireEvent.press(screen.getByText("Done"));
    fireEvent.press(screen.getByText("Skip the note"));

    await waitFor(() => expect(markScriptDone).toHaveBeenCalledTimes(1));
  });
});
