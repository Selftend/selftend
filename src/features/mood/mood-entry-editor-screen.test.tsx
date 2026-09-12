import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable as mockPressable, Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { CHIP_FRAME } from "@/src/components/app/selectable-chip";
import { DEFAULT_EMOTIONS } from "@/src/constants/emotions";
import { useCompleteActivity } from "@/src/features/activities/queries";
import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { consumeThoughtRecordSeed } from "@/src/stores/thought-record-seed-store";
import { renderWithProviders } from "@/test/render-with-providers";
import { setPlatformOS } from "@/test/modal-marker-mock";

jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: () => "/tools/check-in/new",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: { id: "user-1" },
  }),
}));

jest.mock("@/src/features/activities/queries", () => ({
  useCompleteActivity: jest.fn(),
}));

jest.mock("@/src/features/mood/queries", () => ({
  useMoodLog: jest.fn(),
  useMoodLogs: jest.fn(),
  useSaveMoodLog: jest.fn(),
}));

// Flipped by the reservation suite below; every other test leaves it settled.
let mockEmotionsLoading = false;

// The emotions list is now rows-authoritative: an empty list yields an empty
// grid. Return seeded default rows so the emotions section populates.
jest.mock("@/src/features/mood/emotion-preferences-queries", () => {
  const { DEFAULT_EMOTIONS: defaults } = require("@/src/constants/emotions");
  return {
    useEmotionPreferences: () => ({
      // Pending means no rows AND `isLoading` - a list that is already there while the
      // query claims to be loading is a state the screen never sees.
      data: mockEmotionsLoading
        ? undefined
        : defaults.map((e: { id: string }, i: number) => ({
            id: e.id,
            userId: "user-1",
            emotionId: e.id,
            name: null,
            emoji: null,
            position: i,
            removed: false,
            isCustom: false,
          })),
      isLoading: mockEmotionsLoading,
    }),
    useEmotionUsageCounts: () => ({ data: {} }),
    useUpsertEmotionPreference: () => ({ mutate: jest.fn() }),
    useReorderEmotions: () => ({ mutate: jest.fn() }),
    useRemoveEmotion: () => ({ mutate: jest.fn() }),
    useAddCustomEmotion: () => ({ mutate: jest.fn() }),
  };
});

/**
 * The panel behind the "Manage" link, reduced to whether it is open (#2360).
 *
 * The real one brings `GestureHandlerRootView` and `Sortable.Grid`, neither of which this
 * suite has any business installing — and a screen test that renders them is testing the
 * panel, which `manage-emotions-modal.test.tsx` already does. What belongs HERE is only the
 * door: whether this screen lets the panel open at all, which is this screen's own state.
 */
jest.mock("@/src/features/mood/manage-emotions-modal", () => {
  const { View } = require("react-native");

  return {
    ManageEmotionsModal: ({ visible }: { visible: boolean }) =>
      visible ? <View testID="manage-emotions-panel" /> : null,
  };
});

jest.mock("@/src/components/react-native-reusables/checkbox", () => {
  const Pressable = mockPressable;

  return {
    Checkbox: ({
      accessibilityLabel,
      checked,
      onCheckedChange,
    }: {
      accessibilityLabel?: string;
      checked?: boolean;
      onCheckedChange?: (checked: boolean) => void;
    }) => (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="checkbox"
        aria-checked={Boolean(checked)}
        onPress={() => onCheckedChange?.(!checked)}
      />
    ),
  };
});

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
      <Text onPress={onPress}>{children}</Text>
    ),
  };
});

const mockUseCompleteActivity = useCompleteActivity as jest.MockedFunction<
  typeof useCompleteActivity
>;
const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockUseMoodLog = useMoodLog as jest.MockedFunction<typeof useMoodLog>;
const mockUseMoodLogs = useMoodLogs as jest.MockedFunction<typeof useMoodLogs>;
const mockUseSaveMoodLog = useSaveMoodLog as jest.MockedFunction<typeof useSaveMoodLog>;
const mockRouter = jest.mocked(router);

