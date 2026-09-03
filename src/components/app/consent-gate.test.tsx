import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { ConsentGate } from "./consent-gate";
import { policyVersion } from "@/src/features/policies/policy-content";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules/cbt",
}));

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: { id: "user-1" } }),
}));

const mockMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("@/src/features/settings/queries", () => ({
  useRecordPolicyConsent: () => ({
    isError: false,
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

const CHECKBOX_LABEL =
  "I am 18 or older and agree to the current Privacy Policy and Terms of Service.";

const HEALTH_DATA_LABEL =
  "I consent to Selftend processing the self-help entries I choose to save, including any wellness or mental-health reflection they contain, only to provide the app features I use.";

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

/**
 * The explicit Art. 9(2)(a) consent (#1766, spec #227 §3).
 *
 * Until this ticket the gate asked ONE question carrying three: an age
 * assertion, agreement to the terms, and consent to processing the self-help
 * entries the person saves. The third is special-category health data, and
 * Art. 9(2)(a) wants an explicit act for it - separately worded, separately
 * given. These tests are what stops the two collapsing back into one, which is
 * the shape the gate had for four months and the shape a later tidy-up would
 * naturally restore.
 */
describe("ConsentGate - explicit Art. 9 consent (#1766)", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it("offers the Art. 9 consent as its own control, unticked", () => {
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    const healthData = screen.getByLabelText(HEALTH_DATA_LABEL);
    expect(healthData).not.toBeChecked();
    // Two controls, not one relabelled.
    expect(screen.getByLabelText(CHECKBOX_LABEL)).not.toBeChecked();
    expect(healthData).not.toBe(screen.getByLabelText(CHECKBOX_LABEL));
  });

  it("words the Art. 9 consent for the processing, not for the documents", () => {
    // "Separately worded" is the requirement, so the two labels must not be the
    // same sentence with a different testID. The terms control names the
    // documents; the Art. 9 control names what is done with the entries.
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    expect(CHECKBOX_LABEL).toMatch(/Privacy Policy and Terms of Service/);
    expect(HEALTH_DATA_LABEL).not.toMatch(/Terms of Service/);
    expect(HEALTH_DATA_LABEL).toMatch(/processing the self-help entries/);
    expect(screen.getByLabelText(HEALTH_DATA_LABEL)).toBeTruthy();
  });

  it("states the withdrawal path beside the control", () => {
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    expect(
      screen.getByText(
        "This is a separate consent. You can withdraw it at any time by deleting your account or contacting privacy@selftend.org.",
      ),
    ).toBeTruthy();
  });

  it("cannot be satisfied by accepting the terms alone", async () => {
    // The acceptance criterion, stated as a test: ticking the contractual box
    // must leave the gate closed. If these two ever merge back into one
    // boolean this is the assertion that fails.
    const onAccepted = jest.fn();
    renderWithProviders(<ConsentGate onAccepted={onAccepted} />);

    fireEvent.press(screen.getByLabelText(CHECKBOX_LABEL));

    expect(screen.getByTestId("consent-submit")).toBeDisabled();

    fireEvent.press(screen.getByTestId("consent-submit"));
    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it("cannot be satisfied by the Art. 9 consent alone either", () => {
    renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

    fireEvent.press(screen.getByLabelText(HEALTH_DATA_LABEL));

    expect(screen.getByTestId("consent-submit")).toBeDisabled();
  });

  it("records both acts once both are given", async () => {
    const onAccepted = jest.fn();
    renderWithProviders(<ConsentGate onAccepted={onAccepted} />);

    fireEvent.press(screen.getByLabelText(CHECKBOX_LABEL));
    fireEvent.press(screen.getByLabelText(HEALTH_DATA_LABEL));

    expect(screen.getByTestId("consent-submit")).not.toBeDisabled();

    fireEvent.press(screen.getByTestId("consent-submit"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(policyVersion);
    });
    await waitFor(() => {
      expect(onAccepted).toHaveBeenCalled();
    });
  });

  it("toggles the Art. 9 consent with the Space key on web", () => {
    setPlatform("web");
    try {
      renderWithProviders(<ConsentGate onAccepted={jest.fn()} />);

      const row = screen.getByLabelText(HEALTH_DATA_LABEL);
      const preventDefault = jest.fn();
      fireEvent(row, "keyDown", { key: " ", preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(screen.getByLabelText(HEALTH_DATA_LABEL)).toBeChecked();
    } finally {
      setPlatform("ios");
    }
  });
});
