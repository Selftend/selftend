import { fireEvent, screen } from "@testing-library/react-native";
import * as Linking from "expo-linking";

import SecurityScreen from "../../../app/security";
import { contactEmails } from "@/src/lib/env";
import enSecurity from "@/src/i18n/locales/en/security.json";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/security",
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
});

/**
 * `/security` renders on the shared policy chrome (#2146).
 *
 * ☠️ **This screen's first structural test, and the gap is the point.** It is the
 * seventh policy page and the only one that never rendered through `InfoScreen`
 * - it kept its own `SafeAreaView` / `ScrollView` / `Card` copy of the same
 * structure. Nothing asserted that copy: `policy-origin.test.tsx` renders the
 * screen but only reads the Origin store, and `info-screen.test.tsx`'s docblock
 * claimed to cover `/security` while testing a component this page does not
 * call. Two silent copies plus a false coverage claim is how #2133 shipped a
 * skipped heading level here and nowhere else.
 *
 * So the fold-in is only half the work; this file is the other half. It pins what
 * the rewrite had to carry across intact, which is everything the page shipped.
 */
describe("SecurityScreen folds into the shared policy layout (#2146)", () => {
  /**
   * The chrome, proven by what only the chrome provides. `PolicyPageLayout` owns
   * the header block, and `ScreenHeader` renders `<ScreenEscape />`
   * unconditionally - so an Escape here is the observable consequence of going
   * through the shared layout rather than a second hand-rolled copy of it.
   *
   * ⚠️ `/security` deliberately has no `STATIC_ROUTES` entry (#1209), so with no
   * Origin recorded the Escape is the bare Up affordance, not a named return.
   */
  it("renders through PolicyPageLayout, so it carries an Escape", () => {
    renderWithProviders(<SecurityScreen />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    // The title once, not twice: the one-crumb trail still hides itself, so the
    // page name is not repeated above its own heading.
    expect(screen.getAllByText(enSecurity.page.pageTitle)).toHaveLength(1);
    expect(screen.getByText(enSecurity.page.pageDescription)).toBeTruthy();
  });

  /**
   * The sections come from THIS page's namespace, handed over as a resolved
   * array. ☠️ That is the seam the extraction was shaped around (#2144): the six
   * `InfoScreen` routes read `policies`, `/security` reads `security` and the key
   * `page.sections`, so a `PolicySectionCards` that took a KEY could not serve
   * both. Asserting a real section title here is what proves the array arrived
   * rather than an empty render quietly passing everything above.
   */
  it("renders every section from its own namespace as a card", () => {
    renderWithProviders(<SecurityScreen />);

    const titles = enSecurity.page.sections.map((section) => section.title);
    // Anti-vacuity, not a content assertion: a `for` over an empty array passes
    // every iteration it never runs, so a `page.sections` that resolved to
    // nothing would make the loop below meaningless. The page ships seven
    // sections; the floor only has to be non-trivial, so adding an eighth is
    // free and emptying the key is not.
    expect(titles.length).toBeGreaterThanOrEqual(7);

    for (const title of titles) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  /**
   * ☠️ **BOTH trailing Buttons, in order.** The slice this ticket came from
   * described one; the page ships two, and dropping either is a silent loss of
   * the only route out of this page. Order is asserted rather than mere presence
   * because two `getByText`s pass just as happily on a page that swapped them.
   *
   * ⚠️ The copy is ESCAPED before it becomes a pattern. Interpolating shipped
   * strings into a `RegExp` raw reads fine against today's two labels and breaks
   * silently on the first one to contain a metacharacter - this same namespace
   * already ships section copy ending in `?`, so that is one copy edit away, and
   * the failure would be a match that quietly stops matching rather than an error.
   */
  it("keeps both trailing buttons, in order", () => {
    renderWithProviders(<SecurityScreen />);

    const escapeForPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const labels = screen
      .getAllByText(
        new RegExp(
          `^(${escapeForPattern(enSecurity.page.privacyPolicyLink)}|${escapeForPattern(
            enSecurity.page.securityContactLabel,
          )})$`,
        ),
      )
      .map((node) => node.props.children);

    expect(labels).toEqual([
      enSecurity.page.privacyPolicyLink,
      enSecurity.page.securityContactLabel,
    ]);
  });

  /**
   * The first button's behaviour, not just its label: it pushes `/privacy`
   * through `usePushWithOrigin`, so the Escape over there can return here. A
   * rewrite that reached for a bare `router.push` would leave the label intact
   * and this store empty.
   */
  it("pushes /privacy with the Origin recorded", () => {
    renderWithProviders(<SecurityScreen />);

    fireEvent.press(screen.getByText(enSecurity.page.privacyPolicyLink));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/security",
      forPathname: "/privacy",
    });
  });

  /**
   * The second button opens `mailto:` off the resolved security address.
   *
   * ⚠️ The address is read through `contactEmails()` rather than written out:
   * #2131 moved the `|| "security@selftend.org"` fallback out of this file and
   * into that resolver, so hardcoding the literal here would pin a value this
   * screen no longer owns.
   *
   * ⚠️ So be clear about what this does and does not guard. It pins that the
   * button reaches the RESOLVER and interpolates whatever it returns - a rewrite
   * that hardcoded an address, or dropped the `mailto:` prefix, fails here. The
   * non-empty check only catches the degenerate `mailto:` with no address; the
   * fallback RULE itself belongs to `src/lib/env.ts` and is guarded in
   * `env.test.ts`, not here.
   */
  it("opens mailto: on the resolved security address", () => {
    renderWithProviders(<SecurityScreen />);

    fireEvent.press(screen.getByText(enSecurity.page.securityContactLabel));

    const { securityEmail } = contactEmails();
    expect(securityEmail).toBeTruthy();
    expect(Linking.openURL).toHaveBeenCalledWith(`mailto:${securityEmail}`);
  });

  /**
   * ☠️ The heading level is INHERITED from `PolicySectionCards`, not re-made
   * here. #2133 landed `aria-level={2}` inline on this page after it shipped
   * h1 → h3; the fold-in had to carry that across, and it does so by deleting the
   * second copy of the structure rather than by copying the override again.
   *
   * ☠️ Read through `Number(...)`: `text.tsx`'s `ARIA_LEVEL` map yields STRINGS
   * for the `Text` variants while `CardTitle` passes a NUMBER, so a bare
   * `toBe(2)` fails on a correct tree.
   */
  it("takes its level-2 section titles from the shared component", () => {
    renderWithProviders(<SecurityScreen />);

    const levels = screen.getAllByRole("heading").map((node) => Number(node.props["aria-level"]));

    expect(levels[0]).toBe(1);
    expect(levels.slice(1)).toEqual(enSecurity.page.sections.map(() => 2));
  });
});
