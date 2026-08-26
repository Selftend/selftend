import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { RelatedTools } from "./related-tools";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { expectEscapeReturnsTo } from "@/test/escape-round-trip";
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
   * The row used to force `dangerouslySingular: true` on every push, and #1266's
   * migration onto the Origin helper deliberately preserved that (its AC was "no
   * navigation behaviour changes other than origin recording"). #1216 then ruled
   * the flag off: singularity is the layout's call, made once for every caller.
   * Three of this row's four routes have been declared singular there since
   * #1278, so the flag was redundant for them - and actively wrong for the
   * fourth: `/tools/meditation` is keyed by `?practice=` and holds per-visit
   * state, so `protected-layout.tsx` deliberately leaves it plain, and forcing
   * singular here returned the user to a live meditation instance instead of a
   * fresh home.
   *
   * One argument, not `(href, undefined)`: the helper forwards options only when
   * given, so this asserts that no options ride along at all.
   */
  it("pushes plainly, leaving singularity to the layout", () => {
    renderWithProviders(<RelatedTools tools={TOOLS} />);

    fireEvent.press(screen.getByRole("link"));

    expect(router.push).toHaveBeenCalledWith("/tools/habits");
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

    expectEscapeReturnsTo({
      arriveAt: (pathname) => {
        mockPathname = pathname;
      },
      destination: "/tools/habits",
      name: "Values",
      origin: "/modules/act/values",
    });
  });
});
