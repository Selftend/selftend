import { render } from "@testing-library/react-native";

import { ScreenHeader } from "@/src/components/app/screen-header";
import { Text } from "@/src/components/react-native-reusables/text";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import i18n from "@/src/i18n";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  // The Escape reads the current pathname to look up the Origin an off-trail
  // arrival carried (#1261). Nothing here records one, so every render below is
  // the cold arrival that falls back to Up.
  usePathname: jest.fn(() => "/notifications"),
}));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("ScreenHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBreadcrumbs.mockReturnValue([{ label: "Tools", href: "/tools" }, { label: "Check-in" }]);
  });

  it("renders the title", () => {
    const { getByText } = render(<ScreenHeader title="Mindfulness" />);
    expect(getByText("Mindfulness")).toBeTruthy();
  });

  it("renders the right slot when provided", () => {
    const { getByText } = render(<ScreenHeader title="Habit" right={<Text>Archived</Text>} />);
    expect(getByText("Archived")).toBeTruthy();
  });

  // G1 (#1250): the chrome renders exactly one Escape, and renders it
  // unconditionally. "Exactly one" is R1 - two exits are two promises;
  // "unconditionally" is what lets a source walk answer the coverage question.
  it("renders exactly one Escape", () => {
    const { getAllByTestId } = render(<ScreenHeader title="Mindfulness" />);
    expect(getAllByTestId("screen-escape")).toHaveLength(1);
  });

  it("still renders the Escape on a one-crumb screen, where the trail hides", () => {
    // `/notifications`, `/settings`, `/support` and the rest of the eight: the
    // reported symptom was that these had no way out at all.
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
    const { getAllByTestId, getAllByText } = render(<ScreenHeader title="Reminders" />);
    expect(getAllByTestId("screen-escape")).toHaveLength(1);
    // The trail itself is still hidden - only the Escape was decoupled from it.
    // A rendered lone crumb would put "Reminders" on screen twice, which is the
    // exact repetition the trail's hiding rule exists to avoid.
    expect(getAllByText("Reminders")).toHaveLength(1);
  });
});