describe("MoodEntryEditorScreen", () => {
  const saveMood = jest.fn();
  const completeActivity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmotionsLoading = false;
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseMoodLog.mockReturnValue({
      data: null,
      isLoading: false,
    } as unknown as ReturnType<typeof useMoodLog>);
    mockUseMoodLogs.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useMoodLogs>);
    mockUseSaveMoodLog.mockReturnValue({
      isPending: false,
      mutateAsync: saveMood,
    } as unknown as ReturnType<typeof useSaveMoodLog>);
    mockUseCompleteActivity.mockReturnValue({
      isPending: false,
      mutateAsync: completeActivity,
    } as unknown as ReturnType<typeof useCompleteActivity>);
    saveMood.mockResolvedValue({
      id: "log-1",
      userId: "user-1",
      moodScore: 3,
      emotions: [],
      notes: "",
      linkedStrategy: null,
      loggedAt: "2026-05-10T08:00:00.000Z",
      createdAt: "2026-05-10T08:00:00.000Z",
    });
    completeActivity.mockResolvedValue(undefined);
  });

  it("creates a mood entry and routes to the saved detail page", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    fireEvent.press(screen.getByLabelText("Okay"));
    fireEvent.press(screen.getByText("Save check-in"));

    await waitFor(() => {
      expect(saveMood).toHaveBeenCalledWith({
        input: {
          emotions: [],
          linkedStrategy: null,
          loggedAt: expect.any(String),
          loggedOffsetMinutes: expect.any(Number),
          moodScore: 3,
          notes: "",
          situation: "",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        },
        moodLogId: undefined,
      });
    });
    expect(mockRouter.replace).toHaveBeenCalledWith("/tools/check-in/log-1");
  });

  it("updates an existing mood entry", async () => {
    const loggedAt = "2026-05-10T08:00:00.000Z";
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 4,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt,
          loggedOffsetMinutes: 180,
          createdAt: loggedAt,
          situation: "",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);

    renderWithProviders(
      <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
    );

    fireEvent.press(screen.getByLabelText("Great"));
    fireEvent.press(screen.getByText("Update"));

    await waitFor(() => {
      expect(saveMood).toHaveBeenCalledWith({
        input: {
          emotions: [],
          linkedStrategy: null,
          loggedAt,
          loggedOffsetMinutes: 180,
          moodScore: 5,
          notes: "",
          situation: "",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        },
        moodLogId: "log-1",
      });
    });
  });

  it("saves exactly once when Save is pressed twice rapidly", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    fireEvent.press(screen.getByLabelText("Okay"));
    // isPending has not re-rendered between the two presses, so only the
    // single-flight guard stands between the double-press and two inserts.
    fireEvent.press(screen.getByText("Save check-in"));
    fireEvent.press(screen.getByText("Save check-in"));

    await waitFor(() => expect(saveMood).toHaveBeenCalled());
    expect(saveMood).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error next to the score row and does not save without a score", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    // Save stays enabled; pressing it without a score surfaces the inline error.
    fireEvent.press(screen.getByText("Save check-in"));

    expect(await screen.findByText("Pick a mood score first.")).toBeTruthy();
    expect(saveMood).not.toHaveBeenCalled();

    // Picking a score clears the error and lets the save go through.
    fireEvent.press(screen.getByLabelText("Okay"));
    expect(screen.queryByText("Pick a mood score first.")).toBeNull();
    fireEvent.press(screen.getByText("Save check-in"));
    await waitFor(() => expect(saveMood).toHaveBeenCalledTimes(1));
  });

  it("preserves in-progress edits when the entry refetches (no hydration clobber)", () => {
    const loggedAt = "2026-05-10T08:00:00.000Z";
    const makeEntry = () => ({
      id: "log-1",
      userId: "user-1",
      moodScore: 4,
      emotions: [],
      notes: "", // server value stays empty
      linkedStrategy: null,
      loggedAt,
      createdAt: loggedAt,
      situation: "",
      thoughts: "",
      behaviours: "",
      bodilySensations: "",
    });
    mockUseMoodLogs.mockReturnValue({
      data: [makeEntry()],
    } as unknown as ReturnType<typeof useMoodLogs>);

    const { rerender } = renderWithProviders(
      <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
    );

    // The user edits the Notes field.
    fireEvent.changeText(screen.getByLabelText("Note"), "draft in progress");
    expect(screen.getByLabelText("Note").props.value).toBe("draft in progress");

    // A list/detail refetch produces a NEW object identity (same id, same server value).
    // The hydration effect must NOT re-run and clobber the in-progress edit back to "".
    mockUseMoodLogs.mockReturnValue({
      data: [makeEntry()],
    } as unknown as ReturnType<typeof useMoodLogs>);
    rerender(
      <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
    );

    expect(screen.getByLabelText("Note").props.value).toBe("draft in progress");
  });

  /**
   * "Go deeper" stops being four text boxes and becomes the thought-record handoff
   * (#739, decided on #698). The four CBT fields leave the CREATE form entirely.
   */
  describe("go deeper", () => {
    const makeEntryWith = (overrides: Record<string, unknown>) => ({
      id: "log-1",
      userId: "user-1",
      moodScore: 4,
      emotions: [],
      notes: "",
      linkedStrategy: null,
      loggedAt: "2026-05-10T08:00:00.000Z",
      loggedOffsetMinutes: 180,
      createdAt: "2026-05-10T08:00:00.000Z",
      situation: "",
      thoughts: "",
      behaviours: "",
      bodilySensations: "",
      ...overrides,
    });

    it("offers the thought record, and no CBT fields, on the create form", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      fireEvent.press(screen.getByLabelText("Go deeper"));

      expect(
        screen.getByText(
          "If there's a thought underneath this, you can take it into a thought record.",
        ),
      ).toBeTruthy();
      expect(screen.queryByLabelText("Situation / trigger")).toBeNull();
      expect(screen.queryByLabelText("Thoughts")).toBeNull();
      expect(screen.queryByLabelText("Response")).toBeNull();
      expect(screen.queryByLabelText("Jaw")).toBeNull();
    });

    /**
     * The seed rides a store, never the URL. A route param would put the user's emotions
     * in the web address bar and in browser history. (`scrubBreadcrumb` in `sentry.ts`
     * now strips query strings off navigation breadcrumbs too, per #996 - but that is a
     * backstop for paths already-shipped builds mint, not a licence to send data there.)
     */
    it("hands the picked emotions over out of band, not in the URL", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      fireEvent.press(screen.getByLabelText("Okay"));
      fireEvent.press(screen.getByText("Anxious"));
      fireEvent.changeText(screen.getByLabelText("Note"), "a note, not a situation");
      fireEvent.press(screen.getByLabelText("Go deeper"));
      fireEvent.press(screen.getByText("Open a CBT thought record →"));

      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/new");
      // ⚠️ The check-in seeds emotions ONLY. Its note is a note, not a
      // situation - which is why the seed's `situation` stays empty here even
      // though the DBT emotion record fills it (#1980).
      expect(consumeThoughtRecordSeed()).toEqual({ emotions: ["anxious"], situation: "" });
    });

    it("pushes rather than replaces, so the half-written check-in survives the detour", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      fireEvent.press(screen.getByLabelText("Go deeper"));
      fireEvent.press(screen.getByText("Open a CBT thought record →"));

      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/new");
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("keeps editing the fields an entry already holds, and only those", async () => {
      mockUseMoodLogs.mockReturnValue({
        data: [makeEntryWith({ situation: "Email from boss", bodilySensations: "Jaw" })],
      } as unknown as ReturnType<typeof useMoodLogs>);

      renderWithProviders(
        <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
      );

      // Auto-expanded: there is inherited reflection to see.
      expect(screen.getByLabelText("Situation / trigger").props.value).toBe("Email from boss");
      expect(screen.getByLabelText("Jaw")).toBeTruthy();
      // The two this entry never held stay gone - the create form no longer offers them.
      expect(screen.queryByLabelText("Thoughts")).toBeNull();
      expect(screen.queryByLabelText("Response")).toBeNull();

      fireEvent.changeText(screen.getByLabelText("Situation / trigger"), "Email from my manager");
      fireEvent.press(screen.getByText("Update"));

      await waitFor(() => {
        expect(saveMood).toHaveBeenCalledWith(
          expect.objectContaining({
            input: expect.objectContaining({
              situation: "Email from my manager",
              bodilySensations: "Jaw",
            }),
          }),
        );
      });
    });

    it("keeps a cleared field on screen so the cursor is not yanked mid-edit", () => {
      mockUseMoodLogs.mockReturnValue({
        data: [makeEntryWith({ situation: "Email from boss" })],
      } as unknown as ReturnType<typeof useMoodLogs>);

      renderWithProviders(
        <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
      );

      fireEvent.changeText(screen.getByLabelText("Situation / trigger"), "");

      expect(screen.getByLabelText("Situation / trigger")).toBeTruthy();
    });

    it("gives an entry with no reflection the same collapsed invitation a new check-in gets", () => {
      mockUseMoodLogs.mockReturnValue({
        data: [makeEntryWith({})],
      } as unknown as ReturnType<typeof useMoodLogs>);

      renderWithProviders(
        <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
      );

      expect(screen.queryByLabelText("Situation / trigger")).toBeNull();
      expect(
        screen.queryByText(
          "If there's a thought underneath this, you can take it into a thought record.",
        ),
      ).toBeNull();

      fireEvent.press(screen.getByLabelText("Go deeper"));

      expect(
        screen.getByText(
          "If there's a thought underneath this, you can take it into a thought record.",
        ),
      ).toBeTruthy();
    });
  });

  it("renders the mood scale with a11y labels (no visible word labels)", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
    expect(await screen.findByLabelText("Great")).toBeTruthy();
  });

  /**
   * One flat run in the user's own order (#738, decided on #699), not two
   * valence groups. `emotion_preferences.position` and the whole
   * manage-emotions screen exist so the USER sets this order; grouping by
   * valence would overrule it, and custom emotions have no valence column to
   * group by at all. CBT's grouped picker is a weak precedent - fixed defaults,
   * no preferences, and *difficult first*, the reverse of the design.
   */
  it("renders emotions as one flat run, in position order, with no valence headings", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    // Seeded rows are DEFAULT_EMOTIONS in array order, so the rendered order is
    // the persisted order rather than a taxonomy.
    const first = await screen.findByLabelText("Happy");
    expect(first.props.accessibilityRole).toBe("checkbox");
    expect(screen.getByLabelText("Excited")).toBeTruthy();

    expect(screen.queryByText("Difficult feelings")).toBeNull();
    expect(screen.queryByText("Pleasant feelings")).toBeNull();
  });

  it("selects an emotion with the ink treatment rather than bare primary", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    const chip = await screen.findByLabelText("Happy");
    fireEvent.press(chip);

    // The live AA failure the rewrite repairs: `text-primary` on `bg-primary/10`
    // measured 3.81:1 (#368), under AA for this size.
    const tokens = String(screen.getByText("Happy").props.className).split(/\s+/);
    expect(tokens).toContain("text-primary-ink");
    expect(tokens).not.toContain("text-primary");
  });

  /**
   * The emotion grid holds its space while the preferences query is in flight (#2345,
   * ADR-0009). The defect it replaces was an input-integrity one: a bare ~20px spinner stood
   * in for a ~272px run at 390dp, so the Notes field directly below it moved under the
   * finger, and a tap meant for Notes landed on `sad`.
   *
   * ⚠️ The HEIGHT is not asserted here and cannot be. NativeWind resolves no geometry into
   * `props.style` under jest, so a reserved-height assertion in this file would be vacuously
   * green. `test/e2e/loading-reserves-space.e2e.test.ts` measures it in a real engine; what
   * belongs here is the relation the height rests on, and the consequences of the stick
   * being real content.
   */
  describe("while the emotion preferences are still loading", () => {
    beforeEach(() => {
      mockEmotionsLoading = true;
    });

    it("holds the run's space with the full default set rather than a bare spinner", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      // One silhouette per default emotion - the list every first-ever user is seeded with,
      // and the one the ~250px shift was measured against. Counting them is what fails if
      // the reservation is reduced back to a spinner.
      const reserved = screen.UNSAFE_root.findAll(
        (node) =>
          typeof node.type === "string" &&
          typeof node.props.className === "string" &&
          node.props.className.includes(CHIP_FRAME),
      );
      expect(reserved).toHaveLength(DEFAULT_EMOTIONS.length);
    });

    it("names nothing a screen reader can hear, and offers nothing to press", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      // The stick holds real emotion names. Hidden, they are a height; unhidden, they are
      // twenty-two words read out over a surface that is still loading - and on web an
      // invisible chip is still perfectly clickable.
      expect(screen.queryByLabelText("Happy")).toBeNull();
      expect(screen.queryByText("Happy")).toBeNull();
      expect(screen.getByText("Happy", { includeHiddenElements: true })).toBeTruthy();
    });

    it("still shows the loading signal, centred in the space it is holding", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      // The spinner is kept rather than swapped: five suites elsewhere pin `ActivityIndicator`
      // by component type, and reserving space is not a reason to spend that bill here.
      expect(screen.UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    });

    /**
     * #2360. The door to the manage-emotions panel is shut while this read is in flight,
     * and the reason is the panel's own sizing rather than anything on this screen: on web
     * it hugs its content (`VIEW_SIZING`, design 2E/#905), so a panel opened onto a pending
     * read grows from a short card to a viewport-capped one when the rows land — recentring
     * the desktop card, growing the mobile drawer upward, and carrying the header and the
     * "Add emotion" button with it. ADR-0009 edge 5 fixed the column's own order (#2348),
     * but it assumes a column of definite height, which the web panel does not have.
     *
     * The gate lives HERE rather than in the panel because this screen is the panel's only
     * door, and because the two read the SAME query key through the same hook — so the panel
     * is pending exactly when this screen is, which is knowable at the moment of the tap.
     * Shutting the door makes the settle unreachable by construction, and costs the panel's
     * sizing nothing.
     */
    it("shuts the door to the manage panel rather than open it onto a pending read", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      const link = screen.getByLabelText("Manage emotions");
      expect(link.props.accessibilityState?.disabled).toBe(true);

      // ☠️ The a11y state above is an announcement, not a lock. The press is asserted
      // separately because a `disabled` that only renamed the control — and still opened the
      // panel — would leave the assertion above vacuously green.
      fireEvent.press(link);
      expect(screen.queryByTestId("manage-emotions-panel")).toBeNull();
    });

    it("gives the space back to the real grid once the rows land", async () => {
      const { rerender } = renderWithProviders(
        <MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />,
      );
      expect(screen.queryByLabelText("Happy")).toBeNull();

      mockEmotionsLoading = false;
      rerender(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      // The settle is a swap, not an addition: exactly one "Happy" survives it, so the
      // invisible run cannot be left underneath the real one doubling the grid's height.
      expect(await screen.findByLabelText("Happy")).toBeTruthy();
      expect(screen.queryAllByText("Happy", { includeHiddenElements: true })).toHaveLength(1);
    });
  });

  it("renders the top bar and heading in create mode", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
  });

  it("shows the crisis row on create and not on edit (#906, scoping #882)", () => {
    // Asserting on the same copy in both modes keeps the absence check honest:
    // if the label ever changes, the create assertion fails loudly first.
    const crisisLabel = "Not for emergencies · Crisis resources";

    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
    expect(screen.getByLabelText(crisisLabel)).toBeTruthy();
    screen.unmount();

    const loggedAt = "2026-05-10T08:00:00.000Z";
    mockUseMoodLogs.mockReturnValue({
      data: [
        {
          id: "log-1",
          userId: "user-1",
          moodScore: 4,
          emotions: [],
          notes: "",
          linkedStrategy: null,
          loggedAt,
          loggedOffsetMinutes: 180,
          createdAt: loggedAt,
          situation: "",
          thoughts: "",
          behaviours: "",
          bodilySensations: "",
        },
      ],
    } as unknown as ReturnType<typeof useMoodLogs>);
    renderWithProviders(
      <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
    );
    expect(screen.queryByLabelText(crisisLabel)).toBeNull();
  });

  describe("2b shell (#869)", () => {
    it("confirms a picked score with the label-and-score caption, no static label block", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      // The old label block and helper are gone…
      expect(screen.queryByText("Mood score (1-5)")).toBeNull();
      expect(screen.queryByText("1 is very low, 5 is very good.")).toBeNull();
      // …and nothing is claimed before a score is picked.
      expect(screen.queryByText("4 of 5")).toBeNull();

      fireEvent.press(screen.getByLabelText("Good"));

      // The caption is the selected label's only visible confirmation for
      // sighted users beyond size/filter (design 2b).
      expect(screen.getByText("Good")).toBeTruthy();
      expect(screen.getByText("4 of 5")).toBeTruthy();
    });

    it("renders the schedule row with a Change affordance instead of a boxed field", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      expect(screen.getByText("Change")).toBeTruthy();
      // The old field label headed the boxed input; the row is self-describing.
      expect(screen.queryByText("Date & time")).toBeNull();
      // The row still opens the same picker.
      expect(screen.queryByText("Done")).toBeNull();
      fireEvent.press(screen.getByLabelText("Date & time"));
      expect(screen.getByText("Done")).toBeTruthy();
    });

    it("renders the low-mood nudge as a single line whose card headline died with the card", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
      expect(screen.queryByText(/breathing exercise can help settle/)).toBeNull();

      fireEvent.press(screen.getByLabelText("Bad"));

      expect(screen.getByText(/breathing exercise can help settle/)).toBeTruthy();
      expect(screen.getByText(/2 min box breathing/)).toBeTruthy();
      // The card's headline is gone for good on this screen.
      expect(screen.queryByText("Want to ground yourself?")).toBeNull();
    });

    it("labels the sections with eyebrows and shortens the manage link to Manage", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      expect(screen.getByText(/^Emotions/)).toBeTruthy();
      expect(screen.getByText(/^Note/)).toBeTruthy();
      expect(screen.queryByText("Emotions (optional)")).toBeNull();
      expect(screen.queryByText("Notes (optional)")).toBeNull();
      // Short visible copy, full accessible name (design 2b).
      expect(screen.getByText("Manage")).toBeTruthy();
      expect(screen.getByLabelText("Manage emotions")).toBeTruthy();
    });

    /**
     * The other half of #2360's gate, and the reason it is not one test. A link hardcoded
     * shut would satisfy the pending assertion above on its own and ship a door that never
     * opens; only the settled case can tell a gate from a wall.
     */
    it("opens the door again once the emotions have landed", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      const link = screen.getByLabelText("Manage emotions");
      expect(link.props.accessibilityState?.disabled).toBe(false);

      fireEvent.press(link);
      expect(screen.getByTestId("manage-emotions-panel")).toBeTruthy();
    });
  });

  it("completes a linked activity after saving from the activity flow", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      completeActivityId: "activity-1",
      linkedStrategy: "behavioral-activation",
    });

    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    fireEvent.press(screen.getByLabelText("Good"));
    fireEvent.press(screen.getByText("Save check-in"));

    await waitFor(() => {
      expect(completeActivity).toHaveBeenCalledWith({
        activityId: "activity-1",
        moodAfter: 4,
      });
    });
    expect(saveMood).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          linkedStrategy: "behavioral-activation",
          moodScore: 4,
        }),
      }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith("/modules/cbt/activities/activity-1");
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and this href-less Pressable is a `<div role="link">` the browser
   * does nothing with, so Tab reached the thought-record link and Enter opened nothing (#1735).
   * The link brings its own Enter handler: once per press, never on auto-repeat,
   * never on Space (a link does not activate on Space) - and never on a button,
   * which react-native-web activates itself; a second handler there would fire
   * the press twice.
   *
   * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
   * on a real `<div role="link">` - is proven once for the helper itself, on the
   * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
   */
  describe("the thought-record link on web", () => {
    beforeEach(() => {
      setPlatformOS("web");
    });

    afterEach(() => {
      setPlatformOS("ios");
    });

    it("activates on Enter, once, and not on a held key or on Space; no button brings a handler", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
      fireEvent.press(screen.getByLabelText("Go deeper"));

      const door = screen.getByRole("link", { name: "Open a CBT thought record →" });
      const preventDefault = jest.fn();
      door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);
      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/new");
      expect(preventDefault).toHaveBeenCalledTimes(1);

      door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      // Until #1735 this link carried the Space helper - a link never activates
      // on Space, and its Enter was still swallowed.
      door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(mockRouter.push).toHaveBeenCalledTimes(1);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button.props.onKeyDown).toBeUndefined();
      }
    });
  });
});
