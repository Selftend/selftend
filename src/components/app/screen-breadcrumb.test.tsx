import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { backWithFallback } from "@/src/lib/back-with-fallback";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import i18n from "@/src/i18n";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));
jest.mock("@/src/lib/back-with-fallback", () => ({ backWithFallback: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;
const mockBackWithFallback = jest.mocked(backWithFallback);

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("ScreenBreadcrumb", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing when the trail is empty", () => {
    mockUseBreadcrumbs.mockReturnValue([]);
    const { toJSON } = render(<ScreenBreadcrumb />);
    expect(toJSON()).toBeNull();
  });

  it("renders nothing for a single-item trail", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Settings" }]);
    const { toJSON } = render(<ScreenBreadcrumb />);
    expect(toJSON()).toBeNull();
  });

  it("renders the trail and pushes to a parent crumb on press", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Mindfulness" },
    ]);
    const { getByText, getByRole, queryByRole } = render(<ScreenBreadcrumb />);
    expect(getByText("Mindfulness")).toBeTruthy();
    // The current (last) crumb is not a link.
    expect(queryByRole("link", { name: "Mindfulness" })).toBeNull();
    fireEvent.press(getByRole("link", { name: "Tools" }));
    expect(router.push).toHaveBeenCalledWith("/tools");
  });

  // #495: every breadcrumb trail carries a back affordance - previous page
  // when history exists, nearest ancestor crumb as the deep-link fallback.
  it("renders a back button that backs out with the deepest ancestor as fallback", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Gratitude log", href: "/tools/gratitude-log" },
      { label: "Entry" },
    ]);
    const { getByLabelText } = render(<ScreenBreadcrumb />);
    fireEvent.press(getByLabelText("Go back"));
    expect(mockBackWithFallback).toHaveBeenCalledWith("/tools/gratitude-log");
  });

  it("hides the back button along with a hidden trail", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Home" }]);
    const { queryByLabelText } = render(<ScreenBreadcrumb />);
    expect(queryByLabelText("Go back")).toBeNull();
  });
});
