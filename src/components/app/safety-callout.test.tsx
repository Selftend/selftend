import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { CrisisSupportCallout } from "./safety-callout";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { linkHref } from "@/test/expo-router-link-mock";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/act";

jest.mock("expo-router", () => ({
  // ☠️ Added on #2496, when the callout's button became a `LinkButton`. Without
  // a `Link` in this factory the component renders `undefined` where the anchor
  // should be and every test here dies on an element-type error - including the
  // heading-level ones, which have nothing to do with the link.
  Link: require("@/test/expo-router-link-mock").MockLink,
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/modules/act";
});

/**
 * ⚠️ The component is `CrisisSupportCallout`; `safety-callout.tsx` is only the
 * file name, so a sweep grepping for `<SafetyCallout` finds nothing. It is the
 * loud destructive-red twin of `CrisisSupportBar`.
 *
 * ☠️ It has **five** call sites, not the two this docblock claimed until #2137:
 * the ACT, CBT and DBT module homes, `/support`, and `/faq`. The count mattered
 * the moment the heading level became a per-caller decision - a reader trusting
 * "two module homes" would have reasoned about the blast radius of that change
 * from a number less than half the real one.
 */
describe("CrisisSupportCallout", () => {
  /**
   * ☠️ **An href, not a `router.push` spy, since #2496** — the callout's button
   * became a real anchor when `docs/brand-result.md` § 7.4 was ruled to reach
   * shared chrome. The assertion is *stronger*, not weaker: it proves the thing
   * that changed. A link target is what middle-click, "copy link" and a screen
   * reader's link role all read, and `router.push` could never have told a real
   * anchor from a press handler that happened to navigate.
   *
   * ⚠️ The negative is the other half and is why this is not a restatement: the
   * mock does not simulate navigation, so a call site that still pushed *for
   * itself* beside the href would show up here as a `router.push` call. That is
   * exactly the half-migrated shape this conversion could have left behind.
   */
  it("opens the crisis page as a real link, and pushes nothing itself", () => {
    renderWithProviders(<CrisisSupportCallout />);

    expect(linkHref("Open crisis guidance")).toBe("/crisis");
    expect(router.push).not.toHaveBeenCalled();
  });

  /**
   * ☠️ **The heading level, both halves (#2137, #2167).**
   *
   * ☠️ **The DEFAULT is the one that matters now** - all five call sites pass
   * nothing, so this assertion is the only thing standing between them and a
   * silent outline change on five screens at once. It carries more weight than
   * the override case below, which no shipped caller exercises.
   *
   * The override is still pinned, because a prop that is never proven to work is
   * a prop that quietly stops working. `3` is used as the sample precisely
   * because it is the value the callout used to ship at.
   *
   * ☠️ Levels through `Number(...)`: `text.tsx`'s `ARIA_LEVEL` map yields the
   * STRING `"2"` while `CardTitle` passes a number, so a bare `toBe(2)` fails on a
   * correct tree. Host nodes only - `role="heading"` on our `Text` is visible on
   * the composite and on the host, which is two nodes for one heading.
   */
  it.each([
    [undefined, 2],
    [3 as const, 3],
  ])("renders its title at level %s -> %s", (level, expected) => {
    renderWithProviders(<CrisisSupportCallout level={level} />);

    const headings = screen
      .UNSAFE_getAllByProps({ role: "heading" })
      .filter((node) => typeof node.type === "string");

    expect(headings).toHaveLength(1);
    expect(Number(headings[0].props["aria-level"])).toBe(expected);
  });

  /**
   * The same cross-hierarchy jump the bar makes (#1265, O3), from a module home
   * rather than from inside an exercise. `/crisis` is rooted at the top, so
   * without the Origin the way out of it lands on Home.
   *
   * On the store rather than on `router.push`: the helper pushes through
   * `router.push`, so the assertion above cannot tell a migrated call site from
   * an unmigrated one.
   *
   * ⚠️ **Still a press, and still the point, after #2496.** The anchor navigates
   * itself now, but the Origin record is a handler *beside* the href, and the
   * Slot leaves the child's own `onPress` in place — so this is what proves the
   * conversion kept the Origin rather than dropping it. § 7.4 called that record
   * "a build detail, not a decision - kept on the anchor, or its drop
   * documented"; it is kept, and this is where that is true.
   */
  it("records the module home it left as the Origin for /crisis", () => {
    renderWithProviders(<CrisisSupportCallout />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/act",
      forPathname: "/crisis",
    });
  });
});
