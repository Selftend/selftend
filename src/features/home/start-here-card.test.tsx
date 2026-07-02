import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { useThoughtRecords } from "@/src/features/cbt/queries";
import { useHabits } from "@/src/features/habits/queries";
import { useJournalEntries } from "@/src/features/journal/queries";
import { defaultUserPreferences } from "@/src/features/modules/types";
import type { UserPreferences } from "@/src/features/modules/types";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useSleepLogs } from "@/src/features/sleep/queries";
import { renderWithProviders } from "@/test/render-with-providers";

import { StartHereCard } from "./start-here-card";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useUserPreferences: jest.fn(),
  useUpdateOnboardingPreferences: jest.fn(),
}));

jest.mock("@/src/features/cbt/queries", () => ({
  useThoughtRecords: jest.fn(),
}));

jest.mock("@/src/features/sleep/queries", () => ({
  useSleepLogs: jest.fn(),
}));

jest.mock("@/src/features/habits/queries", () => ({
  useHabits: jest.fn(),
}));

jest.mock("@/src/features/journal/queries", () => ({
  useJournalEntries: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.Mock;
const mockUseUpdateOnboardingPreferences = useUpdateOnboardingPreferences as jest.Mock;
const mockUseThoughtRecords = useThoughtRecords as jest.Mock;
const mockUseSleepLogs = useSleepLogs as jest.Mock;
const mockUseHabits = useHabits as jest.Mock;
const mockUseJournalEntries = useJournalEntries as jest.Mock;

const mockMutateAsync = jest.fn();

function setPreferences(overrides: Partial<UserPreferences>) {
  mockUseUserPreferences.mockReturnValue({
    data: {
      ...defaultUserPreferences,
      appOnboardingCompleted: true,
      ...overrides,
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  mockUseUpdateOnboardingPreferences.mockReturnValue({ mutateAsync: mockMutateAsync });
  mockUseThoughtRecords.mockReturnValue({ data: [] });
  mockUseSleepLogs.mockReturnValue({ data: [] });
  mockUseHabits.mockReturnValue({ data: [] });
  mockUseJournalEntries.mockReturnValue({ data: [] });
});

describe("StartHereCard", () => {
  it("renders nothing when no concerns are selected", () => {
    setPreferences({ selectedConcerns: [], startHereDismissedAt: null });
    renderWithProviders(<StartHereCard />);
    expect(screen.queryByText("Start here")).toBeNull();
  });

  it("recommends based on the first selected concern", () => {
    setPreferences({ selectedConcerns: ["sleep", "habits"], startHereDismissedAt: null });
    renderWithProviders(<StartHereCard />);
    expect(screen.getByText("Start here")).toBeTruthy();
    expect(
      screen.getByText("Start by logging last night - patterns appear within a week."),
    ).toBeTruthy();
    expect(screen.getByText("Try it")).toBeTruthy();
  });

  it("renders nothing when dismissed", () => {
    setPreferences({
      selectedConcerns: ["sleep"],
      startHereDismissedAt: "2026-07-02T10:00:00Z",
    });
    renderWithProviders(<StartHereCard />);
    expect(screen.queryByText("Start here")).toBeNull();
  });

  it("auto-retires when the recommended feature has been used", () => {
    setPreferences({ selectedConcerns: ["sleep"], startHereDismissedAt: null });
    mockUseSleepLogs.mockReturnValue({ data: [{ id: "log-1" }] });
    renderWithProviders(<StartHereCard />);
    expect(screen.queryByText("Start here")).toBeNull();
  });

  it("dismiss persists startHereDismissedAt", async () => {
    setPreferences({ selectedConcerns: ["sleep"], startHereDismissedAt: null });
    renderWithProviders(<StartHereCard />);

    fireEvent.press(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        startHereDismissedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      });
    });
  });
});
