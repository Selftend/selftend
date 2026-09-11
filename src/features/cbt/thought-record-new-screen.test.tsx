import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import ThoughtRecordEditorScreen from "@/app/(app)/modules/cbt/new";
import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { distortionDefinitions } from "@/src/constants/distortions";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { defaultValues } from "@/src/features/cbt/thought-record-form";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
import {
  seedThoughtRecord,
  useThoughtRecordSeedStore,
} from "@/src/stores/thought-record-seed-store";
import { useToastStore } from "@/src/stores/toast-store";
import { backWithFallback } from "@/src/lib/back-with-fallback";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

/**
 * The thought record as one scrolling column (#1381).
 *
 * The screen this replaces was an eight-step wizard, so most of what is
 * asserted here could not be asserted at all before: every field is on screen
 * at once, any part can be answered first, and a part-way record saves.
 *
 * ☠️ The rail's counted note is the observable for the fill rule, and it
 * discriminates the ways of getting the rule wrong: a PREFIX count ("the
 * furthest part reached") would report a form with only the LAST part filled
 * as 6 of 6 - tested below in that exact shape.
 */

// Mutable so the edit path can be reached: this screen is both "new" and
// "edit", told apart only by the `recordId` param.
let mockSearchParams: { recordId?: string } = {};

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => "/modules/cbt/new",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/stores/selected-date-store", () => ({
  useSelectedDate: () => ({ selectedDate: "2026-05-24" }),
  loggedAtForSelectedDate: () => "2026-05-24T09:00:00.000Z",
  toLocalDateKey: (iso: string) => iso.slice(0, 10),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecord: jest.fn(),
  useSaveThoughtRecord: jest.fn(),
}));

jest.mock("@/src/features/cbt/use-thought-record-intro-dismissed", () => ({
  useThoughtRecordIntroDismissed: () => ({
    hydrated: true,
    dismissed: true,
    dismiss: jest.fn(),
  }),
}));

jest.mock("@/src/lib/back-with-fallback", () => ({
  backWithFallback: jest.fn(),
}));

const mockUseThoughtRecord = jest.mocked(useThoughtRecord);
const mockUseSave = jest.mocked(useSaveThoughtRecord);
const mockBackWithFallback = jest.mocked(backWithFallback);
let mockMutateAsync: jest.Mock;

const SITUATION_LABEL = "Situation";
const NAT_PLACEHOLDER = "What did your mind say?";
const OUTCOME_NOTES_LABEL = "Outcome notes";

/** The rail's stop names, in column order - patterns BEFORE evidence. */
const STOP_NAMES = ["Situation", "Thoughts", "Feelings", "Patterns", "Evidence", "Balanced"];

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(async () => {
  jest.clearAllMocks();
  mockSearchParams = {};
  // Settle the persisted store's rehydration once so the boot gate opens
  // immediately, then start every test from a clean draft.
  await act(async () => {
    await useCbtDraftStore.persist.rehydrate();
  });
  useCbtDraftStore.getState().reset();
  mockMutateAsync = jest.fn(() => Promise.resolve({ id: "record-1" }));
  mockUseThoughtRecord.mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof useThoughtRecord>);
  mockUseSave.mockReturnValue({
    mutateAsync: mockMutateAsync,
  } as unknown as ReturnType<typeof useSaveThoughtRecord>);
});

async function renderColumn() {
  const view = renderWithProviders(<ThoughtRecordEditorScreen />);
  // Wait out the draft-store hydration gate.
  await screen.findByText("Save record");
  return view;
}

async function addThought(text: string, rating?: number) {
  fireEvent.changeText(screen.getByPlaceholderText(NAT_PLACEHOLDER), text);
  if (rating !== undefined) {
    fireEvent.press(within(screen.getByTestId("nat-add-belief-rating")).getByText(String(rating)));
  }
  fireEvent.press(screen.getByRole("button", { name: "Add thought" }));
}

