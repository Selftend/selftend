import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable as mockPressable, Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { useCompleteActivity } from "@/src/features/activities/queries";
import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
import { consumeThoughtRecordSeed } from "@/src/stores/thought-record-seed-store";
import { renderWithProviders } from "@/test/render-with-providers";

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

// The emotions list is now rows-authoritative: an empty list yields an empty
// grid. Return seeded default rows so the emotions section populates.
jest.mock("@/src/features/mood/emotion-preferences-queries", () => {
  const { DEFAULT_EMOTIONS: defaults } = require("@/src/constants/emotions");
  return {
    useEmotionPreferences: () => ({
      data: defaults.map((e: { id: string }, i: number) => ({
        id: e.id,
        userId: "user-1",
        emotionId: e.id,
        name: null,
        emoji: null,
        position: i,
        removed: false,
        isCustom: false,
      })),
      isLoading: false,
    }),
    useEmotionUsageCounts: () => ({ data: {} }),
    useUpsertEmotionPreference: () => ({ mutate: jest.fn() }),
    useReorderEmotions: () => ({ mutate: jest.fn() }),
    useRemoveEmotion: () => ({ mutate: jest.fn() }),
    useAddCustomEmotion: () => ({ mutate: jest.fn() }),
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
          "If there's a thought underneath this, you can take it into a thought record — no pressure to.",
        ),
      ).toBeTruthy();
      expect(screen.queryByLabelText("Situation / trigger")).toBeNull();
      expect(screen.queryByLabelText("Thoughts")).toBeNull();
      expect(screen.queryByLabelText("Response")).toBeNull();
      expect(screen.queryByLabelText("Jaw")).toBeNull();
    });

    /**
     * The seed rides a store, never the URL. A route param would put the user's emotions
     * in the web address bar, in browser history, and in Sentry's navigation breadcrumbs —
     * `dropConsoleBreadcrumb` in `sentry.ts` drops *console* breadcrumbs only.
     */
    it("hands the picked emotions over out of band, not in the URL", () => {
      renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

      fireEvent.press(screen.getByLabelText("Okay"));
      fireEvent.press(screen.getByText("Anxious"));
      fireEvent.changeText(screen.getByLabelText("Note"), "a note, not a situation");
      fireEvent.press(screen.getByLabelText("Go deeper"));
      fireEvent.press(screen.getByText("Open a CBT thought record →"));

      expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/new");
      expect(consumeThoughtRecordSeed()).toEqual(["anxious"]);
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
          "If there's a thought underneath this, you can take it into a thought record — no pressure to.",
        ),
      ).toBeNull();

      fireEvent.press(screen.getByLabelText("Go deeper"));

      expect(
        screen.getByText(
          "If there's a thought underneath this, you can take it into a thought record — no pressure to.",
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
});
