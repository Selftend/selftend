import { fireEvent, screen } from "@testing-library/react-native";

import { router } from "expo-router";

import { CrisisSupportBar } from "./crisis-support-bar";
import { ScreenEscape } from "./screen-escape";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/tools/grounding";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => mockPathname,
}));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/tools/grounding";
});

describe("CrisisSupportBar", () => {
  it("renders the slim crisis label", () => {
    renderWithProviders(<CrisisSupportBar />);

    expect(screen.getByText("Not for emergencies · Crisis resources")).toBeTruthy();
  });

  it("is a single pressable that navigates to the crisis page on press", () => {
    renderWithProviders(<CrisisSupportBar />);

    const pressables = screen.getAllByRole("button");
    expect(pressables).toHaveLength(1);

    fireEvent.press(pressables[0]);

    expect(router.push as jest.Mock).toHaveBeenCalledWith("/crisis");
  });

  /**
   * #887 (decided on #882/#868): a hairline row, not a filled box. The quiet
   * redesign left the filled container the loudest element on screens that gave
   * up their cards — the affordance stays, the box goes.
   */
  it("draws hairline rules, never a filled rounded container", () => {
    renderWithProviders(<CrisisSupportBar />);

    const tokens = String(screen.getByRole("button").props.className).split(/\s+/);
    expect(tokens).toContain("border-y");
    expect(tokens).not.toContain("bg-muted/40");
    expect(tokens.some((token) => token.startsWith("rounded"))).toBe(false);
  });
});

/**
 * The product-guardrail case behind the whole escape spec (#1265, clause O3).
 *
 * This bar renders on eleven screens - nine ACT exercises, the CBT new-record
 * screen, grounding home, the mood entry editor - and `CrisisSupportCallout`
 * adds two module homes. That is thirteen cross-hierarchy jumps into `/crisis`
 * from deep inside a therapy tool, and `/crisis` sits at the root, so its Up is
 * Home. Before this, a user in distress mid-exercise who reached for crisis
 * support could not get back to what they were doing.
 *
 * ⚠️ The bar is the reason the assertion below is on the STORE and not on
 * `router.push`. `usePushWithOrigin` pushes through `router.push` itself, so
 * every pre-existing `expect(router.push).toHaveBeenCalledWith("/crisis")`
 * passes identically whether or not this call site was ever migrated. A
 * migration batch checked only against those assertions would read as done
 * while recording nothing.
 */
describe("CrisisSupportBar records where it was reached from", () => {
  it("records the screen it left as the Origin for /crisis", () => {
    renderWithProviders(<CrisisSupportBar />);

    fireEvent.press(screen.getByRole("button"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/tools/grounding",
      forPathname: "/crisis",
    });
  });

  /**
   * The acceptance criterion end to end, through the real route map rather than
   * a mocked trail: leave a session screen for crisis support, and the Escape
   * over there both names that screen and goes back to it.
   */
  it("lets the Escape on /crisis return to that screen, named", () => {
    renderWithProviders(<CrisisSupportBar />);
    fireEvent.press(screen.getByRole("button"));

    // The arrival. `/crisis` is a one-crumb screen, so its trail is hidden and
    // the Escape's own label is the only thing naming where the exit goes.
    mockPathname = "/crisis";
    renderWithProviders(<ScreenEscape />);

    expect(screen.getByText("Grounding")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Back to Grounding"));
    expect(router.replace).toHaveBeenCalledWith("/tools/grounding");
  });
});