describe("the thought record as one column", () => {
  it("puts every part on screen at once, with nothing to advance", async () => {
    await renderColumn();

    expect(screen.getByLabelText(SITUATION_LABEL)).toBeTruthy();
    expect(screen.getByPlaceholderText(NAT_PLACEHOLDER)).toBeTruthy();
    expect(screen.getAllByText("Emotions").length).toBeGreaterThan(0);
    expect(screen.getByText("Thinking patterns")).toBeTruthy();
    expect(screen.getByLabelText("Evidence supporting the thought")).toBeTruthy();
    expect(screen.getByLabelText("Evidence against the thought")).toBeTruthy();
    expect(screen.getByLabelText("Balanced thought")).toBeTruthy();
    expect(screen.getByText("Belief in the hot thought now (0-100)")).toBeTruthy();
    expect(screen.getByText("Emotion intensity before (0-100)")).toBeTruthy();
    expect(screen.getByText("Emotion intensity after (0-100)")).toBeTruthy();
    expect(screen.getByLabelText(OUTCOME_NOTES_LABEL)).toBeTruthy();

    expect(screen.queryByText("Continue")).toBeNull();
    expect(screen.queryByText("Back")).toBeNull();
  });

  it("names all six parts on the rail, patterns before evidence", async () => {
    await renderColumn();

    for (const name of STOP_NAMES) {
      expect(screen.getAllByText(name, { includeHiddenElements: true }).length).toBeGreaterThan(0);
    }
  });
});

describe("the two checkbox lists", () => {
  /**
   * Feelings and Patterns sit next to each other in the column, so they are
   * one control in one shape (#2349). The patterns stopped being Cards; the
   * chrome went and the descriptions stayed.
   *
   * ☠️ Row HEIGHT is not assertable here - NativeWind resolves nothing into
   * `props.style` under jest, so a class-name assertion would be vacuously
   * green. What is assertable, and what actually prevents the drift, is that
   * both lists render the same component: every row in both answers to the
   * same press targets below.
   */
  it("renders all seventeen patterns as rows, descriptions still in the column", async () => {
    await renderColumn();

    for (const distortion of distortionDefinitions) {
      expect(screen.getByTestId(`pattern-row-${distortion.key}`)).toBeTruthy();
    }
    // Read through i18n, not as a literal: the assertion is that the
    // description is IN the column, and a reworded `en` value must not be the
    // thing that breaks it.
    expect(
      screen.getByText(i18n.t("cbt:distortions.catastrophizing.shortDescription")),
    ).toBeTruthy();
  });

  it("renders every feeling as the same row", async () => {
    await renderColumn();

    for (const emotion of DEFAULT_EMOTIONS) {
      expect(screen.getByTestId(`emotion-row-${emotion.id}`)).toBeTruthy();
    }
  });

  /**
   * ☠️ The patterns half used to read the checkbox back (`toBeChecked()`) after
   * the press. It cannot any more and the assertion is REPLACED, not weakened:
   * that row is unmounted by the fold the same press causes (#2350), so the
   * choice is read where it now lives - the summary - and the rail's count
   * proves the FIELD took it either way. The feelings half is untouched.
   */
  it("☠️ toggles from the row itself in BOTH lists - the label is no longer the whole target", async () => {
    await renderColumn();

    fireEvent.press(screen.getByTestId("emotion-row-anxious"));
    expect(screen.getByRole("checkbox", { name: "Anxious" })).toBeChecked();

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));
    expect(
      within(screen.getByTestId("patterns-summary")).getByText("Catastrophising"),
    ).toBeTruthy();

    expect(screen.getByText("2 of 6 parts filled in")).toBeTruthy();
  });
});

