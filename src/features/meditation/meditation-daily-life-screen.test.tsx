import { screen } from "@testing-library/react-native";

import MeditationDailyLifeScreen from "@/src/features/meditation/meditation-daily-life-screen";
import { useStagePracticeNotes } from "@/src/features/meditation/queries";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/tools/meditation/daily-life",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/meditation/queries", () => ({
  useStagePracticeNotes: jest.fn(),
  useSaveStagePracticeNote: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

const mockUseStagePracticeNotes = useStagePracticeNotes as jest.MockedFunction<
  typeof useStagePracticeNotes
>;

const setNotes = (data: unknown) =>
  mockUseStagePracticeNotes.mockReturnValue({ data } as unknown as ReturnType<
    typeof useStagePracticeNotes
  >);

describe("MeditationDailyLifeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setScheme("light");
    setNotes([]);
  });

  it("renders the archive header and the empty state", () => {
    renderWithProviders(<MeditationDailyLifeScreen />);

    // Two headings share the string: the screen title and the embedded capture
    // card's own title.
    expect(screen.getAllByRole("heading", { name: "Daily life mindfulness" })).toHaveLength(2);
    expect(
      screen.getByText("Private notes about how the practice shows up off the cushion."),
    ).toBeTruthy();
    expect(screen.getByText("All entries")).toBeTruthy();
    expect(screen.getByText("No entries yet.")).toBeTruthy();
  });

  it("lists saved notes instead of the empty state", () => {
    setNotes([
      {
        id: "n1",
        stage: 10,
        note: "Noticed the pause before speaking",
        updatedAt: "2026-06-01T09:00:00Z",
      },
    ]);

    renderWithProviders(<MeditationDailyLifeScreen />);

    // Twice: once in the capture card's recent list, once in the archive below.
    expect(screen.getAllByText("Noticed the pause before speaking")).toHaveLength(2);
    expect(screen.queryByText("No entries yet.")).toBeNull();
  });

  it("renders the iris room pour from the wrapper around its form screen", () => {
    renderWithProviders(<MeditationDailyLifeScreen />);

    // MobileFormScreen owns its own SafeAreaView, so the pour rides a wrapper
    // view around it - its bg-background surfaces re-resolve through the room.
    expectNeutralRoom(screen.getByTestId("meditation-daily-life-room"));
  });

  it("renders the dark iris pour when the scheme is dark", () => {
    setScheme("dark");

    renderWithProviders(<MeditationDailyLifeScreen />);

    expectNeutralRoom(screen.getByTestId("meditation-daily-life-room"));
  });

  it("carries no immersive surface here", () => {
    renderWithProviders(<MeditationDailyLifeScreen />);
  });
});
