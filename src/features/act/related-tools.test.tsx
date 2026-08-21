import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { RelatedTools } from "./related-tools";
import { ScreenEscape } from "@/src/components/app/screen-escape";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/act/values";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

const TOOLS = [{ icon: "task-alt" as const, nameKey: "habits", href: "/tools/habits" }];

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/modules/act/values";
});

/**
 * ACT's "Also try" row, migrated onto the Origin helper (#1266, clause O3).
 *
 * ⚠️ Every assertion about the migration is on the STORE, never on
 * `router.push`. The helper pushes *through* `router.push`, so a
 * `toHaveBeenCalledWith("/tools/habits")` passes identically whether or not this
 * component was ever migrated - the trap that makes this whole batch invisible
 * to the tests that already exist.
 *
 * This row is one of the genuinely off-trail sets in the batch. It jumps from an
 * ACT exercise sideways into a standalone tool under `/tools`, so the tool's own
 * Up climbs to `/tools` and never back to the ACT screen the user was working
 * in.
 */
describe("RelatedTools records the screen it was reached from", () => {
  it("records the ACT screen the user left as the Origin for the tool", () => {
    renderWithProviders(<RelatedTools tools={TOOLS} />);

    fireEvent.press(screen.getByRole("link"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/act/values",
      forPathname: "/tools/habits",
    });
  });

  /**
   * AC4 - "no navigation behaviour changes other than origin recording" - and
   * the one place in this batch where it took a code change to hold.
   *
   * `dangerouslySingular` is load-bearing here: "Related" is lateral by
   * definition, so the tool being jumped to may be the very one the user came
   * from two hops ago (#1027), and without the flag the stack grows a second
   * copy of a screen already in it. `usePushWithOrigin` originally forwarded
   * only an `Href`, so migrating this call site would have silently dropped the
   * flag - a real change to shipped ACT navigation, disguised as a mechanical
   * substitution. The helper takes push options now; this pins that they arrive.
   */
  it("still passes dangerouslySingular through to the router", () => {
    renderWithProviders(<RelatedTools tools={TOOLS} />);

    fireEvent.press(screen.getByRole("link"));

    expect(router.push).toHaveBeenCalledWith("/tools/habits", { dangerouslySingular: true });
  });

  /**
   * The acceptance criterion end to end, through the real route map: leave an
   * ACT screen for a shared tool, and the Escape over there both names the
   * screen you left and goes back to it.
   */
  it("lets the Escape on the tool return to the ACT screen, named", () => {
    const session = renderWithProviders(<RelatedTools tools={TOOLS} />);
    fireEvent.press(screen.getByRole("link"));
    // The screen the user left is really gone before the next one mounts, so
    // nothing below can match a leftover node from the departed tree.
    session.unmount();

    mockPathname = "/tools/habits";
    renderWithProviders(<ScreenEscape />);

    expect(screen.getByText("Values")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Back to Values"));
    expect(router.replace).toHaveBeenCalledWith("/modules/act/values");
  });
});
