import { act, fireEvent, screen, within } from "@testing-library/react-native";
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
const mockReorderEmotions = jest.fn();
const mockAddEmotion = jest.fn();
let mockReorderPending = false;

/**
 * Fails the write the way the real hook does: by calling back the `onError` the caller
 * handed to `mutate`. The mutations themselves opt out of the global toast
 * (`emotion-preferences-queries.test.tsx` proves it), so this callback is the ONLY
 * channel a failure has to reach the user.
 *
 * ☠️ ASYNCHRONOUSLY, and that is not decoration. A network failure lands long after the
 * editor has closed itself, and a synchronous `onError` fires while the editor is still
 * mounted - which would let an implementation that owns its writes in the editor pass
 * here and then report nothing at all in production. Every case using this must `flush()`.
 */
const failWrite = (_variables: unknown, options?: { onError?: () => void }) => {
  setTimeout(() => options?.onError?.(), 0);
};

/** Lets the deferred `failWrite` land, and React re-render with it. */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function mockEmotionRow(emotionId: string, position: number) {
  return {
    id: emotionId,
    userId: "user-1",
    emotionId,
    name: null,
    emoji: null,
    position,
    removed: false,
    isCustom: false,
  };
}

/**
 * Three rows is what every case renders except the lone-row one, which shortens it - the
 * list is settable rather than inlined so "there is nowhere to move to" has a fixture at
 * all. `beforeEach` puts the three back.
 */
const mockFullEmotionList = ["anxious", "grateful", "sad"].map(mockEmotionRow);
let mockEmotionList = mockFullEmotionList;

