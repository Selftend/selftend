import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import SelfCareScreen from "../../../app/(app)/modules/cbt/self-care";
import { useSelfCareLog, useUpsertSelfCareLog } from "@/src/features/self-care/queries";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { expectEscapeReturnsTo } from "@/test/escape-round-trip";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/cbt/self-care";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

jest.mock("@/src/components/app/screen-breadcrumb", () => ({ ScreenBreadcrumb: () => null }));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/self-care/queries", () => ({
  useSelfCareLog: jest.fn(),
  useUpsertSelfCareLog: jest.fn(),
}));

const mockUseSelfCareLog = useSelfCareLog as jest.Mock;
const mockUseUpsert = useUpsertSelfCareLog as jest.Mock;

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/modules/cbt/self-care";
  mockUseSelfCareLog.mockReturnValue({ data: null, isLoading: false });
  mockUseUpsert.mockReturnValue({ mutateAsync: jest.fn(), isPending: false });
});

/**
 * The two pushes that leave CBT for a standalone tool, migrated by #1266.
 *
 * ⚠️ **These are the batch's real off-trail set, and the ticket does not mention
 * them.** #1266 flagged the CBT home's shared-tool chips as "the one genuinely
 * off-trail set in this batch" - but those chips render through
 * `SharedToolsRow`, which lives in `src/components/app` and so was migrated by
 * batch 1 (#1265), hours-old cross-links and all. Self-care is where CBT was
 * still crossing into `/tools` through a bare `router.push`: two links, on a
 * screen the ticket's file list covers only by directory.
 *
 * That is the opt-out argument landing on the ticket that made it. Under an
 * opt-in scheme these two would have been left out - nobody enumerated them -
 * and would have failed the way an Origin rule always fails: invisibly, with the
 * sleep screen just quietly showing Up to `/tools`.
 *
 * ⚠️ Both assertions are on the STORE. `usePushWithOrigin` pushes *through*
 * `router.push`, so an assertion on the router passes identically whether or not
 * this screen was ever migrated.
 */
describe("self-care records the module it was left from", () => {
  it.each([
    ["Track sleep", "/tools/sleep"],
    ["Gratitude", "/tools/gratitude-log"],
  ])("records CBT self-care as the Origin for %s", (label, route) => {
    renderWithProviders(<SelfCareScreen />);

    fireEvent.press(screen.getByLabelText(label));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/cbt/self-care",
      forPathname: route,
    });
  });

  /**
   * End to end through the real route map: leave self-care for the sleep tool,
   * and the Escape over there names self-care and goes back to it - rather than
   * climbing to `/tools`, which is where that screen's own Up leads and where
   * the user has never been.
   */
  it("lets the Escape on the tool return to self-care, named", () => {
    const session = renderWithProviders(<SelfCareScreen />);
    fireEvent.press(screen.getByLabelText("Track sleep"));
    session.unmount();

    expectEscapeReturnsTo({
      arriveAt: (pathname) => {
        mockPathname = pathname;
      },
      destination: "/tools/sleep",
      name: "Self-care",
      origin: "/modules/cbt/self-care",
    });
  });
});
