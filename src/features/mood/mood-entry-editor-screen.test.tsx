import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable as mockPressable, Text as mockText } from "react-native";
import type { ReactNode } from "react";

import { useCompleteActivity } from "@/src/features/activities/queries";
import { MoodEntryEditorScreen } from "@/src/features/mood/mood-entry-editor-screen";
import { useMoodLog, useMoodLogs, useSaveMoodLog } from "@/src/features/mood/queries";
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

    fireEvent.press(screen.getByLabelText("OK"));
    fireEvent.press(screen.getByText("Save"));

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

    fireEvent.press(screen.getByLabelText("OK"));
    // isPending has not re-rendered between the two presses, so only the
    // single-flight guard stands between the double-press and two inserts.
    fireEvent.press(screen.getByText("Save"));
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() => expect(saveMood).toHaveBeenCalled());
    expect(saveMood).toHaveBeenCalledTimes(1);
  });

  it("shows an inline error next to the score row and does not save without a score", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    // Save stays enabled; pressing it without a score surfaces the inline error.
    fireEvent.press(screen.getByText("Save"));

    expect(await screen.findByText("Pick a mood score first.")).toBeTruthy();
    expect(saveMood).not.toHaveBeenCalled();

    // Picking a score clears the error and lets the save go through.
    fireEvent.press(screen.getByLabelText("OK"));
    expect(screen.queryByText("Pick a mood score first.")).toBeNull();
    fireEvent.press(screen.getByText("Save"));
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
    fireEvent.changeText(screen.getByLabelText("Notes (optional)"), "draft in progress");
    expect(screen.getByLabelText("Notes (optional)").props.value).toBe("draft in progress");

    // A list/detail refetch produces a NEW object identity (same id, same server value).
    // The hydration effect must NOT re-run and clobber the in-progress edit back to "".
    mockUseMoodLogs.mockReturnValue({
      data: [makeEntry()],
    } as unknown as ReturnType<typeof useMoodLogs>);
    rerender(
      <MoodEntryEditorScreen fallbackHref="/tools/check-in/log-1" mode="edit" moodId="log-1" />,
    );

    expect(screen.getByLabelText("Notes (optional)").props.value).toBe("draft in progress");
  });

  it("captures the four-box notice when expanded", async () => {
    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);
    fireEvent.press(screen.getByLabelText("OK"));
    // Accordion is labelled by t("mood.goDeeperTitle") = "Go deeper"
    fireEvent.press(screen.getByLabelText("Go deeper"));
    // Situation textarea still accessible by its label
    fireEvent.changeText(screen.getByLabelText("Situation / trigger"), "Email from boss");
    // Body sensations are now chips (accessibilityRole="checkbox"); toggle one
    fireEvent.press(screen.getByLabelText("Jaw"));
    fireEvent.press(screen.getByText("Save"));
    await waitFor(() => {
      expect(saveMood).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            moodScore: 3,
            situation: "Email from boss",
            bodilySensations: "Jaw",
          }),
        }),
      );
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

  it("completes a linked activity after saving from the activity flow", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      completeActivityId: "activity-1",
      linkedStrategy: "behavioral-activation",
    });

    renderWithProviders(<MoodEntryEditorScreen fallbackHref="/tools/check-in" mode="create" />);

    fireEvent.press(screen.getByLabelText("Good"));
    fireEvent.press(screen.getByText("Save"));

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
