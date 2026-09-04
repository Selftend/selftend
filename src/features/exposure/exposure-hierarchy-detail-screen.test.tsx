import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";

import ExposureHierarchyDetailScreen from "@/app/(app)/modules/cbt/exposure/[id]";
import {
  useDeleteHierarchy,
  useExposureItems,
  useExposureSessions,
  useHierarchy,
  useSaveExposureSession,
} from "@/src/features/exposure/queries";
import i18n from "@/src/i18n";
import { useToastStore } from "@/src/stores/toast-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "hierarchy-1" }),
  usePathname: () => "/modules/cbt/exposure/hierarchy-1",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/exposure/queries", () => ({
  useDeleteHierarchy: jest.fn(),
  useExposureItems: jest.fn(),
  useExposureSessions: jest.fn(),
  useHierarchy: jest.fn(),
  useSaveExposureSession: jest.fn(),
}));

const mockUseHierarchy = jest.mocked(useHierarchy);
const mockUseExposureItems = jest.mocked(useExposureItems);
const mockUseExposureSessions = jest.mocked(useExposureSessions);
const mockUseSaveExposureSession = jest.mocked(useSaveExposureSession);
const mockUseDeleteHierarchy = jest.mocked(useDeleteHierarchy);

const saveSession = jest.fn();
const deleteHierarchy = jest.fn();

const hierarchy = { id: "hierarchy-1", title: "Crowded places", anxietyType: "Social anxiety" };
const item = {
  id: "item-1",
  hierarchyId: "hierarchy-1",
  description: "Ride the bus one stop",
  sudsRating: 40,
  position: 0,
  completedAt: null,
};

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  // The error toast this surface used to raise is sticky, so the real teardown runs
  // between cases rather than leaving one test asserting on another's toast.
  useToastStore.getState().clearToasts();

  mockUseHierarchy.mockReturnValue({ data: hierarchy, isLoading: false } as unknown as ReturnType<
    typeof useHierarchy
  >);
  mockUseExposureItems.mockReturnValue({ data: [item], isLoading: false } as unknown as ReturnType<
    typeof useExposureItems
  >);
  mockUseExposureSessions.mockReturnValue({ data: [] } as unknown as ReturnType<
    typeof useExposureSessions
  >);
  mockUseSaveExposureSession.mockReturnValue({
    mutateAsync: saveSession,
    isPending: false,
  } as unknown as ReturnType<typeof useSaveExposureSession>);
  mockUseDeleteHierarchy.mockReturnValue({
    mutateAsync: deleteHierarchy,
  } as unknown as ReturnType<typeof useDeleteHierarchy>);
});

/** Opens the session sheet and fills the two ratings the save button is gated on. */
function openSheetAndRate() {
  fireEvent.press(screen.getByText("Start session"));
  // Both NumberRatings render the same numbers; the pre-exposure one comes first.
  fireEvent.press(screen.getAllByText("30")[0]);
  fireEvent.press(screen.getAllByText("60")[1]);
}

async function pressSave() {
  await act(async () => {
    fireEvent.press(screen.getByText("Save session"));
  });
}

/**
 * ☠️ Neither failure here may reach a toast (#1335, spec §10).
 *
 * Both fire from inside an opaque native modal that stays open — the session sheet and
 * the delete confirmation. On Android nothing can lift a toast above a native modal:
 * `FullWindowOverlay` is iOS-only, and giving the toast its own Android `Modal` would
 * block every touch below it, which the inert-body rule disqualifies. So the error is
 * rendered inline, where the modal that raised it can actually show it.
 */
