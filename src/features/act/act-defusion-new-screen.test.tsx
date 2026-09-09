import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Platform } from "react-native";

import ActDefusionNewScreen from "@/src/features/act/act-defusion-new-screen";
import { useSaveDefusionLog } from "@/src/features/act/queries";
import { useActDefusionLogDraftStore } from "@/src/stores/act-defusion-log-draft-store";
import { seedDefusionLog, useActDefusionSeedStore } from "@/src/stores/act-defusion-seed-store";
import { resetAllDraftStores } from "@/src/stores/draft-store-registry";
import { HANDOFF_SEED_TTL_MS } from "@/src/stores/handoff-seed";
import { useToastStore } from "@/src/stores/toast-store";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * Defuse a thought, as one scrolling column (#1380).
 *
 * The screen this replaces was a five-step pill wizard, so most of what is
 * asserted here could not be asserted at all before: every field is on screen at
 * once, any part can be answered first, and a part-way entry saves.
 *
 * ☠️ The rail's count is the observable for the fill rule, and it discriminates
 * every way of getting the rule wrong. A PREFIX count ("the furthest part
 * reached") would report a form with only the LAST part filled as 5 of 5; a
 * naive per-stop count that trusted the field values would report a FRESH form
 * as 2 of 5, because the category and the technique arrive pre-answered at the
 * database's defaults. Both are tested below, in those exact shapes.
 */

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false) },
  usePathname: () => "/modules/act/defusion/new",
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
  useSaveDefusionLog: jest.fn(),
}));

const mockUseSave = useSaveDefusionLog as jest.MockedFunction<typeof useSaveDefusionLog>;
let mockMutateAsync: jest.Mock;

const THOUGHT_LABEL = "What is the thought?";
const CATEGORY_LABEL = "What kind of thought is this?";
const FUSION_BEFORE_LABEL = "How strongly is this thought pulling you right now?";
const TECHNIQUE_LABEL = "Pick a defusion technique";
const DEFUSED_LABEL = "How does the thought look after the technique? (optional)";
const FUSION_AFTER_LABEL = "How strongly is it pulling you now?";
const NOTES_LABEL = "Anything to note? (optional)";

/** The rail's stop names, in column order. */
const STOP_NAMES = ["The thought", "Category", "Before", "Technique", "After & notes"];

const ORIGINAL_OS = Platform.OS;

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

beforeEach(() => {
  jest.clearAllMocks();
  useActDefusionLogDraftStore.getState().reset();
  useActDefusionSeedStore.setState({ seed: null, mintedAt: null, deferred: false });
  useToastStore.getState().clearToasts();
  mockMutateAsync = jest.fn(() => Promise.resolve({} as never));
  mockUseSave.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useSaveDefusionLog>);
});

afterEach(() => {
  setPlatform(ORIGINAL_OS);
});

/**
 * Both fusion ratings are on screen at once, so every number names two buttons.
 * Scoped by testID rather than by index, for the same reason the end-to-end spec
 * is: an index quietly retargets the other rating when anything moves.
 */
function rate(which: "before" | "after", value: number) {
  fireEvent.press(within(screen.getByTestId(`defusion-fusion-${which}`)).getByText(String(value)));
}

describe("the defusion form as one column", () => {
  it("puts every part on screen at once, with nothing to advance", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    for (const label of [
      THOUGHT_LABEL,
      CATEGORY_LABEL,
      FUSION_BEFORE_LABEL,
      TECHNIQUE_LABEL,
      DEFUSED_LABEL,
      FUSION_AFTER_LABEL,
      NOTES_LABEL,
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.queryByText("Continue")).toBeNull();
    expect(screen.queryByText("Back")).toBeNull();
  });

  it("names all five parts on the rail", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    for (const name of STOP_NAMES) {
      expect(screen.getByText(name, { includeHiddenElements: true })).toBeTruthy();
    }
  });
});

