import { fireEvent, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { ConsentGate } from "./consent-gate";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
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
});
