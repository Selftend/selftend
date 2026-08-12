import { fireEvent, screen, within } from "@testing-library/react-native";
import { Platform } from "react-native";

import { ManageEmotionsModal } from "@/src/features/mood/manage-emotions-modal";
import { useEmotionUsageCounts } from "@/src/features/mood/emotion-preferences-queries";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

// jest.mock factories are hoisted above these, so the `mock` prefix is what lets them
// be referenced from inside one.
const mockRemoveEmotion = jest.fn();
const mockUpsertEmotion = jest.fn();

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({
    data: [
      {
        id: "anxious",
        userId: "user-1",
        emotionId: "anxious",
        name: null,
        emoji: null,
        position: 0,
        removed: false,
        isCustom: false,
      },
      {
        id: "grateful",
        userId: "user-1",
        emotionId: "grateful",
        name: null,
        emoji: null,
        position: 1,
        removed: false,
        isCustom: false,
      },
    ],
    isLoading: false,
  }),
  useEmotionUsageCounts: jest.fn(() => ({ data: { anxious: 3 } })),
  useUpsertEmotionPreference: () => ({ mutate: mockUpsertEmotion }),
  useReorderEmotions: () => ({ mutate: jest.fn() }),
  useRemoveEmotion: () => ({ mutate: mockRemoveEmotion }),
  useAddCustomEmotion: () => ({ mutate: jest.fn() }),
}));

// Sortable renders through gesture-handler and reanimated worklets; the list semantics
// under test are the rows, not the drag machinery.
jest.mock("react-native-sortables", () => {
  const { View } = require("react-native");
  const React = require("react");
  return {
    __esModule: true,
    default: {
      Grid: ({
        data,
        renderItem,
        keyExtractor,
      }: {
        data: { id: string }[];
        renderItem: (arg: { item: { id: string } }) => React.ReactNode;
        keyExtractor: (item: { id: string }) => string;
      }) => (
        <View>
          {data.map((item) => (
            <View key={keyExtractor(item)}>{renderItem({ item })}</View>
          ))}
        </View>
      ),
      Handle: ({ children }: { children: React.ReactNode }) => (
        <View testID="sortable-handle">{children}</View>
      ),
    },
  };
});

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return { GestureHandlerRootView: View };
});

const mockUseEmotionUsageCounts = useEmotionUsageCounts as jest.MockedFunction<
  typeof useEmotionUsageCounts
>;

function open() {
  return renderWithProviders(<ManageEmotionsModal visible onClose={() => {}} />);
}

