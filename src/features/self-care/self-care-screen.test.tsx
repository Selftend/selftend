import { screen } from "@testing-library/react-native";
import { router } from "expo-router";

// ☠️ This test must NOT live beside the screen: everything under app/ is an
// expo-router ROUTE, so a test file there would register a literal route and
// fail the route-population guards. Screens in app/ get their component tests
// out here, beside the feature's queries.
import SelfCareScreen from "@/app/(app)/modules/cbt/self-care";
import { useSelfCareLog, useUpsertSelfCareLog } from "@/src/features/self-care/queries";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/modules/cbt/self-care",
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLog: jest.fn(),
  useUpsertSelfCareLog: jest.fn(),
}));

const mockUseSelfCareLog = jest.mocked(useSelfCareLog);
const mockUseUpsert = jest.mocked(useUpsertSelfCareLog);
const mockRouter = jest.mocked(router);

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSelfCareLog.mockReturnValue({
    data: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useSelfCareLog>);
  mockUseUpsert.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpsertSelfCareLog>);
});

/**
 * react-native-web hands a `link`'s Enter to the browser, expecting a native
 * anchor - and these href-less Pressables are `<div role="link">`s the browser
 * does nothing with, so Tab reached the sleep and gratitude doors and Enter
 * opened nothing (#1736). Each door brings its own Enter handler: once per
 * press, never on auto-repeat, never on Space (a link does not activate on
 * Space) - and never on a button, which react-native-web activates itself; a
 * second handler there would fire the press twice.
 *
 * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
 * on a real `<div role="link">` - is proven once for the helper itself, on the
 * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
 */
describe("the sleep and gratitude doors on web", () => {
  beforeEach(() => {
    setPlatformOS("web");
  });

  afterEach(() => {
    setPlatformOS("ios");
  });

  it.each([
    ["Track sleep", "/tools/sleep"],
    ["Gratitude", "/tools/gratitude-log"],
  ])("%s activates on Enter, once, and not on a held key or on Space", (name, route) => {
    renderWithProviders(<SelfCareScreen />);

    const door = screen.getByRole("link", { name });
    const preventDefault = jest.fn();
    door.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith(route);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    door.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
    door.props.onKeyDown({ key: " ", repeat: false, preventDefault });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it("brings no Enter handler to any button on the screen", () => {
    renderWithProviders(<SelfCareScreen />);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.props.onKeyDown).toBeUndefined();
    }
  });
});
