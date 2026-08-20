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

  // R7 (#1250): this component is the trail and nothing else. The leading
  // affordance moved out to `ScreenEscape` precisely because living in here made
  // it vanish on every one-crumb screen - so it must not creep back in.
  it("renders links only - the leading affordance is not its to draw", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Gratitude log", href: "/tools/gratitude-log" },
      { label: "Entry" },
    ]);
    const { queryByRole, queryByLabelText } = render(<ScreenBreadcrumb />);
    // Deliberately NOT `queryByTestId("screen-escape")`: this component does not
    // import `ScreenEscape`, so that assertion could never fail - it would read
    // as a guard while guarding nothing. These three can fail, because they catch
    // an affordance re-added here in any shape rather than one exact testID.
    expect(queryByRole("button")).toBeNull();
    expect(queryByLabelText("Go back")).toBeNull();
    expect(queryByLabelText("Close")).toBeNull();
  });
});
