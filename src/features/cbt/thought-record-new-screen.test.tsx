import { act, fireEvent, screen, waitFor, within } from "@testing-library/react-native";

import ThoughtRecordEditorScreen from "@/app/(app)/modules/cbt/new";
import { useSaveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import { useCbtDraftStore } from "@/src/stores/cbt-draft-store";
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

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
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