describe("the rail's fill", () => {
  it("☠️ lights nothing on a fresh form, despite the category and technique arriving pre-answered", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByText("0 of 5 parts filled in")).toBeTruthy();
  });

  it("☠️ counts the LAST part alone as one, not as five", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(NOTES_LABEL), "it loosened a bit");

    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();
  });

  it("counts a part the user touched, whichever part it is", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.press(screen.getByText("Worry"));
    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();

    rate("before", 60);
    expect(screen.getByText("2 of 5 parts filled in")).toBeTruthy();
  });

  it("reaches five when every part holds something", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    fireEvent.press(screen.getByText("Worry"));
    rate("before", 60);
    fireEvent.press(screen.getByText("Musical thoughts"));
    fireEvent.changeText(screen.getByLabelText(NOTES_LABEL), "lighter");

    expect(screen.getByText("5 of 5 parts filled in")).toBeTruthy();
  });

  it("empties a part again when the user clears it", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "   ");
    expect(screen.getByText("0 of 5 parts filled in")).toBeTruthy();
  });
});

describe("saving", () => {
  it("saves a partial entry, filling in what the database would have defaulted", async () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          fusedThought: "I will fail",
          thoughtCategory: "other",
          techniqueUsed: "havingTheThoughtThat",
          fusionLevelBefore: null,
          fusionLevelAfter: null,
          defusedVersion: "",
          notes: "",
        }),
      ),
    );
  });

  it("lets the last part be answered first and still saves it", async () => {
    renderWithProviders(<ActDefusionNewScreen />);

    // The last part, before anything above it.
    fireEvent.changeText(screen.getByLabelText(NOTES_LABEL), "it loosened");
    rate("after", 20);
    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");

    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "it loosened", fusionLevelAfter: 20 }),
      ),
    );
  });

  it("asks for the thought at the save rather than disabling the button", async () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Write the thought before saving.")).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("drops the complaint as soon as the user starts writing", async () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.press(screen.getByText("Save"));
    expect(await screen.findByText("Write the thought before saving.")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I");

    expect(screen.queryByText("Write the thought before saving.")).toBeNull();
  });
});

describe("finishing later", () => {
  it("leaves the screen and keeps what was typed", () => {
    const first = renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    fireEvent.press(screen.getByText("Finish later"));

    expect(router.back).toHaveBeenCalled();

    // Coming back to the screen restores the entry rather than a blank form.
    first.unmount();
    renderWithProviders(<ActDefusionNewScreen />);
    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("I will fail");
    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();
  });

  it("hands the draft to the sign-out purge, because it is health data", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    expect(useActDefusionLogDraftStore.getState().values).not.toBeNull();

    // What the session provider calls on SIGNED_OUT. The store is only reached
    // by it because createDraftStore registers itself. It is wrapped in act
    // because the screen is mounted and re-renders off the same store.
    act(() => {
      resetAllDraftStores();
    });

    expect(useActDefusionLogDraftStore.getState().values).toBeNull();
  });

  it("clears the draft when the user discards it", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I will fail");
    fireEvent.press(screen.getByText("Discard draft"));
    fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));

    expect(useActDefusionLogDraftStore.getState().values).toBeNull();
  });
});

describe("the technique picker", () => {
  it("opens on all seven and collapses onto the one chosen", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getAllByText(/Musical thoughts|Silly voices|Subtitles/).length).toBe(3);

    fireEvent.press(screen.getByText("Musical thoughts"));

    expect(screen.getByText("Musical thoughts")).toBeTruthy();
    expect(screen.queryByText("Silly voices")).toBeNull();

    fireEvent.press(screen.getByText("Change technique"));

    expect(screen.getByText("Silly voices")).toBeTruthy();
  });

  it("☠️ arrowing through the techniques selects without tearing the list down", () => {
    setPlatform("web");
    renderWithProviders(<ActDefusionNewScreen />);

    // The technique cards follow the six category chips.
    const firstTechnique = screen.getAllByRole("radio")[6];
    fireEvent(firstTechnique, "keyDown", {
      key: "ArrowDown",
      repeat: false,
      preventDefault: jest.fn(),
    });

    // Selected - the rail says so...
    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();
    expect(screen.getAllByRole("radio")[7]).toBeChecked();
    // ...and the list is STILL OPEN. Collapsing on move would end the traversal
    // after one arrow press: the user could never reach the third technique.
    expect(screen.getByText("Silly voices")).toBeTruthy();

    // Committing is what collapses it.
    fireEvent.press(screen.getByText("Musical thoughts"));
    expect(screen.queryByText("Silly voices")).toBeNull();
  });
});

