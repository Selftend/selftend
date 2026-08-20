import { screen } from "@testing-library/react-native";

import { InfoScreen } from "@/src/features/policies/info-screen";
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
   * The seven policy routes all render through this component, so one assertion
   * here covers `/faq`, `/privacy`, `/terms`, `/cookies`, `/security` and
   * `/account-deletion` with it.
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
    expect(screen.getByLabelText("Go back")).toBeTruthy();
    // The trail is still hidden at one crumb, so the title is not repeated above
    // itself - only the Escape was decoupled from the trail.
    expect(screen.getAllByText("Crisis support")).toHaveLength(1);
  });
});
