import { screen } from "@testing-library/react-native";
import { router } from "expo-router";

// ☠️ This test must NOT live beside the screen: everything under app/ is an
// expo-router ROUTE, so a test file there would register a literal route and
// fail the route-population guards. Screens in app/ get their component tests
// out here, beside the feature's queries.
import NewGoalScreen from "@/app/(app)/modules/cbt/goals/new";
import { useGoal, useMilestones, useSaveGoal } from "@/src/features/goals/queries";
import { useValuesProfile } from "@/src/features/values/queries";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => false), push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
  usePathname: () => "/modules/cbt/goals/new",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/goals/queries", () => ({
  useGoal: jest.fn(),
  useMilestones: jest.fn(),
  useSaveGoal: jest.fn(),
}));

jest.mock("@/src/features/values/queries", () => ({
  useValuesProfile: jest.fn(),
}));

const mockUseGoal = jest.mocked(useGoal);
const mockUseMilestones = jest.mocked(useMilestones);
const mockUseSaveGoal = jest.mocked(useSaveGoal);
const mockUseValuesProfile = jest.mocked(useValuesProfile);
const mockRouter = jest.mocked(router);

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseGoal.mockReturnValue({
    data: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useGoal>);
  mockUseMilestones.mockReturnValue({
    data: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useMilestones>);
  mockUseSaveGoal.mockReturnValue({
    mutateAsync: jest.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useSaveGoal>);
  // No ranked values yet: the first step offers the quiet link to the values
  // screen instead of the chips.
  mockUseValuesProfile.mockReturnValue({
    data: null,
    isLoading: false,
  } as unknown as ReturnType<typeof useValuesProfile>);
});

/**
 * react-native-web hands a `link`'s Enter to the browser, expecting a native
 * anchor - and this href-less Pressable is a `<div role="link">` the browser
 * does nothing with, so Tab reached the values link and Enter opened nothing
 * (#1736). The link brings its own Enter handler: once per press, never on
 * auto-repeat, never on Space (a link does not activate on Space) - and never
 * on a button, which react-native-web activates itself; a second handler there
 * would fire the press twice.
 *
 * ⚠️ jest can only prove the handler is there. The browser half - a real Enter
 * on a real `<div role="link">` - is proven once for the helper itself, on the
 * support page's Show-all door, in `test/e2e/support-page.e2e.test.ts`.
 */
describe("the values link on web", () => {
  beforeEach(() => {
    setPlatformOS("web");
  });

  afterEach(() => {
    setPlatformOS("ios");
  });

  it("activates on Enter, once, and not on a held key or on Space; no button brings a handler", async () => {
    renderWithProviders(<NewGoalScreen />);

    // Wait out the draft-store hydration gate.
    const link = await screen.findByRole("link", { name: "Clarify your values" });
    const preventDefault = jest.fn();
    link.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/modules/cbt/values");
    expect(preventDefault).toHaveBeenCalledTimes(1);

    link.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
    link.props.onKeyDown({ key: " ", repeat: false, preventDefault });
    expect(mockRouter.push).toHaveBeenCalledTimes(1);

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.props.onKeyDown).toBeUndefined();
    }
  });
});