describe("the category chips and technique cards", () => {
  it("stay radiogroups rather than becoming checkboxes", () => {
    renderWithProviders(<ActDefusionNewScreen />);

    // Six categories and seven techniques, every one of them a radio.
    expect(screen.getAllByRole("radio").length).toBe(13);
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
  });

  it("keep arrow traversal with wrap, and Home/End", () => {
    setPlatform("web");
    renderWithProviders(<ActDefusionNewScreen />);

    const chips = screen.getAllByRole("radio").slice(0, 6);

    // Arrow moves and activates: the first chip is "Self-judgement", the second "Worry".
    fireEvent(chips[0], "keyDown", { key: "ArrowRight", repeat: false, preventDefault: jest.fn() });
    expect(screen.getByText("1 of 5 parts filled in")).toBeTruthy();
    expect(screen.getAllByRole("radio")[1]).toBeChecked();

    fireEvent(screen.getAllByRole("radio")[1], "keyDown", {
      key: "End",
      repeat: false,
      preventDefault: jest.fn(),
    });
    expect(screen.getAllByRole("radio")[5]).toBeChecked();

    // Wraps forward off the end, back onto the first.
    fireEvent(screen.getAllByRole("radio")[5], "keyDown", {
      key: "ArrowRight",
      repeat: false,
      preventDefault: jest.fn(),
    });
    expect(screen.getAllByRole("radio")[0]).toBeChecked();

    fireEvent(screen.getAllByRole("radio")[0], "keyDown", {
      key: "Home",
      repeat: false,
      preventDefault: jest.fn(),
    });
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
  });
});

/**
 * The DBT judgement's "Unhook from it" door hands off through the seed store
 * (#2254), and THIS form decides what happens to it (#2206).
 *
 * ☠️ The seed is not a draft until the person edits it. The door used to write
 * straight into the draft store, so an untouched seed left behind by "Finish
 * later" counted as held work and blocked the next judgement's hand-off - the
 * form opened on the wrong judgement, silently. The two tests at the end pin
 * both halves of that: an untouched seed leaves no draft, and a second door
 * opens on the second judgement.
 */
