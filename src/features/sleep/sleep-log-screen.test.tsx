import { fireEvent, screen } from "@testing-library/react-native";

import { SleepLogScreen } from "@/src/features/sleep/sleep-log-screen";
import { useSleepLog, useSleepLogs, useSaveSleepLog } from "@/src/features/sleep/queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/tools/sleep/new",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLog: jest.fn(),
  useSleepLogs: jest.fn(),
  useSaveSleepLog: jest.fn(),
}));

const mockUseSleepLog = useSleepLog as jest.MockedFunction<typeof useSleepLog>;
const mockUseSleepLogs = useSleepLogs as jest.MockedFunction<typeof useSleepLogs>;
const mockUseSaveSleepLog = useSaveSleepLog as jest.MockedFunction<typeof useSaveSleepLog>;

describe("SleepLogScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSleepLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useSleepLog>);
    mockUseSleepLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useSleepLogs>);
    mockUseSaveSleepLog.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useSaveSleepLog>);
  });

  it("renders the ink field header in create mode", () => {
    renderWithProviders(<SleepLogScreen fallbackHref="/tools/sleep" mode="create" />);

    expect(screen.getByTestId("module-field-gradient")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Log sleep" })).toBeTruthy();
    expect(screen.getByLabelText("Add 30 minutes")).toBeTruthy();
  });

  it("keeps the compact header (no field) in edit mode", () => {
    mockUseSleepLogs.mockReturnValue({
      data: [
        {
          id: "s-1",
          userId: "user-1",
          durationMinutes: 420,
          quality: 3,
          notes: "",
          loggedAt: "2026-07-20T22:30:00.000Z",
          loggedOffsetMinutes: 0,
          createdAt: "2026-07-20T22:30:00.000Z",
        },
      ],
    } as unknown as ReturnType<typeof useSleepLogs>);

    renderWithProviders(<SleepLogScreen fallbackHref="/tools/sleep" mode="edit" logId="s-1" />);

    expect(screen.queryByTestId("module-field-gradient")).toBeNull();
    expect(screen.getByRole("heading", { name: "Edit sleep entry" })).toBeTruthy();
    expect(screen.getByText("Update")).toBeTruthy();
  });

  it("shows the quality-required error instead of saving without a rating", () => {
    const mutateAsync = jest.fn();
    mockUseSaveSleepLog.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useSaveSleepLog>);

    renderWithProviders(<SleepLogScreen fallbackHref="/tools/sleep" mode="create" />);

    fireEvent.press(screen.getByText("Save"));

    expect(screen.getByText("Please rate your sleep quality.")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
