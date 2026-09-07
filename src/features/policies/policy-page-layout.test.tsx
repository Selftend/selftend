import { screen } from "@testing-library/react-native";

import { PolicyPageLayout } from "@/src/features/policies/policy-page-layout";
import i18n from "@/src/i18n";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/crisis";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

describe("PolicyPageLayout", () => {
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
   * ☠️ This assertion MOVED here from `info-screen.test.tsx` on #2144, and the
   * move is a correction rather than a tidy-up. The Escape was never
   * `InfoScreen`'s: `screen-header.tsx` renders `<ScreenEscape />`
   * unconditionally and its docblock forbids gating it, so this was a
   * `ScreenHeader` test wearing an `InfoScreen` costume. It belongs with the
   * layout that owns the header - which is also the component `/security` and
   * `/faq` fold onto (#2146, #2147), so keeping it here means it covers them
   * when they arrive instead of silently not covering them.
   */
  it("carries an Escape on a one-crumb policy route (#1250)", () => {
    renderWithProviders(
      <PolicyPageLayout subtitle="If you need help now." title="Crisis support" />,
    );

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    // `/crisis` is a leaf off the root, so the Escape names the root (#1253).
    expect(screen.getByLabelText("Back to Home")).toBeTruthy();
    // The trail is still hidden at one crumb, so the title is not repeated above
    // itself - only the Escape was decoupled from the trail.
    expect(screen.getAllByText("Crisis support")).toHaveLength(1);
  });

  /**
   * ☠️ The `subtitle` prop is `ReactNode` so a caller can hand over MULTIPLE
   * children of the one muted `Text` - `InfoScreen` passes its subtitle and the
   * `lastUpdated` suffix that way. This asserts the layout renders such a
   * fragment as one text run rather than dropping the tail, which is the failure
   * a `subtitle: string` signature would have forced the caller to work around
   * by concatenating.
   */
  it("renders a multi-part subtitle as one run of text", () => {
    renderWithProviders(
      <PolicyPageLayout
        subtitle={
          <>
            {"How we handle your data."}
            {" Last updated 4 September 2026."}
          </>
        }
        title="Privacy"
      />,
    );

    expect(screen.getByText(/How we handle your data\./)).toBeTruthy();
    expect(screen.getByText(/Last updated 4 September 2026\./)).toBeTruthy();
  });
});
