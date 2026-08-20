import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import i18n from "@/src/i18n";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("ScreenEscape", () => {
  beforeEach(() => jest.clearAllMocks());

  // R3/R7 (#1250): the Escape is a slot of its own, so it does not inherit the
  // trail's "hide a lone crumb" rule. These two cases are the whole point of the
  // split - both rendered nothing while the arrow lived inside `ScreenBreadcrumb`.
  it("renders on a one-crumb screen, where the trail hides", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Go back")).toBeTruthy();
  });

  it("renders even when the trail is empty", () => {
    mockUseBreadcrumbs.mockReturnValue([]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Go back")).toBeTruthy();
  });

  it("climbs to the deepest ancestor crumb, replacing rather than pushing", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Gratitude log", href: "/tools/gratitude-log" },
      { label: "Entry" },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    fireEvent.press(getByLabelText("Go back"));
    // `replace`, not `push`: an Escape is a leave, not a drill-down (R4).
    expect(router.replace).toHaveBeenCalledWith("/tools/gratitude-log");
  });

  it("escapes to the root when no crumb above the current one has an href", () => {
    // The one-crumb screens (`/notifications`, `/settings`, the policy pages):
    // their only crumb is the current page's own, so Up is the root.
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
    const { getByLabelText } = render(<ScreenEscape />);
    fireEvent.press(getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("labels the close glyph 'Close', not 'Go back'", () => {
    // The label follows the glyph, not the destination: an X announced as
    // "Go back" tells a screen-reader user the opposite of the sighted promise.
    mockUseBreadcrumbs.mockReturnValue([{ label: "Tools", href: "/tools" }, { label: "New" }]);
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape glyph="close" />);
    expect(getByLabelText("Close")).toBeTruthy();
    expect(queryByLabelText("Go back")).toBeNull();
  });

  it("does the same structural hop under either glyph", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Tools", href: "/tools" }, { label: "New" }]);
    const { getByLabelText } = render(<ScreenEscape glyph="close" />);
    fireEvent.press(getByLabelText("Close"));
    expect(router.replace).toHaveBeenCalledWith("/tools");
  });
});