describe("ManageEmotionsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEmotionUsageCounts.mockReturnValue({
      data: { anxious: 3 },
    } as unknown as ReturnType<typeof useEmotionUsageCounts>);
  });

  /**
   * Six hit targets per row did not fit 360dp, and the design's answer - reveal the edit
   * and delete buttons on hover - has no phone equivalent at all (#702).
   */
  describe("the row", () => {
    it("carries no inline edit or delete button", () => {
      open();

      expect(screen.queryByLabelText("Delete")).toBeNull();
      expect(screen.queryByLabelText("Edit emotion")).toBeNull();
    });

    it("opens the editor when the row itself is tapped", () => {
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));

      expect(screen.getByLabelText("Name")).toBeTruthy();
    });

    /**
     * No usage signal on the row at all — #903 reversed #702's "unused" tag on the
     * owner's 2026-08-12 review. The lifetime count surfaces only inside the delete
     * confirmation. `grateful` is absent from the counts response (the RPC returns no
     * row for an unused emotion), so this mock covers both the unused and the used case.
     */
    it("shows no usage signal on the row, not even for an unused emotion", () => {
      open();

      expect(screen.queryByText("unused")).toBeNull();
      expect(screen.queryByText("3")).toBeNull();
    });

    /**
     * The handle must sit beside the press target, never inside it (#915): on web,
     * gesture-handler's pan does not cancel an enclosing Pressable the way native
     * gesture arbitration does, and the dragged row travels with the cursor — so a
     * drag that starts on a handle inside the Pressable also fires the row press on
     * release, opening the editor after every reorder.
     */
    it("keeps the drag handle outside the row press target", () => {
      open();

      // The handle is rendered… (guards against the sweep-rot where the null
      // assertion below keeps passing because the handle vanished entirely)
      expect(screen.getAllByTestId("sortable-handle").length).toBeGreaterThan(0);
      // …but never inside the pressable that opens the editor.
      expect(
        within(screen.getByLabelText("Edit Anxious")).queryByTestId("sortable-handle"),
      ).toBeNull();
    });
  });

  /**
   * On web the surface is a self-styled panel over a pressable scrim (#905, design 2E);
   * native keeps the plain sheet, where the scrim would be dead weight behind a
   * full-size presentation.
   */
  describe("the web shell", () => {
    let platform: ReturnType<typeof jest.replaceProperty>;

    beforeEach(() => {
      platform = jest.replaceProperty(Platform, "OS", "web");
    });

    afterEach(() => {
      platform.restore();
    });

    it("closes the surface when the backdrop is pressed from the list", () => {
      const onClose = jest.fn();
      renderWithProviders(<ManageEmotionsModal visible onClose={onClose} />);

      fireEvent.press(screen.getByTestId("manage-emotions-backdrop"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("peels the editor first: a backdrop press returns to the list, not out", () => {
      const onClose = jest.fn();
      renderWithProviders(<ManageEmotionsModal visible onClose={onClose} />);

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByTestId("manage-emotions-backdrop"));

      // Same one-dismiss-layer semantics as the back gesture (#743).
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Manage emotions")).toBeTruthy();
    });
  });

  it("renders no scrim on native, where the modal is a real sheet", () => {
    open();

    expect(screen.queryByTestId("manage-emotions-backdrop")).toBeNull();
  });

  describe("the editor", () => {
    it("replaces the list in the same modal rather than stacking a second one", () => {
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));

      // The list's own heading is gone: one modal, two views, one dismiss layer.
      expect(screen.queryByText("Manage emotions")).toBeNull();
      expect(screen.getByText("Edit emotion")).toBeTruthy();
    });

    it("holds the delete action, and states the lifetime count before removing anything", () => {
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByText("Delete"));

      expect(
        screen.getByText(
          "You have used it on 3 check-ins. Those entries keep it — it only disappears from the picker.",
        ),
      ).toBeTruthy();
      // Nothing is removed until the confirmation is answered.
      expect(mockRemoveEmotion).not.toHaveBeenCalled();
    });

    it("removes the emotion once the confirmation is accepted", () => {
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByText("Delete"));
      // The dialog's own confirm button, not the one that opened it.
      fireEvent.press(screen.getAllByText("Delete")[1]);

      expect(mockRemoveEmotion).toHaveBeenCalledWith({ emotionId: "anxious", isCustom: false });
    });

    it("says nothing is lost for an emotion that has never been used", () => {
      open();

      fireEvent.press(screen.getByLabelText("Edit Grateful"));
      fireEvent.press(screen.getByText("Delete"));

      // `grateful` is absent from the response, which means zero - not unknown.
      expect(screen.getByText("You have never used it. Nothing is lost.")).toBeTruthy();
    });

    it("falls back to the plain warning while the count is still loading", () => {
      mockUseEmotionUsageCounts.mockReturnValue({ data: undefined } as unknown as ReturnType<
        typeof useEmotionUsageCounts
      >);
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByText("Delete"));

      expect(
        screen.getByText("It disappears from the picker. Check-ins that already name it keep it."),
      ).toBeTruthy();
    });

    it("offers no delete when adding a new emotion", () => {
      open();

      fireEvent.press(screen.getByText("Add emotion"));

      expect(screen.getByText("New emotion")).toBeTruthy();
      expect(screen.queryByText("Delete")).toBeNull();
    });
  });
});
