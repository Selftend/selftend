import { fireEvent, screen } from "@testing-library/react-native";

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
      Handle: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
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
