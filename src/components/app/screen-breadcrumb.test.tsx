import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenBreadcrumb } from "@/src/components/app/screen-breadcrumb";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import i18n from "@/src/i18n";
import { setPlatformOS } from "@/test/modal-marker-mock";

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
    // Every shape the Escape's label takes: the destination-naming one (#1253),
    // the unnamed-destination fallback, and the form's X.
    expect(queryByLabelText(/^Back to /)).toBeNull();
    expect(queryByLabelText("Go back")).toBeNull();
    expect(queryByLabelText("Close")).toBeNull();
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and an href-less crumb is a `<div role="link">` the browser does
   * nothing with, so Tab reached the crumb and Enter went nowhere (#1730). A
   * crumb brings its own Enter handler: once per press, never on auto-repeat,
   * never on Space - and the press it fires is the singular push a pointer
   * press makes, not a second, plain one.
   */
  describe("on web", () => {
    afterEach(() => {
      setPlatformOS("ios");
    });

    it("a parent crumb activates on Enter, once, with the same singular push a pointer makes", () => {
      setPlatformOS("web");
      mockUseBreadcrumbs.mockReturnValue([
        { label: "Tools", href: "/tools" },
        { label: "Mindfulness" },
      ]);
      const { getByRole } = render(<ScreenBreadcrumb />);

      const crumb = getByRole("link", { name: "Tools" });
      const preventDefault = jest.fn();
      crumb.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith("/tools", { dangerouslySingular: true });
      expect(preventDefault).toHaveBeenCalledTimes(1);

      crumb.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      crumb.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(router.push).toHaveBeenCalledTimes(1);
    });
  });
});
