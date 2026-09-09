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
  useDoneScriptPages,
  useMarkOppositeActionPlanDone,
  useMarkScriptDone,
  useOpenScripts,
  useOppositeActionPlan,
  useOppositeActionPlanPages,
  useSaveOppositeActionPlan,
  useSaveScript,
  useScript,
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
  useOpenScripts: jest.fn(),
  useDoneScriptPages: jest.fn(),
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
  (useOpenScripts as unknown as jest.Mock).mockReturnValue({
    data: [SCRIPT],
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  });
  (useDoneScriptPages as unknown as jest.Mock).mockReturnValue(pages([]));
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

  /**
   * ☠️ "Skip the note" means the note is NOT saved (#2198). Both buttons used
   * to call the same handler, so the skip wrote whatever had been typed - the
   * one affordance for declining to record something did the opposite.
   */
  it("does not write a typed note when the person skips it", async () => {
    mockPathname = "/modules/dbt/opposite-action/p-1";
    renderWithProviders(<DbtOppositeActionDetailScreen id="p-1" />);

    fireEvent.press(screen.getByText("Done"));
    fireEvent.changeText(screen.getByLabelText("What shifted"), "he shouted and I cried");
    fireEvent.press(screen.getByText("Skip the note"));

    await waitFor(() => expect(markPlanDone).toHaveBeenCalledTimes(1));
    const [{ input }] = markPlanDone.mock.calls[0] as [{ input: { whatShifted: string } }];
    expect(input.whatShifted).toBe("");
  });

  it("writes the typed note when the person saves it", async () => {
    mockPathname = "/modules/dbt/opposite-action/p-1";
    renderWithProviders(<DbtOppositeActionDetailScreen id="p-1" />);

    fireEvent.press(screen.getByText("Done"));
    fireEvent.changeText(screen.getByLabelText("What shifted"), "it passed");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(markPlanDone).toHaveBeenCalledTimes(1));
    const [{ input }] = markPlanDone.mock.calls[0] as [{ input: { whatShifted: string } }];
    expect(input.whatShifted).toBe("it passed");
  });

  /**
   * ☠️ One feeling is a RADIO group, not 22 checkboxes (#2199). Picking one
   * silently drops the last, and a checkbox promises the opposite: a reader
   * told "checkbox, checked" on Sad hears nothing about Angry coming unchecked.
   */
  it("offers the feeling as a radio group, so picking one unchecks the last audibly", () => {
    renderWithProviders(<DbtOppositeActionNewScreen />);

    expect(screen.getByLabelText("The feeling").props.accessibilityRole).toBe("radiogroup");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    fireEvent.press(screen.getByLabelText("Angry"));
    fireEvent.press(screen.getByLabelText("Sad"));

    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Angry" })).not.toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
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

  /**
   * ☠️ The segment the screen paints as chosen is the answer it saves (#2192).
   * The control used to be fed `wantChanged ?? "moreOf"` over a state that
   * started null, so agreeing with the visible default and never tapping it
   * saved "not answered".
   */
  it("saves the answer it shows as selected when the person never taps it", async () => {
    renderWithProviders(<DbtScriptNewScreen />);

    fireEvent.changeText(screen.getByLabelText("What's going on"), "He is late a lot");
    fireEvent.press(screen.getByText("Next"));
    fireEvent.changeText(screen.getByLabelText("I think"), "You were late twice");
    fireEvent.changeText(screen.getByLabelText("I want"), "a text when you'll be late");
    fireEvent.press(screen.getByText("Next"));
    fireEvent.press(screen.getByText("Save script"));

    await waitFor(() => expect(saveScript).toHaveBeenCalledTimes(1));
    const [payload] = saveScript.mock.calls[0] as [Record<string, unknown>];
    expect(payload.wantChanged).toBe("moreOf");
  });

  /** The same radio rule as the plan's picker (#2199), on the script's feeling. */
  it("offers the feeling as a radio group", () => {
    renderWithProviders(<DbtScriptNewScreen />);

    fireEvent.changeText(screen.getByLabelText("What's going on"), "He is late a lot");
    fireEvent.press(screen.getByText("Next"));

    // The group shares the field's name with its textarea; the group is the
    // one carrying the role.
    const group = screen
      .getAllByLabelText("I feel")
      .find((node) => node.props.accessibilityRole === "radiogroup");
    expect(group).toBeTruthy();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);

    fireEvent.press(screen.getByLabelText("Frustrated"));
    fireEvent.press(screen.getByLabelText("Sad"));

    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Sad" })).toBeChecked();
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

  /**
   * ☠️ The top row is the easiest script the person HAS, not the easiest of
   * the newest page (#2196). The open rungs arrive whole from their own read
   * and sit above the done pages, whatever recency says: here the easiest open
   * script is the OLDEST row, and the done one is the newest.
   */
  it("puts the easiest open script first, above the done pages", () => {
    mockPathname = "/modules/dbt/scripts";
    (useOpenScripts as unknown as jest.Mock).mockReturnValue({
      data: [
        {
          ...SCRIPT,
          id: "hard",
          iWant: "ask-hard",
          difficulty: 80,
          createdAt: "2026-06-09T09:00:00.000Z",
        },
        {
          ...SCRIPT,
          id: "easy",
          iWant: "ask-easy",
          difficulty: 20,
          createdAt: "2026-06-01T09:00:00.000Z",
        },
      ],
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    });
    (useDoneScriptPages as unknown as jest.Mock).mockReturnValue(
      pages([
        {
          ...SCRIPT,
          id: "done",
          iWant: "ask-done",
          difficulty: 10,
          createdAt: "2026-06-10T09:00:00.000Z",
          doneAt: "2026-06-11T09:00:00.000Z",
        },
      ]),
    );
    renderWithProviders(<DbtScriptListScreen />);

    expect(screen.getAllByText(/^ask-/).map((node) => node.props.children)).toEqual([
      "ask-easy",
      "ask-hard",
      "ask-done",
    ]);
  });

  it("shows an error rather than an empty ladder when either read failed", () => {
    mockPathname = "/modules/dbt/scripts";
    (useOpenScripts as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
      refetch: jest.fn(),
    });
    renderWithProviders(<DbtScriptListScreen />);

    expect(screen.queryByText("No scripts yet.")).toBeNull();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  /**
   * ☠️ Two reads, ONE error slot, and the slot is `ListEmptyComponent` - which
   * `FlatList` renders only while the list is empty (#2259). So when one half
   * failed and the other returned rows, the failure had nowhere to appear: the
   * ladder rendered as if it were whole, missing either every open rung or every
   * closed script, with no error, no Retry and no sign anything was gone. The
   * test above cannot see it - both halves are empty in that fixture.
   */
  it("says so in the footer when the DONE half failed and the open rungs rendered", () => {
    mockPathname = "/modules/dbt/scripts";
    (useDoneScriptPages as unknown as jest.Mock).mockReturnValue({
      ...pages([]),
      data: undefined,
      isError: true,
    });
    renderWithProviders(<DbtScriptListScreen />);

    // The half that resolved is still on screen...
    expect(screen.getByText("text me if you'll be late")).toBeTruthy();
    // ...and the half that failed says so, with a way to ask again.
    expect(screen.getByText("Some of your scripts could not be loaded.")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("says so in the footer when the OPEN half failed and the done ones rendered", () => {
    mockPathname = "/modules/dbt/scripts";
    const refetchOpen = jest.fn();
    (useOpenScripts as unknown as jest.Mock).mockReturnValue({
      data: undefined,
      isError: true,
      isPending: false,
      refetch: refetchOpen,
    });
    (useDoneScriptPages as unknown as jest.Mock).mockReturnValue(
      pages([{ ...SCRIPT, id: "done", iWant: "ask-done", doneAt: "2026-06-11T09:00:00.000Z" }]),
    );
    renderWithProviders(<DbtScriptListScreen />);

    expect(screen.getByText("ask-done")).toBeTruthy();
    expect(screen.getByText("Some of your scripts could not be loaded.")).toBeTruthy();

    // Retry re-reads only the half that failed - the good pages are not re-decrypted.
    fireEvent.press(screen.getByText("Retry"));
    expect(refetchOpen).toHaveBeenCalledTimes(1);
  });

  it("keeps the footer quiet when both halves resolved", () => {
    mockPathname = "/modules/dbt/scripts";
    renderWithProviders(<DbtScriptListScreen />);

    expect(screen.queryByText("Some of your scripts could not be loaded.")).toBeNull();
    expect(screen.queryByText("Retry")).toBeNull();
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

  /** ☠️ Skip means skip (#2198): the typed words are not sent. */
  it("does not write a typed note when the person skips it", async () => {
    mockPathname = "/modules/dbt/scripts/s-1";
    renderWithProviders(<DbtScriptDetailScreen id="s-1" />);

    fireEvent.press(screen.getByText("Done"));
    fireEvent.changeText(screen.getByLabelText("How did it go?"), "he shouted and I cried");
    fireEvent.press(screen.getByText("Skip the note"));

    await waitFor(() => expect(markScriptDone).toHaveBeenCalledTimes(1));
    const [{ input }] = markScriptDone.mock.calls[0] as [{ input: { howItWent: string } }];
    expect(input.howItWent).toBe("");
  });

  it("writes the typed note when the person saves it", async () => {
    mockPathname = "/modules/dbt/scripts/s-1";
    renderWithProviders(<DbtScriptDetailScreen id="s-1" />);

    fireEvent.press(screen.getByText("Done"));
    fireEvent.changeText(screen.getByLabelText("How did it go?"), "it went fine");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(markScriptDone).toHaveBeenCalledTimes(1));
    const [{ input }] = markScriptDone.mock.calls[0] as [{ input: { howItWent: string } }];
    expect(input.howItWent).toBe("it went fine");
  });
});