/**
 * The patterns fold (#2350), and the gate underneath it: an answer may never
 * leave the screen; unchosen options may, but only once the person has answered.
 *
 * ☠️ The fold UNMOUNTS the rows - `Disclosure` is unanimated and drops its
 * children by written ruling (#716) - so "the selection survives it" is asserted
 * rather than assumed. An unmount that dropped the value would look exactly like
 * a working fold right up to the save, which is why the save is asserted too.
 */
describe("the patterns fold", () => {
  const SECOND_PATTERN = "Mind reading";
  const CATASTROPHISING_DESCRIPTION = i18n.t("cbt:distortions.catastrophizing.shortDescription");

  it("folds nothing before a first tick, and offers no control that would", async () => {
    await renderColumn();

    for (const distortion of distortionDefinitions) {
      expect(screen.getByTestId(`pattern-row-${distortion.key}`)).toBeTruthy();
    }
    // Structural, not a habit: with nothing chosen there is no disclosure in
    // the tree at all, so no press can take the seventeen away from someone who
    // has answered nothing.
    expect(screen.queryByTestId("patterns-show-all")).toBeNull();
    expect(screen.queryByTestId("patterns-summary")).toBeNull();
  });

  it("folds the other sixteen away on the first tick, stating the choice as a chip", async () => {
    await renderColumn();

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));

    // The sixteen are gone - and so is the row that was ticked. What stays is
    // the answer.
    expect(screen.queryByTestId("pattern-row-mind-reading")).toBeNull();
    expect(screen.queryByTestId("pattern-row-catastrophizing")).toBeNull();

    const summary = within(screen.getByTestId("patterns-summary"));
    expect(summary.getByText("Catastrophising")).toBeTruthy();
    // At exactly one choice, the pattern's meaning comes with it.
    expect(summary.getByText(CATASTROPHISING_DESCRIPTION)).toBeTruthy();
    expect(screen.getByTestId("patterns-show-all")).toBeTruthy();
  });

  /**
   * ☠️ "No count" asserted as NO DIGITS in the summary rather than as the
   * absence of the literal "1 of 17". A literal goes vacuously green the moment
   * the copy is reworded, and the ruling is not about one phrasing: a summary
   * that scores the person for how much of a list they ticked is the thing
   * refused (#2333).
   */
  it("carries no count", async () => {
    await renderColumn();

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));

    expect(within(screen.getByTestId("patterns-summary")).queryByText(/\d/)).toBeNull();
  });

  it("☠️ reopens the full list without losing the selection, and saves it", async () => {
    await renderColumn();
    await addThought("I will fail");

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));
    fireEvent.press(screen.getByTestId("patterns-show-all"));

    // All seventeen are back, with the tick still on.
    for (const distortion of distortionDefinitions) {
      expect(screen.getByTestId(`pattern-row-${distortion.key}`)).toBeTruthy();
    }
    expect(screen.getByRole("checkbox", { name: "Catastrophising" })).toBeChecked();

    // And the value the unmount could have dropped is the value that saves.
    await act(async () => {
      fireEvent.press(screen.getByText("Save record"));
    });
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    expect(mockMutateAsync.mock.calls[0][0].input.distortions).toEqual(["catastrophizing"]);
  });

  it("drops the description once a second pattern is chosen", async () => {
    await renderColumn();

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));
    // Reopening is sticky - a list someone opened to pick a second pattern must
    // not slam shut under the tick that picks it.
    fireEvent.press(screen.getByTestId("patterns-show-all"));
    fireEvent.press(screen.getByTestId("pattern-row-mind-reading"));
    expect(screen.getByTestId("pattern-row-catastrophizing")).toBeTruthy();

    // Folded again by hand: both names stay, the description goes.
    fireEvent.press(screen.getByTestId("patterns-show-all"));
    const summary = within(screen.getByTestId("patterns-summary"));
    expect(summary.getByText("Catastrophising")).toBeTruthy();
    expect(summary.getByText(SECOND_PATTERN)).toBeTruthy();
    expect(summary.queryByText(CATASTROPHISING_DESCRIPTION)).toBeNull();
  });

  it("opens again when the last pattern is unticked", async () => {
    await renderColumn();

    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));
    fireEvent.press(screen.getByTestId("patterns-show-all"));
    fireEvent.press(screen.getByTestId("pattern-row-catastrophizing"));

    expect(screen.queryByTestId("patterns-summary")).toBeNull();
    expect(screen.queryByTestId("patterns-show-all")).toBeNull();
    expect(screen.getByTestId("pattern-row-mind-reading")).toBeTruthy();
  });

  /**
   * ☠️☠️ The gate is about the state of the ANSWER, not the recency of the tap -
   * so a restored draft arrives folded, and so does an edit. The edit case is
   * the one a `useState` initialiser cannot pass: the record is fetched and then
   * `reset` into the form from an effect, which lands AFTER this block's first
   * render, so a fold decided at mount would read an empty field and leave the
   * wall open on every record anyone ever edits.
   */
  it("arrives folded on a restored draft that already holds patterns", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, distortions: ["catastrophizing"] });

    await renderColumn();

    expect(
      within(screen.getByTestId("patterns-summary")).getByText("Catastrophising"),
    ).toBeTruthy();
    expect(screen.queryByTestId("pattern-row-mind-reading")).toBeNull();
  });

  it("arrives folded on an edited record, whose values land after the first render", async () => {
    mockSearchParams = { recordId: "record-1" };
    mockUseThoughtRecord.mockReturnValue({
      data: {
        id: "record-1",
        situation: "a tense meeting",
        nats: [{ text: "I will fail", beliefRating: 70, isHotThought: true }],
        emotions: ["anxious"],
        emotionIntensityBefore: 60,
        emotionIntensityAfter: 30,
        distortions: ["catastrophizing"],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "",
        beliefAfter: 40,
        outcomeNotes: "",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    await renderColumn();

    expect(
      within(screen.getByTestId("patterns-summary")).getByText("Catastrophising"),
    ).toBeTruthy();
    expect(screen.queryByTestId("pattern-row-mind-reading")).toBeNull();
  });

  it("arrives open on an edited record with no patterns chosen", async () => {
    mockSearchParams = { recordId: "record-1" };
    mockUseThoughtRecord.mockReturnValue({
      data: {
        id: "record-1",
        situation: "a tense meeting",
        nats: [{ text: "I will fail", beliefRating: 70, isHotThought: true }],
        emotions: ["anxious"],
        emotionIntensityBefore: 60,
        emotionIntensityAfter: 30,
        distortions: [],
        evidenceFor: [],
        evidenceAgainst: [],
        balancedThought: "",
        beliefAfter: 40,
        outcomeNotes: "",
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useThoughtRecord>);

    await renderColumn();

    expect(screen.getByTestId("pattern-row-mind-reading")).toBeTruthy();
    expect(screen.queryByTestId("patterns-summary")).toBeNull();
  });
});

describe("the rail's fill", () => {
  it("lights nothing on a fresh form", async () => {
    await renderColumn();

    expect(screen.getByText("0 of 6 parts filled in")).toBeTruthy();
  });

  it("☠️ counts the LAST part alone as one, not as six", async () => {
    await renderColumn();

    fireEvent.changeText(screen.getByLabelText(OUTCOME_NOTES_LABEL), "calmer now");

    expect(screen.getByText("1 of 6 parts filled in")).toBeTruthy();
  });

  it("counts a part the user touched, whichever part it is", async () => {
    await renderColumn();

    fireEvent.press(screen.getAllByText("Anxious")[0]);
    expect(screen.getByText("1 of 6 parts filled in")).toBeTruthy();

    fireEvent.press(screen.getByRole("checkbox", { name: "Catastrophising" }));
    expect(screen.getByText("2 of 6 parts filled in")).toBeTruthy();
  });

  it("reaches six when every part holds something", async () => {
    await renderColumn();

    fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "a tense meeting");
    await addThought("I will fail");
    fireEvent.press(screen.getAllByText("Anxious")[0]);
    fireEvent.press(screen.getByRole("checkbox", { name: "Catastrophising" }));
    fireEvent.changeText(screen.getByLabelText("Evidence against the thought"), "went fine before");
    fireEvent.changeText(screen.getByLabelText("Balanced thought"), "it may be routine");

    expect(screen.getByText("6 of 6 parts filled in")).toBeTruthy();
  });

  it("empties a part again when the user clears it", async () => {
    await renderColumn();

    fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "a tense meeting");
    expect(screen.getByText("1 of 6 parts filled in")).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "   ");
    expect(screen.getByText("0 of 6 parts filled in")).toBeTruthy();
  });
});

