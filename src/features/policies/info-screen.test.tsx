import { screen } from "@testing-library/react-native";

import { InfoScreen } from "@/src/features/policies/info-screen";
import i18n from "@/src/i18n";
import { appEnv, projectContactEmails } from "@/src/lib/env";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/crisis";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("InfoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/crisis";
  });

  /**
   * `/crisis` is the escape spec's product-guardrail case (#1160): it is pushed
   * from 13 in-app places, and until the Escape became a slot of its own it was
   * a one-crumb screen with no way back - a user in distress mid-exercise could
   * only leave by jumping to Home, discarding where they were.
   *
   * ☠️ SIX of the seven policy routes render through this component, so one
   * assertion here covers `/faq`, `/privacy`, `/terms`, `/cookies` and
   * `/account-deletion` with it. **`/security` is NOT among them** - it
   * hand-rolls the same card structure inline and takes its Escape from
   * `ScreenHeader` directly, so nothing here has ever said anything about it.
   *
   * This claim used to name `/security` too, and the false coverage it implied
   * is part of why the page shipped an h1 → h3 outline unnoticed (#2133): two
   * copies of one structure, and a comment asserting the copy was covered. Its
   * heading outline now has a real guard in `policy-heading-outline.test.tsx`,
   * which renders `/security` and `/privacy` and asserts they agree.
   */
  it("carries an Escape on a one-crumb policy route (#1250)", () => {
    renderWithProviders(
      <InfoScreen
        sectionKey="crisis.sections"
        subtitle="If you need help now."
        title="Crisis support"
      />,
    );

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    // `/crisis` is a leaf off the root, so the Escape names the root (#1253).
    expect(screen.getByLabelText("Back to Home")).toBeTruthy();
    // The trail is still hidden at one crumb, so the title is not repeated above
    // itself - only the Escape was decoupled from the trail.
    expect(screen.getAllByText("Crisis support")).toHaveLength(1);
  });

  /**
   * The FAQ's contact addresses come from `EXPO_PUBLIC_*` rather than from the
   * copy (#2131), and this is the only place the two halves are checked together:
   * `test/policy-contact-addresses.test.ts` reads the JSON, `src/lib/env.test.ts`
   * reads the resolver, and neither notices if `InfoScreen` stops passing the
   * values through.
   *
   * ☠️ It fails SILENTLY when that happens. i18next's "missed to pass in variable"
   * message is routed through its debug logger, and `src/i18n/index.ts` does not
   * set `debug`, so an unsupplied variable prints nothing - `test/setup.js`, which
   * throws on unexpected console output, has nothing to throw on. The reader just
   * gets `write to {{supportEmail}}` on a policy page.
   */
  describe("contact addresses in the FAQ", () => {
    const configured = {
      privacyEmail: "privacy@fork.example",
      securityEmail: "security@fork.example",
      supportEmail: "support@fork.example",
    };
    const original = { ...appEnv };

    afterEach(() => {
      appEnv.privacyEmail = original.privacyEmail;
      appEnv.securityEmail = original.securityEmail;
      appEnv.supportEmail = original.supportEmail;
    });

    function renderFaq() {
      renderWithProviders(
        <InfoScreen sectionKey="faq.sections" subtitle="Common questions." title="FAQ" />,
      );
    }

    it("renders the addresses this build was configured with", () => {
      appEnv.privacyEmail = configured.privacyEmail;
      appEnv.securityEmail = configured.securityEmail;
      appEnv.supportEmail = configured.supportEmail;

      renderFaq();

      // Exact counts, because "at least one" would pass with the parents letter
      // still hardcoded: support and privacy are named twice - once in the
      // parents letter, once in the contact answer - and security once.
      expect(screen.getAllByText(new RegExp(configured.supportEmail))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(configured.privacyEmail))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(configured.securityEmail))).toHaveLength(1);
    });

    /**
     * The defect this fix exists for. A fork that set its own addresses used to
     * get them on `/support` and OURS here, in the paragraph telling a stranger
     * where to send a data-deletion request.
     */
    it("does not leak this project's addresses into a configured fork's FAQ", () => {
      appEnv.privacyEmail = configured.privacyEmail;
      appEnv.securityEmail = configured.securityEmail;
      appEnv.supportEmail = configured.supportEmail;

      renderFaq();

      Object.values(projectContactEmails).forEach((address) => {
        expect(screen.queryByText(new RegExp(address))).toBeNull();
      });
    });

    it("falls back to this project's addresses when the build set none", () => {
      appEnv.privacyEmail = "";
      appEnv.securityEmail = "";
      appEnv.supportEmail = "";

      renderFaq();

      expect(screen.getAllByText(new RegExp(projectContactEmails.support))).toHaveLength(2);
      expect(screen.getAllByText(new RegExp(projectContactEmails.security))).toHaveLength(1);
    });

    it("leaves no unresolved interpolation on the page", () => {
      appEnv.privacyEmail = "";
      appEnv.securityEmail = "";
      appEnv.supportEmail = "";

      renderFaq();

      expect(screen.queryAllByText(/\{\{/)).toEqual([]);
    });
  });
});
