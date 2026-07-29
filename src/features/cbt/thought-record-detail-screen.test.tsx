import { act, fireEvent, screen } from "@testing-library/react-native";

import ThoughtRecordDetailScreen from "@/src/features/cbt/thought-record-detail-screen";
import { useArchiveThoughtRecord, useThoughtRecord } from "@/src/features/cbt/queries";
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

const record = {
  id: "record-1",
  situation: "A difficult meeting",
  nats: [],
  emotions: [],
  distortions: [],
  evidenceFor: [],
  evidenceAgainst: [],
  balancedThought: "",
  outcomeNotes: "",
  emotionIntensityBefore: null,
  emotionIntensityAfter: null,
  updatedAt: "2026-07-29T10:00:00.000Z",
};

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockArchiveMutateAsync.mockResolvedValue(undefined);
  mockUseThoughtRecord.mockReturnValue({
    data: record,
    isLoading: false,
  } as unknown as ReturnType<typeof useThoughtRecord>);
  mockUseArchiveThoughtRecord.mockReturnValue({
    isPending: false,
    mutateAsync: mockArchiveMutateAsync,
  } as unknown as ReturnType<typeof useArchiveThoughtRecord>);
});

describe("ThoughtRecordDetailScreen archive confirmation", () => {
  it("asks for confirmation instead of archiving on the first tap", () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Archive"));

    expect(screen.getByText("Archive this record")).toBeTruthy();
    expect(mockArchiveMutateAsync).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("archives and returns to history only after the dialog is confirmed", async () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Archive"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    expect(mockArchiveMutateAsync).toHaveBeenCalledWith("record-1");
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
    expect(mockReplace).toHaveBeenCalledWith("/modules/cbt/history");
  });

  it("cancelling the dialog archives nothing", () => {
    renderWithProviders(<ThoughtRecordDetailScreen />);

    fireEvent.press(screen.getByText("Archive"));
    fireEvent.press(screen.getByText("Cancel"));

    expect(mockArchiveMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText("Archive this record")).toBeNull();
  });
});
