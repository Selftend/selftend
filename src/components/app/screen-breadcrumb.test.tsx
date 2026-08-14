import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import i18n from "@/src/i18n";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;

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
    // `dangerouslySingular` is part of what a crumb press IS (#1027): a crumb targets an
    // ancestor, so without it the press mounts a SECOND copy of a screen already in the
    // stack. Asserted with the option, not just the href.
    expect(router.push).toHaveBeenCalledWith("/tools", { dangerouslySingular: true });
  });

  // #495, revised on owner decision (2026-07-29): the back affordance is
  // STRUCTURAL - always one step up the trail (Material's "Up"), never
  // history. Browser/system back covers history on every platform; this
  // arrow's job is the deterministic single hop the trail promises.
  it("renders a back button that climbs to the deepest ancestor crumb", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Gratitude log", href: "/tools/gratitude-log" },
      { label: "Entry" },
    ]);
    const { getByLabelText } = render(<ScreenBreadcrumb />);
    fireEvent.press(getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/tools/gratitude-log");
  });

  it("hides the back button along with a hidden trail", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Home" }]);
    const { queryByLabelText } = render(<ScreenBreadcrumb />);
    expect(queryByLabelText("Go back")).toBeNull();
  });
});