jest.mock("@/src/features/mood/emotion-preferences-queries", () => ({
  useEmotionPreferences: () => ({
    data: mockEmotionList,
    isLoading: false,
  }),
  useEmotionUsageCounts: jest.fn(() => ({ data: { anxious: 3 } })),
  useUpsertEmotionPreference: () => ({ mutate: mockUpsertEmotion }),
  useReorderEmotions: () => ({ mutate: mockReorderEmotions, isPending: mockReorderPending }),
  useRemoveEmotion: () => ({ mutate: mockRemoveEmotion }),
  useAddCustomEmotion: () => ({ mutate: mockAddEmotion }),
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
        sortEnabled,
        onDragEnd,
      }: {
        data: { id: string }[];
        renderItem: (arg: { item: { id: string } }) => React.ReactNode;
        keyExtractor: (item: { id: string }) => string;
        sortEnabled?: boolean;
        onDragEnd?: (arg: { data: { id: string }[] }) => void;
      }) => (
        // `onDragEnd` is forwarded so the drag path can be dispatched at all: it is the
        // other half of reordering, and jest can never produce a real drag.
        <View testID="emotion-sortable-grid" sortEnabled={sortEnabled} onDragEnd={onDragEnd}>
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

/** The handle is the only control carrying the a11y move actions. */
function moveVia(emotionId: string, action: "moveEarlier" | "moveLater") {
  fireEvent(screen.getByTestId(`emotion-reorder-handle-${emotionId}`), "accessibilityAction", {
    nativeEvent: { actionName: action },
  });
}

describe("ManageEmotionsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ☠️ `clearAllMocks` clears CALLS but not implementations, so a `mockImplementation`
    // set by one failure case is still the fallback in every case after it - which makes
    // "the retry succeeded" unprovable. These four are reset outright.
    for (const write of [
      mockUpsertEmotion,
      mockRemoveEmotion,
      mockReorderEmotions,
      mockAddEmotion,
    ]) {
      write.mockReset();
    }
    mockReorderPending = false;
    mockEmotionList = mockFullEmotionList;
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
   * Order is the whole point of this surface - it sets the picker's arrangement - and
   * until #965 the only way to change it was a drag. That fails WCAG 2.2 SC 2.5.7
   * (Dragging Movements, AA) and left a screen-reader or keyboard-only user able to add,
   * rename and delete emotions but not to order them.
   */
  describe("the non-drag reorder path", () => {
    it("moves an emotion later through the handle's move-later action", () => {
      open();

      moveVia("anxious", "moveLater");

      // The `onError` rides along on every write: it is the only channel a failure has
      // to reach the user from inside this modal (#1335).
      expect(mockReorderEmotions).toHaveBeenCalledWith(["grateful", "anxious", "sad"], {
        onError: expect.any(Function),
      });
    });

    it("moves an emotion earlier through the handle's move-earlier action", () => {
      open();

      moveVia("sad", "moveEarlier");

      expect(mockReorderEmotions).toHaveBeenCalledWith(["anxious", "sad", "grateful"], {
        onError: expect.any(Function),
      });
    });

    it("writes nothing when the move would leave the list", () => {
      open();

      moveVia("anxious", "moveEarlier");
      moveVia("sad", "moveLater");

      expect(mockReorderEmotions).not.toHaveBeenCalled();
    });

    /**
     * The labels a screen reader reads come from `mood:emotions.manage.*` and name the
     * emotion, matching `editEmotion`'s shape - not borrowed from `navigation`, whose
     * strings say "tool".
     */
    it("exposes both moves as named accessibility actions on the handle", () => {
      open();

      const handle = screen.getByTestId("emotion-reorder-handle-anxious");
      expect(handle.props.accessibilityActions).toEqual([
        { name: "moveEarlier", label: "Move Anxious earlier" },
        { name: "moveLater", label: "Move Anxious later" },
      ]);
      expect(handle.props.accessibilityRole).toBe("button");
      expect(handle.props.accessibilityLabel).toBe("Reorder Anxious");
      expect(handle.props.focusable).toBe(true);
    });

    /**
     * ⚠️ The hint must not name the arrow keys. react-native-web does not implement
     * `accessibilityHint` at all, so the string reaches ONLY native AT - where the rotor
     * actions are the path and there are no arrow keys to press. This one states the
     * outcome instead; the old Home arrange handle's hint was brought to the same shape in
     * #1047 (both went with the dashboard in #1959, so this is the one assertion left).
     */
    it("hints at the outcome, not at keys the platform reading it does not have", () => {
      open();

      const hint = screen.getByTestId("emotion-reorder-handle-anxious").props.accessibilityHint;
      expect(hint).toBe("Moves this emotion up or down in the list.");
      expect(hint).not.toMatch(/arrow|key/i);
    });

    /**
     * The arrow keys are the WEB half of the same two moves, and jest runs the native
     * platform - so what is asserted here is that the fork exists and native carries no
     * `onKeyDown`. Same shape the old arrange screen's test used for the shared helper.
     */
    it("carries no web key handler on native", () => {
      open();

      expect(screen.getByTestId("emotion-reorder-handle-anxious").props.onKeyDown).toBeUndefined();
    });

    /**
     * ☠️ `focusable` is `tabIndex` under react-native-web, so folding "a write is in
     * flight" into it takes the focused handle out of the tab order while the reorder
     * settles - the user's second Arrow press lands on the document and reordering by
     * keyboard works exactly once per row. The in-flight guard lives in the move instead,
     * where a rejected move costs a no-op rather than the focus ring.
     */
    it("keeps the handle focusable while a write is in flight", () => {
      mockReorderPending = true;
      open();

      expect(screen.getByTestId("emotion-reorder-handle-anxious").props.focusable).toBe(true);
    });

    it("still refuses the move itself while a write is in flight", () => {
      mockReorderPending = true;
      open();

      moveVia("anxious", "moveLater");

      expect(mockReorderEmotions).not.toHaveBeenCalled();
    });

    /**
     * ☠️ The keyboard half was withheld on a one-emotion list from the start and the rotor
     * half was not, so VoiceOver and TalkBack were still offered "Move Anxious earlier" /
     * "Move Anxious later" on a list with nowhere to move to, and both did nothing (#1049).
     * `focusable: false` hid the whole handle from the keyboard, which is why this reached
     * native AT only. The hint goes with them: it is read AFTER the label, and native AT is
     * the only listener that hears it, so an outcome nothing can produce is worse than
     * silence. (The old Home arrange handle carried the matching assertions until #1959.)
     */
    it("offers a one-emotion list's handle no move, and no hint either", () => {
      mockEmotionList = [mockFullEmotionList[0]];
      open();

      const handle = screen.getByTestId("emotion-reorder-handle-anxious");
      expect(handle.props.accessibilityActions).toEqual([]);
      expect(handle.props.accessibilityHint).toBeUndefined();
      expect(handle.props.focusable).toBe(false);
      // The label stays - the handle is still there to drag against, once there is a
      // second row to drag past.
      expect(handle.props.accessibilityLabel).toBe("Reorder Anxious");
    });

    it("writes nothing when a one-emotion list's move is dispatched anyway", () => {
      mockEmotionList = [mockFullEmotionList[0]];
      open();

      moveVia("anxious", "moveLater");

      expect(mockReorderEmotions).not.toHaveBeenCalled();
    });

    /**
     * ☠️ A tripwire, not a proof - and the reason is worth more than the assertion.
     *
     * The old Home arrange screen passed `sortEnabled={!mutationPending}` and it is the
     * obvious thing to mirror here, so a reviewer will ask for it. MEASURED: adding it makes the SECOND
     * keyboard move stop writing. `manage-emotions-reorder.e2e` fails on exactly the "and
     * AGAIN, without re-focusing" press and passes with the prop removed and nothing else
     * changed - binding it to a flag that flips on every write re-renders the grid mid-move
     * and the handle element Sortable holds goes stale.
     *
     * This test cannot catch that: the Sortable mock above renders each row exactly once,
     * so the whole failure is structurally invisible to jest. It only pins the decision so
     * the next person meets the reasoning before the e2e meets them.
     */
    it("leaves the grid's sortEnabled unbound - see the e2e, jest cannot see why", () => {
      open();

      expect(screen.getByTestId("emotion-sortable-grid").props.sortEnabled).toBeUndefined();
    });

    /**
     * ⚠️ Making the handle interactive is exactly the change that tempts someone to fold
     * it into the row `Pressable` - and that is the #915/#922 structural bug: on web
     * gesture-handler's pan does not cancel an enclosing Pressable, so a drag would also
     * open the editor on release. The handle stays a sibling.
     */
    it("keeps the now-interactive handle outside the row press target", () => {
      open();

      expect(
        within(screen.getByLabelText("Edit Anxious")).queryByTestId(
          "emotion-reorder-handle-anxious",
        ),
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

      expect(mockRemoveEmotion).toHaveBeenCalledWith(
        { emotionId: "anxious", isCustom: false },
        { onError: expect.any(Function) },
      );
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

  /**
   * ☠️ None of these four failures may be a toast (#1335, spec §10).
   *
   * This surface is an opaque `pageSheet` that stays OPEN across every one of them, and
   * on Android nothing can lift a toast above a native modal: `FullWindowOverlay` is
   * iOS-only, and giving the toast its own Android `Modal` would block every touch below
   * it, which the inert-body rule disqualifies. So the error is rendered here instead.
   *
   * ⚠️ The error belongs to the LIST view, not the editor, and that is structural rather
   * than cosmetic: the editor fires its write and closes itself in the same handler, so
   * by the time any of these fail the editor is already unmounted. The list outlives it.
   */
  const SAVE_ERROR = "Couldn't save that change. Try again.";

  describe("a failed write", () => {
    it("shows nothing while every write is succeeding", () => {
      open();

      expect(screen.queryByText(SAVE_ERROR)).toBeNull();
    });

    it("reports a failed reorder inline on the list", async () => {
      mockReorderEmotions.mockImplementation(failWrite);
      open();

      moveVia("anxious", "moveLater");
      await flush();

      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    });

    it("reports a failed drag-reorder inline too, not just the keyboard path", async () => {
      mockReorderEmotions.mockImplementation(failWrite);
      open();

      fireEvent(screen.getByTestId("emotion-sortable-grid"), "dragEnd", {
        data: mockFullEmotionList.map((e) => ({ id: e.emotionId })),
      });
      await flush();

      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    });

    /**
     * The case the hoist exists for: the editor closes itself on submit, so by the time
     * this failure lands the editor is gone, and the error must reach the list anyway.
     *
     * ☠️ Stated honestly - this test cannot catch the regression it describes. Moving the
     * mutations back into the editor would still pass here, because `mutate` is a jest.fn
     * and no mock models `MutationObserver`'s `hasListeners()` gate, which is what
     * actually drops the callback in production. The proof lives in
     * `emotion-preferences-queries.test.tsx` ("a mutate-level callback after its caller
     * unmounts"), against the real hook.
     */
    it("reports a failed rename on the list the editor closed into", async () => {
      mockUpsertEmotion.mockImplementation(failWrite);
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByText("Save"));
      await flush();

      // The editor is gone, and the error landed on the list that outlived it.
      expect(screen.getByText("Manage emotions")).toBeTruthy();
      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    });

    it("reports a failed add on the list", async () => {
      mockAddEmotion.mockImplementation(failWrite);
      open();

      fireEvent.press(screen.getByText("Add emotion"));
      fireEvent.changeText(screen.getByLabelText("Name"), "Wistful");
      // The emoji picker's own selection is what arms the save button (each tile is
      // labelled with its emoji).
      fireEvent.press(screen.getByLabelText("😊"));
      fireEvent.press(screen.getByText("Add"));
      await flush();

      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    });

    it("reports a failed delete on the list", async () => {
      mockRemoveEmotion.mockImplementation(failWrite);
      open();

      fireEvent.press(screen.getByLabelText("Edit Anxious"));
      fireEvent.press(screen.getByText("Delete"));
      fireEvent.press(screen.getAllByText("Delete")[1]);
      await flush();

      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();
    });

    /** It replaces a toast, which announced itself; silence would be a downgrade. */
    it("announces the failure rather than only painting it", async () => {
      mockReorderEmotions.mockImplementation(failWrite);
      open();

      moveVia("anxious", "moveLater");
      await flush();

      expect(screen.getByText(SAVE_ERROR).props.role).toBe("alert");
    });

    it("clears the error when the next write starts, rather than stacking stale ones", async () => {
      mockReorderEmotions.mockImplementationOnce(failWrite);
      open();

      moveVia("anxious", "moveLater");
      await flush();
      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();

      // The second move succeeds (the one-shot implementation is spent).
      moveVia("anxious", "moveLater");
      await flush();

      expect(screen.queryByText(SAVE_ERROR)).toBeNull();
    });

    /**
     * ⚠️ This surface is never unmounted - the check-in editor mounts it and merely flips
     * `visible` - so an error left behind would still be on screen the next time it opens.
     */
    it("does not keep a failure on screen after the surface is closed", async () => {
      mockReorderEmotions.mockImplementation(failWrite);
      const onClose = jest.fn();
      renderWithProviders(<ManageEmotionsModal visible onClose={onClose} />);

      moveVia("anxious", "moveLater");
      await flush();
      expect(screen.getByText(SAVE_ERROR)).toBeTruthy();

      fireEvent.press(screen.getByLabelText("Close"));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(SAVE_ERROR)).toBeNull();
    });
  });
});
