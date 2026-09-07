import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { CrisisSupportCallout } from "./safety-callout";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/act";

jest.mock("expo-router", () => ({
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
  it("opens the crisis page", () => {
    renderWithProviders(<CrisisSupportCallout />);

    fireEvent.press(screen.getByText("Open crisis guidance"));

    expect(router.push).toHaveBeenCalledWith("/crisis");
  });

  /**
   * ☠️ **The heading level, both halves (#2137).**
   *
   * The default has to be pinned as hard as the override: every call site shipped
   * at `CardTitle`'s 3, three of them still pass nothing, and a change of default
   * would silently move the outline on the ACT, CBT and DBT homes - screens whose
   * own tests assert their level runs and would then fail somewhere else entirely.
   *
   * ☠️ Levels through `Number(...)`: `text.tsx`'s `ARIA_LEVEL` map yields the
   * STRING `"3"` while `CardTitle` passes a number, so a bare `toBe(3)` fails on a
   * correct tree. Host nodes only - `role="heading"` on our `Text` is visible on
   * the composite and on the host, which is two nodes for one heading.
   */
  it.each([
    [undefined, 3],
    [2 as const, 2],
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
