import { screen } from "@testing-library/react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MeditationPracticesScreen from "@/src/features/meditation/meditation-practices-screen";
import { expectNeutralRoom } from "@/test/room-pour";
import { setScheme } from "@/test/color-scheme-mock";
import { renderWithProviders } from "@/test/render-with-providers";

const mockParams = jest.fn<{ practice?: string }, []>(() => ({}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams(),
  usePathname: () => "/tools/meditation/practices",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

describe("MeditationPracticesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({});
    setScheme("light");
  });

  it("renders the header and every practice card", () => {
    renderWithProviders(<MeditationPracticesScreen />);

    expect(screen.getByRole("heading", { name: "Practices" })).toBeTruthy();
    expect(screen.getByText("Breath awareness")).toBeTruthy();
    expect(screen.getByText("Body scan")).toBeTruthy();
    expect(screen.getByText("Loving-kindness")).toBeTruthy();
    expect(screen.getByText("Observing thoughts")).toBeTruthy();
  });

  it("pre-opens the practice a ?practice= deep link names", () => {
    // The links used to aim at the overview; the overview forwards them here.
    mockParams.mockReturnValue({ practice: "body-scan" });

    renderWithProviders(<MeditationPracticesScreen />);

    expect(
      screen.getByText(
        "Move attention slowly from head to toe, noticing without trying to change.",
      ),
    ).toBeTruthy();
  });

  it("renders the iris room pour on its root", () => {
    renderWithProviders(<MeditationPracticesScreen />);

    expectNeutralRoom(screen.UNSAFE_getByType(SafeAreaView));
  });
});
