import { act, fireEvent, screen } from "@testing-library/react-native";

import ThoughtRecordDetailScreen from "@/src/features/cbt/thought-record-detail-screen";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
import type { ThoughtRecord } from "@/src/features/cbt/types";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

const mockReplace = jest.fn();
const mockShowToast = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => ({ id: "record-1" }),
  usePathname: () => "/modules/cbt/history/record-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecord: jest.fn(),
  useArchiveThoughtRecord: jest.fn(),
}));

jest.mock("@/src/stores/toast-store", () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

const mockUseThoughtRecord = jest.mocked(useThoughtRecord);
const mockUseArchiveThoughtRecord = jest.mocked(useArchiveThoughtRecord);
const mockArchiveMutateAsync = jest.fn();

// A record with NOTHING filled - the base every test builds up from, so a field
// a test does not name never smuggles a row in.
const emptyRecord = {
  id: "record-1",
  situation: "",
  nats: [],
  emotions: [],
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  outcomeNotes: "",
  emotionIntensityBefore: null,
  emotionIntensityAfter: null,
  beliefAfter: null,
  updatedAt: "2026-07-29T10:00:00.000Z",
};

function givenRecord(overrides: Partial<ThoughtRecord>) {
  mockUseThoughtRecord.mockReturnValue({
    data: { ...emptyRecord, ...overrides },
    isLoading: false,
  } as unknown as ReturnType<typeof useThoughtRecord>);
}

// The pretty-printer walking RNTL nodes trips jest's console guard, so
// assertions on absence go through counts/strings, never node arrays.
function detailRowCount() {
  return screen.queryAllByTestId("detail-row").length;
}

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockArchiveMutateAsync.mockResolvedValue(undefined);
  givenRecord({});
  mockUseArchiveThoughtRecord.mockReturnValue({
    isPending: false,
    mutateAsync: mockArchiveMutateAsync,
  } as unknown as ReturnType<typeof useArchiveThoughtRecord>);
});

describe("ThoughtRecordDetailScreen row set", () => {
  it("renders only the filled rows on a deliberately partial record (#1384)", () => {
    givenRecord({
      situation: "A difficult meeting",
      nats: [{ text: "They will call me out", beliefRating: null, isHotThought: true }],
    });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    // The one filled field beyond the heading is the situation.
    expect(screen.getByText("A difficult meeting")).toBeTruthy();
    expect(detailRowCount()).toBe(1);
    expect(screen.queryByText("Not filled yet.")).toBeNull();
    expect(screen.queryByText("Evidence for")).toBeNull();
    expect(screen.queryByText("Balanced thought")).toBeNull();
    expect(screen.queryByText("Intensity")).toBeNull();
  });

  it("renders a header, the generic heading and no rows when nothing is filled", () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Untitled thought record")).toBeTruthy();
    expect(screen.getByText(/Updated/)).toBeTruthy();
    expect(detailRowCount()).toBe(0);
    expect(screen.queryByText("Not filled yet.")).toBeNull();
  });

  it("headlines the hot thought and lists the other thoughts in their own row", () => {
    givenRecord({
      nats: [
        { text: "Nobody said anything yet", beliefRating: 40, isHotThought: false },
        { text: "They will call me out", beliefRating: 85, isHotThought: true },
      ],
    });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    // The hot thought is the heading, once - not repeated as a row.
    expect(screen.getAllByText("They will call me out").length).toBe(1);
    expect(screen.getByText("Nobody said anything yet")).toBeTruthy();
    expect(screen.getByText(/Belief rating: 40%/)).toBeTruthy();
  });

  it("leads with the belief pair when both numbers exist", () => {
    givenRecord({
      nats: [{ text: "They will call me out", beliefRating: 85, isHotThought: true }],
      beliefAfter: 40,
    });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Belief before")).toBeTruthy();
    expect(screen.getByText("85")).toBeTruthy();
    expect(screen.getByText("Belief after")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
  });

  it("omits the belief pair when either number is missing, keeping the lone one as a row", () => {
    givenRecord({
      nats: [{ text: "They will call me out", beliefRating: null, isHotThought: true }],
      beliefAfter: 40,
    });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    // No leading pair (its labels render as standalone nodes)...
    expect(screen.queryByText("Belief before")).toBeNull();
    // ...but the lone number still renders as a row - a record of what the
    // user wrote.
    expect(screen.getByText("Belief rating")).toBeTruthy();
    expect(screen.getByText(/Belief after: 40/)).toBeTruthy();
  });

  it("renders emotion intensity as a plain row without the shift sentence", () => {
    givenRecord({ emotionIntensityBefore: 70, emotionIntensityAfter: 40 });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Intensity")).toBeTruthy();
    expect(screen.getByText(/Before: 70/)).toBeTruthy();
    expect(screen.getByText(/After: 40/)).toBeTruthy();
    expect(screen.queryByText(/shift/)).toBeNull();
  });

  it("renders patterns and feelings as non-interactive chips", () => {
    givenRecord({ emotions: ["anxious"], distortions: ["catastrophizing"] });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Anxious")).toBeTruthy();
    expect(screen.getByText("Catastrophising")).toBeTruthy();
    // StaticChip is a plain View - no checkbox or button wraps a chip label.
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
  });

  it("keeps the three undrawn keepers: other thoughts, outcome notes, breathing nudge", () => {
    givenRecord({
      nats: [
        { text: "They will call me out", beliefRating: 85, isHotThought: true },
        { text: "Nobody said anything yet", beliefRating: null, isHotThought: false },
      ],
      outcomeNotes: "Less certain now.",
    });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Nobody said anything yet")).toBeTruthy();
    expect(screen.getByText("Less certain now.")).toBeTruthy();
    expect(screen.getByText("Want to ground yourself?")).toBeTruthy();
  });

  it("shows the evidence rows under their short display labels", () => {
    givenRecord({ evidenceFor: ["The message says we need to talk."], evidenceAgainst: [] });
    renderWithProviders(<ThoughtRecordDetailScreen />);

    expect(screen.getByText("Evidence for")).toBeTruthy();
    expect(screen.getByText(/The message says we need to talk./)).toBeTruthy();
    expect(screen.queryByText("Evidence against")).toBeNull();
  });
});

describe("ThoughtRecordDetailScreen delete confirmation", () => {
  it("asks for confirmation instead of deleting on the first tap", () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));

    expect(screen.getByText("Delete this record")).toBeTruthy();
    expect(mockArchiveMutateAsync).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("deletes and returns to history only after the dialog is confirmed", async () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    expect(mockArchiveMutateAsync).toHaveBeenCalledWith("record-1");
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
    expect(mockReplace).toHaveBeenCalledWith("/modules/cbt/history");
  });

  it("cancelling the dialog deletes nothing", () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    fireEvent.press(screen.getByText("Cancel"));

    expect(mockArchiveMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText("Delete this record")).toBeNull();
  });

  it("keeps the failure toast and the out-of-dialog error card after the dialog closes", async () => {
    mockArchiveMutateAsync.mockRejectedValue(new Error("boom"));
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    // A rejected delete keeps the confirmation open with the reason...
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    expect(mockReplace).not.toHaveBeenCalled();

    // ...and cancelling still leaves the failure on the screen itself.
    fireEvent.press(screen.getByText("Cancel"));
    expect(screen.getAllByText("Unable to delete the record.").length).toBeGreaterThan(0);
    expect(screen.getByText("Delete problem")).toBeTruthy();
  });
});