describe("ExposureHierarchyDetailScreen error surfaces", () => {
  describe("the session sheet", () => {
    // M5/#1257: the ghost Cancel that sat beside Save promised the same thing
    // as the pinned X, so the sheet carries exactly one close affordance now.
    it("closes from the pinned Escape, its only close affordance", () => {
      renderWithProviders(<ExposureHierarchyDetailScreen />);
      fireEvent.press(screen.getByText("Start session"));

      expect(screen.getByText("Exposure session")).toBeTruthy();
      expect(screen.getAllByLabelText("Close")).toHaveLength(1);
      expect(screen.queryByText("Cancel")).toBeNull();

      fireEvent.press(screen.getByTestId("modal-escape"));
      expect(screen.queryByText("Exposure session")).toBeNull();
    });

    it("shows the save failure inline in the sheet, and raises no toast", async () => {
      saveSession.mockRejectedValue(new Error("network"));
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      openSheetAndRate();
      await pressSave();

      expect(screen.getByText("Unable to save the session. Try again.")).toBeTruthy();
      expect(useToastStore.getState().visible).toBeNull();
    });

    it("keeps the sheet open on failure so the inline error has somewhere to show", async () => {
      saveSession.mockRejectedValue(new Error("network"));
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      openSheetAndRate();
      await pressSave();

      // The sheet's own heading is still mounted alongside the error.
      expect(screen.getByText("Exposure session")).toBeTruthy();
    });

    /**
     * ☠️ The success path was never broken and must not be "fixed": it toasts and THEN
     * closes the sheet, so its toast lands on a screen with no modal over it.
     */
    it("leaves the success path toasting after it closes the sheet", async () => {
      saveSession.mockResolvedValue(undefined);
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      openSheetAndRate();
      await pressSave();

      expect(useToastStore.getState().visible).toMatchObject({ tone: "success" });
      expect(screen.queryByText("Unable to save the session. Try again.")).toBeNull();
    });

    /** It replaces a toast, which announced itself; silence would be a downgrade. */
    it("announces the failure rather than only painting it", async () => {
      saveSession.mockRejectedValue(new Error("network"));
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      openSheetAndRate();
      await pressSave();

      expect(screen.getByText("Unable to save the session. Try again.").props.role).toBe("alert");
    });

    it("clears a previous failure when the save is retried", async () => {
      saveSession.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      openSheetAndRate();
      await pressSave();
      expect(screen.getByText("Unable to save the session. Try again.")).toBeTruthy();

      await pressSave();

      expect(screen.queryByText("Unable to save the session. Try again.")).toBeNull();
    });
  });

  /**
   * The second path out of this file, and the same shape: `DeleteEntryButton` keeps its
   * confirmation open when the delete rejects, so a global toast would land behind it.
   * `ConfirmDialog` already carries an `error` slot for exactly this.
   */
  describe("the delete confirmation", () => {
    it("shows the delete failure inside the dialog, and raises no toast", async () => {
      deleteHierarchy.mockRejectedValue(new Error("network"));
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      fireEvent.press(screen.getByText("Delete ladder"));
      await act(async () => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });

      await waitFor(() =>
        expect(screen.getByText("Unable to delete the ladder. Try again.")).toBeTruthy(),
      );
      expect(useToastStore.getState().visible).toBeNull();
    });

    /**
     * ⚠️ `DeleteEntryButton` owns `visible`, so only it knows the dialog is reopening.
     * Without its `onOpen`, a failure the user cancelled out of would still be sitting
     * in the dialog the next time they opened it.
     */
    it("does not show the previous failure when the dialog is reopened", async () => {
      deleteHierarchy.mockRejectedValue(new Error("network"));
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      fireEvent.press(screen.getByText("Delete ladder"));
      await act(async () => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });
      await waitFor(() =>
        expect(screen.getByText("Unable to delete the ladder. Try again.")).toBeTruthy(),
      );

      fireEvent.press(screen.getByText("Cancel"));
      fireEvent.press(screen.getByText("Delete ladder"));

      expect(screen.queryByText("Unable to delete the hierarchy. Try again.")).toBeNull();
    });

    it("still toasts and leaves the screen on a successful delete", async () => {
      deleteHierarchy.mockResolvedValue(undefined);
      renderWithProviders(<ExposureHierarchyDetailScreen />);

      fireEvent.press(screen.getByText("Delete ladder"));
      await act(async () => {
        fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
      });

      expect(useToastStore.getState().visible).toMatchObject({ tone: "success" });
    });
  });
});
