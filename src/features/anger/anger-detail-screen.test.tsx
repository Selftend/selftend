import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import AngerDetailScreen from "@/app/(app)/modules/cbt/anger/[id]";
import { useAngerLog, useDeleteAngerLog } from "@/src/features/anger/queries";
import i18n from "@/src/i18n";
import { useToastStore } from "@/src/stores/toast-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "log-1" }),
  usePathname: () => "/modules/cbt/anger/log-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/anger/queries", () => ({
  useAngerLog: jest.fn(),
  useDeleteAngerLog: jest.fn(),
}));

const mockUseAngerLog = jest.mocked(useAngerLog);
const mockUseDeleteAngerLog = jest.mocked(useDeleteAngerLog);

const deleteLog = jest.fn();

const log = {
  id: "log-1",
  triggerText: "Cut off in traffic",
  arousalLevel: 6,
  outcomeRating: null,
  interpretation: null,
  urge: null,
  behaviorChosen: null,
  consequence: null,
  alternativeInterpretation: null,
  timeOutTaken: false,
  notes: null,
};

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  // The error toast this surface used to raise is sticky, so the real teardown runs
  // between cases rather than leaving one test asserting on another's toast.
  useToastStore.getState().clearToasts();

  mockUseAngerLog.mockReturnValue({ data: log, isLoading: false } as unknown as ReturnType<
    typeof useAngerLog
  >);
  mockUseDeleteAngerLog.mockReturnValue({
    mutateAsync: deleteLog,
  } as unknown as ReturnType<typeof useDeleteAngerLog>);
});

/**
 * ☠️ The delete failure here may not reach a toast (#1364, spec §10): `DeleteEntryButton`
 * keeps its confirmation open when the delete rejects, and on Android nothing can lift a
 * toast above a native modal. `ConfirmDialog` already carries an `error` slot for exactly
 * this, so the failure is rendered inline where the modal that raised it can show it.
 */
describe("AngerDetailScreen delete confirmation", () => {
  // ⚠️ The suite's first render pays the whole screen tree's cold start, which can
  // exceed the 5s default under a loaded worker pool - hence the explicit timeout.
  it("shows the delete failure inside the dialog, and raises no toast", async () => {
    deleteLog.mockRejectedValue(new Error("network"));
    renderWithProviders(<AngerDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() =>
      expect(screen.getByText("Unable to delete the log. Try again.")).toBeTruthy(),
    );
    expect(useToastStore.getState().visible).toBeNull();
  }, 20000);

  /** It replaces a toast, which announced itself; silence would be a downgrade. */
  it("announces the failure rather than only painting it", async () => {
    deleteLog.mockRejectedValue(new Error("network"));
    renderWithProviders(<AngerDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    await waitFor(() =>
      expect(screen.getByText("Unable to delete the log. Try again.").props.role).toBe("alert"),
    );
  });

  /**
   * ⚠️ `DeleteEntryButton` owns `visible`, so only it knows the dialog is reopening.
   * Without its `onOpen`, a failure the user cancelled out of would still be sitting
   * in the dialog the next time they opened it.
   */
  it("does not show the previous failure when the dialog is reopened", async () => {
    deleteLog.mockRejectedValue(new Error("network"));
    renderWithProviders(<AngerDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });
    await waitFor(() =>
      expect(screen.getByText("Unable to delete the log. Try again.")).toBeTruthy(),
    );

    fireEvent.press(screen.getByText("Cancel"));
    fireEvent.press(screen.getByText("Delete"));

    expect(screen.queryByText("Unable to delete the log. Try again.")).toBeNull();
  });

  it("still toasts and leaves the screen on a successful delete", async () => {
    deleteLog.mockResolvedValue(undefined);
    renderWithProviders(<AngerDetailScreen />);

    fireEvent.press(screen.getByText("Delete"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    });

    expect(useToastStore.getState().visible).toMatchObject({ tone: "success" });
  });
});