describe("the hot thought", () => {
  it("stays hidden until there are two thoughts to choose between", async () => {
    await renderColumn();

    expect(screen.queryByText("Hot thought")).toBeNull();

    await addThought("I will fail");
    expect(screen.queryByText("Hot thought")).toBeNull();

    await addThought("They saw me shaking");
    expect(screen.getAllByText("Hot thought").length).toBeGreaterThan(0);
  });

  it("defaults to the highest-rated thought and follows the ratings live", async () => {
    await renderColumn();

    await addThought("mild worry", 20);
    await addThought("the strong one", 80);

    const radios = screen.getAllByRole("radio");
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).toBeChecked();

    // Re-rating the other thought higher moves the derived default with it.
    fireEvent.press(within(screen.getByTestId("nat-belief-rating-0")).getByText("90"));
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
  });

  it("keeps an explicit choice even when another thought is rated higher", async () => {
    await renderColumn();

    await addThought("picked by hand", 20);
    await addThought("the strong one", 80);

    fireEvent.press(screen.getAllByRole("radio")[0]);
    expect(screen.getAllByRole("radio")[0]).toBeChecked();

    fireEvent.press(within(screen.getByTestId("nat-belief-rating-1")).getByText("100"));
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
  });
});

describe("saving", () => {
  it("saves a partial record - the last part answered first", async () => {
    await renderColumn();

    fireEvent.changeText(screen.getByLabelText(OUTCOME_NOTES_LABEL), "it loosened");
    await addThought("I will fail", 70);

    await act(async () => {
      fireEvent.press(screen.getByText("Save record"));
    });

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalled());
    const { input } = mockMutateAsync.mock.calls[0][0];
    expect(input.outcomeNotes).toBe("it loosened");
    expect(input.situation).toBe("");
    // The unpicked hot thought is written down as the highest-rated one.
    expect(input.nats).toEqual([{ text: "I will fail", beliefRating: 70, isHotThought: true }]);
  });

  it("asks for the thought at the save rather than disabling the button", async () => {
    await renderColumn();

    fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "everything but a thought");

    await act(async () => {
      fireEvent.press(screen.getByText("Save record"));
    });

    expect(await screen.findByText("Add at least one thought before saving.")).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("drops the complaint once a thought is added", async () => {
    await renderColumn();

    await act(async () => {
      fireEvent.press(screen.getByText("Save record"));
    });
    expect(await screen.findByText("Add at least one thought before saving.")).toBeTruthy();

    await addThought("I will fail");

    expect(screen.queryByText("Add at least one thought before saving.")).toBeNull();
  });
});