describe("a door's hand-off", () => {
  const SEED = { fusedThought: "She is ignoring me", thoughtCategory: "selfJudgment" as const };

  it("opens the form on the hand-off when nothing is held", () => {
    seedDefusionLog(SEED);

    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("She is ignoring me");
    // The thought and its category, and nothing else pre-answered.
    expect(screen.getByText("2 of 5 parts filled in")).toBeTruthy();
    // Taken, so it can never be applied twice.
    expect(useActDefusionSeedStore.getState().seed).toBeNull();
    expect(useToastStore.getState().visible).toBeNull();
  });

  it("keeps a held entry, says so, and leaves the hand-off for the next fresh open", () => {
    const first = renderWithProviders(<ActDefusionNewScreen />);
    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I never get anything right");
    first.unmount();

    seedDefusionLog(SEED);
    const second = renderWithProviders(<ActDefusionNewScreen />);

    // The entry the person typed, not the hand-off.
    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("I never get anything right");
    expect(useToastStore.getState().visible?.title).toBe("Kept your open draft");
    // ☠️ Un-consumed: still there for the next fresh open of this form.
    expect(useActDefusionSeedStore.getState().seed).toEqual(SEED);

    second.unmount();
    useActDefusionLogDraftStore.getState().reset();
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("She is ignoring me");
  });

  /**
   * ☠️☠️ **A kept hand-off waits for the next fresh open, not for any open ever.**
   * The seed store is a module singleton, so on native nothing ends the wait: the
   * person finishes or discards the entry they were holding, opens this form from
   * the ACT hub an hour later to log something unrelated, and it arrives on the
   * old judgement with the category already answered and nothing on screen saying
   * where that came from.
   */
  it("does not open a later, unrelated visit on a hand-off that has gone stale", () => {
    const first = renderWithProviders(<ActDefusionNewScreen />);
    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I never get anything right");
    first.unmount();

    seedDefusionLog(SEED);
    const second = renderWithProviders(<ActDefusionNewScreen />);
    expect(useActDefusionSeedStore.getState().seed).toEqual(SEED);
    second.unmount();

    // The entry is finished with, and the person comes back much later.
    useActDefusionLogDraftStore.getState().reset();
    useActDefusionSeedStore.setState({ mintedAt: Date.now() - HANDOFF_SEED_TTL_MS - 1 });
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("");
    expect(screen.getByText("0 of 5 parts filled in")).toBeTruthy();
    expect(useActDefusionSeedStore.getState().seed).toBeNull();
  });

  /**
   * ☠️ The notice is about a decision this arrival caused. `keptDraft` is
   * recomputed at every mount from (seed present) AND (draft has content), and
   * neither side is consumed on that path - so it used to re-announce the
   * hand-off on every visit for as long as the entry was held.
   */
  it("says it kept the entry once, not on every visit while it is held", () => {
    const first = renderWithProviders(<ActDefusionNewScreen />);
    fireEvent.changeText(screen.getByLabelText(THOUGHT_LABEL), "I never get anything right");
    first.unmount();

    seedDefusionLog(SEED);
    const second = renderWithProviders(<ActDefusionNewScreen />);
    expect(useToastStore.getState().visible?.title).toBe("Kept your open draft");
    second.unmount();

    useToastStore.getState().clearToasts();
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("I never get anything right");
    expect(useToastStore.getState().visible).toBeNull();
  });

  /**
   * ☠️ A hand-off waiting for the next fresh open is a judgement the person read,
   * held in memory - so the sign-out wipe has to reach it too, or the next
   * session on the device (a fresh guest, on native, in the same process) would
   * open the defusion form on the last person's words.
   */
  it("is dropped by the sign-out wipe while it waits", () => {
    seedDefusionLog(SEED);

    resetAllDraftStores();
    renderWithProviders(<ActDefusionNewScreen />);

    expect(useActDefusionSeedStore.getState().seed).toBeNull();
    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("");
  });

  it("leaves no draft behind when the hand-off is never touched", () => {
    seedDefusionLog(SEED);

    const view = renderWithProviders(<ActDefusionNewScreen />);
    // "Finish later" without typing a word.
    fireEvent.press(screen.getByText("Finish later"));
    view.unmount();

    expect(useActDefusionLogDraftStore.getState().values).toBeNull();
  });

  it("opens on the SECOND judgement when the door is walked twice", () => {
    seedDefusionLog(SEED);
    const first = renderWithProviders(<ActDefusionNewScreen />);
    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("She is ignoring me");
    fireEvent.press(screen.getByText("Finish later"));
    first.unmount();

    seedDefusionLog({ fusedThought: "I am hopeless at this", thoughtCategory: "selfJudgment" });
    renderWithProviders(<ActDefusionNewScreen />);

    expect(screen.getByLabelText(THOUGHT_LABEL).props.value).toBe("I am hopeless at this");
    expect(useToastStore.getState().visible).toBeNull();
  });

  it("moves the hand-off into the held draft the moment it is edited", () => {
    seedDefusionLog(SEED);
    const view = renderWithProviders(<ActDefusionNewScreen />);

    fireEvent.changeText(screen.getByLabelText(NOTES_LABEL), "worth saying out loud");
    view.unmount();

    // Both the seeded thought and the typed note - the edit merges onto the seed
    // rather than starting from the empty draft.
    expect(useActDefusionLogDraftStore.getState().values).toMatchObject({
      fusedThought: "She is ignoring me",
      thoughtCategory: "selfJudgment",
      notes: "worth saying out loud",
    });
  });
});
