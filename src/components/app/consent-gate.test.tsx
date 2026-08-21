import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { ConsentGate } from "./consent-gate";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules/cbt",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useRecordPolicyConsent: () => ({
    isError: false,
    isPending: false,
    mutateAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

const CHECKBOX_LABEL =
  "I am 18 or older, agree to the current Privacy Policy and Terms of Service, and consent to Selftend processing the self-help entries I choose to save, including any wellness or mental-health reflection content I enter.";

function setPlatform(os: string) {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
}

describe("ConsentGate", () => {
  it("toggles the consent checkbox on press and announces the checked state", () => {
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    const row = screen.getByLabelText(CHECKBOX_LABEL);
    expect(row).not.toBeChecked();
    // Space activation is web-only; native gets no key handler.
    expect(row.props.onKeyDown).toBeUndefined();

    fireEvent.press(row);
    expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeChecked();
  });

  it("toggles the consent checkbox with the Space key on web", () => {
    setPlatform("web");
    try {
      renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

      const row = screen.getByLabelText(CHECKBOX_LABEL);
      expect(row).not.toBeChecked();

      const preventDefault = jest.fn();
      fireEvent(row, "keyDown", { key: " ", preventDefault });

      // Space must toggle the checkbox and not scroll the page.
      expect(preventDefault).toHaveBeenCalled();
      expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeChecked();
    } finally {
      setPlatform("ios");
    }
  });

  it("ignores non-Space keys on web", () => {
    setPlatform("web");
    try {
      renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

      const row = screen.getByLabelText(CHECKBOX_LABEL);
      fireEvent(row, "keyDown", { key: "a", preventDefault: jest.fn() });

      expect(screen.getByLabelText(CHECKBOX_LABEL)).not.toBeChecked();
    } finally {
      setPlatform("ios");
    }
  });

  it("ignores OS key auto-repeat while Space is held on web", () => {
    setPlatform("web");
    try {
      renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

      const row = screen.getByLabelText(CHECKBOX_LABEL);
      fireEvent(row, "keyDown", { key: " ", repeat: false, preventDefault: jest.fn() });
      // Auto-repeat events (repeat: true) must not toggle the state back.
      fireEvent(row, "keyDown", { key: " ", repeat: true, preventDefault: jest.fn() });
      fireEvent(row, "keyDown", { key: " ", repeat: true, preventDefault: jest.fn() });

      expect(screen.getByLabelText(CHECKBOX_LABEL)).toBeChecked();
    } finally {
      setPlatform("ios");
    }
  });

  /**
   * The gate stands over whatever route the user was heading for, so reading a
   * policy from it is a jump out and back (#1265, O3). Both policy routes sit at
   * the root, so without the Origin the way out of one lands on Home rather than
   * returning to the gate the user still has to clear.
   *
   * On the store rather than on `router.push`: the helper pushes through
   * `router.push`, so a push assertion cannot tell a migrated call site from an
   * unmigrated one.
   */
  it("records the gated screen as the Origin for a policy it sends the user to read", () => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    fireEvent.press(screen.getByText("Read Privacy Policy"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/cbt",
      forPathname: "/privacy",
    });
  });
});