describe("finishing later", () => {
  it("leaves the screen and keeps what was typed", async () => {
    jest.useFakeTimers();
    try {
      const first = renderWithProviders(<ThoughtRecordEditorScreen />);
      await screen.findByText("Save record");

      fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "a tense meeting");
      // The draft capture is debounced - let it land before leaving.
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      fireEvent.press(screen.getByText("Finish later"));
      expect(mockBackWithFallback).toHaveBeenCalledWith("/modules/cbt");

      first.unmount();
      renderWithProviders(<ThoughtRecordEditorScreen />);
      await screen.findByText("Save record");
      expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe("a tense meeting");
      expect(screen.getByText("1 of 6 parts filled in")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it("clears the draft when the user discards it", async () => {
    jest.useFakeTimers();
    try {
      await renderColumn();

      fireEvent.changeText(screen.getByLabelText(SITUATION_LABEL), "a tense meeting");
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(useCbtDraftStore.getState().values).not.toBeNull();

      fireEvent.press(screen.getByText("Discard draft"));
      await act(async () => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });

      expect(useCbtDraftStore.getState().values).toBeNull();
      expect(mockBackWithFallback).toHaveBeenCalledWith("/modules/cbt");
    } finally {
      jest.useRealTimers();
    }
  });
});

/**
 * The doors into this form - the check-in's "Go deeper" (#739) and the DBT
 * emotion record's "Look at the whole picture" (#1980) - hand off through the
 * seed store rather than the address bar.
 *
 * ☠️ The owner's rule for every cross-module door (#2206): a live draft WINS,
 * and a notice says so. Before it, the seed was read and cleared unconditionally
 * at mount and then dropped by the `??` under the draft - so a person holding an
 * unfinished record lost the paragraph they had just written, silently, with
 * nothing left to re-press.
 *
 * ☠️☠️ **A hand-off lives exactly as long as the navigation that carried it.**
 * The rule above used to be implemented by LEAVING the seed in its store for "the
 * next fresh open", and that stored state is what three rounds of edge cases came
 * out of: it needed a window, the window ran from the door tap rather than from
 * the deferral, and a window cannot express intent anyway - an unrelated open of
 * this form minutes later still arrived pre-filled with another episode's words.
 * The door mints, this form consumes, and nothing is stored across a navigation:
 * a kept draft DROPS the hand-off and the toast says so.
 */
describe("a door's hand-off", () => {
  const HANDOFF_BODY =
    "Nothing was carried over from where you just were. " +
    "Finish or discard this draft, then use that button again.";

  /** What the store is still holding - the whole of it, so a leftover cannot hide. */
  const seedInStore = () => {
    const { emotions, situation } = useThoughtRecordSeedStore.getState();
    return { emotions, situation };
  };

  beforeEach(() => {
    useThoughtRecordSeedStore.setState({ emotions: [], situation: "" });
    useToastStore.getState().clearToasts();
  });

  it("opens the form on the hand-off when no draft is held", async () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();

    expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe(
      "She did not reply for three days",
    );
    // Taken, so it can never be applied twice.
    expect(seedInStore()).toEqual({ emotions: [], situation: "" });
    expect(useToastStore.getState().visible).toBeNull();
  });

  /**
   * ☠️☠️ **The assertion that used to stand here was `hasThoughtRecordSeed() === true`**
   * - the hand-off left waiting "for the next fresh open". It is replaced, not
   * weakened: leaving it there is the stored state every later round of edge
   * cases came out of, and what waits is a paragraph about an episode that a
   * later, unrelated open of this form can silently pre-fill itself with. The
   * draft still wins and the person is still told; what they are told is now
   * true, and it says what to do to get the hand-off back.
   */
  it("keeps a held draft, says so, and drops the hand-off rather than storing it", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "the half-written one" });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();

    // The draft the person was holding, not the hand-off.
    expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe("the half-written one");
    expect(useToastStore.getState().visible?.title).toBe("Kept your open draft");
    expect(useToastStore.getState().visible?.description).toBe(HANDOFF_BODY);
    // ☠️ And on the form itself, where no toast policy can discard it.
    expect(within(screen.getByTestId("handoff-notice")).getByText(HANDOFF_BODY)).toBeTruthy();
    // ☠️ Nothing left behind: not the paragraph, not a flag about it.
    expect(seedInStore()).toEqual({ emotions: [], situation: "" });
  });

  /**
   * ☠️☠️ **A later open of this form is a fresh intention, and no clock decides that.**
   * The person finishes the record they were holding and comes back from the CBT
   * hub to write about today. There is no hand-off any more, so the Situation is
   * empty - it does not matter whether one minute or one hour passed, which is
   * exactly what a freshness window could never express.
   */
  it("opens empty when the form is opened again after a hand-off was dropped", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "the half-written one" });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    const view = await renderColumn();
    view.unmount();

    // The draft is finished with, and the person opens the form from the hub.
    useCbtDraftStore.getState().reset();
    useToastStore.getState().clearToasts();
    await renderColumn();

    expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe("");
    expect(useToastStore.getState().visible).toBeNull();
  });

  /**
   * ☠️ The notice is about a decision this arrival caused. `keptDraft` is
   * recomputed at every mount from (seed present) AND (draft has content) and
   * neither side is consumed on that path - so it used to re-announce the
   * hand-off on every visit for as long as the draft was held, including visits
   * reached from the hub with no hand-off in mind.
   */
  it("says it kept the draft once, not on every visit while the draft is held", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "the half-written one" });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    const first = await renderColumn();
    expect(useToastStore.getState().visible?.title).toBe("Kept your open draft");
    first.unmount();

    useToastStore.getState().clearToasts();
    await renderColumn();

    expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe("the half-written one");
    expect(useToastStore.getState().visible).toBeNull();
  });

  /**
   * ☠️☠️ **The notice has to survive a toast slot that is allowed to throw it
   * away.** The seed is consumed and unrecoverable, so this sentence is the only
   * record that anything was dropped - and `showToast` refuses a success outright
   * while an unread error is in the slot (a failed save, the query client's own
   * "couldn't save" toast), drops it on a full queue, and takes it away after
   * 2.5s on the path where it does show. All three end with the person returning
   * to a form they expected the judgement in, finding it empty, and never having
   * been told why. The inline line is the channel that cannot be discarded.
   */
  it("says the hand-off was dropped inline, even when the toast slot refuses the toast", async () => {
    // An unread error owns the slot; the store never displaces one with a success.
    useToastStore.getState().showToast({ title: "Couldn't save that", tone: "error" });
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "the half-written one" });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();

    // The toast was discarded - the error is still what is showing.
    expect(useToastStore.getState().visible?.title).toBe("Couldn't save that");
    const notice = within(screen.getByTestId("handoff-notice"));
    expect(notice.getByText("Kept your open draft")).toBeTruthy();
    expect(notice.getByText(HANDOFF_BODY)).toBeTruthy();
  });

  it("lets the person dismiss the notice once they have read it", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "the half-written one" });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();
    fireEvent.press(within(screen.getByTestId("handoff-notice")).getByLabelText("Close"));

    expect(screen.queryByTestId("handoff-notice")).toBeNull();
  });

  /**
   * And nothing to dismiss when nothing was dropped: the notice is about a
   * decision this arrival made, not a fixture of the form.
   */
  it("shows no notice when the hand-off landed", async () => {
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();

    expect(screen.queryByTestId("handoff-notice")).toBeNull();
  });

  /**
   * Content, not presence: the form captures into the draft store while the
   * person types, so a draft object whose every part is back at empty is not
   * held work, and the hand-off takes it.
   */
  it("still lands over a draft that holds nothing", async () => {
    useCbtDraftStore.getState().setValues({ ...defaultValues, situation: "   " });
    seedThoughtRecord(["anxious"], "She did not reply for three days");

    await renderColumn();

    expect(screen.getByLabelText(SITUATION_LABEL).props.value).toBe(
      "She did not reply for three days",
    );
    expect(seedInStore()).toEqual({ emotions: [], situation: "" });
    expect(useToastStore.getState().visible).toBeNull();
  });
});
