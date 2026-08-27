import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { Modal, Platform } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";

import { UpdatePopup } from "./update-popup";
import { renderWithProviders } from "@/test/render-with-providers";

// Ported from update-banner.test.tsx (#1475 — the popup replaces the banner,
// #1142 spec §3). Presentational since #1474: the hook mounts once in the
// protected shell and the popup is driven entirely by props, so no hook mock
// is needed here.
//
// The `ios` row of the old per-platform label table is gone WITH the iOS
// string: iOS ships no offer and the platform branch falls through to
// nothing, never to Play (#529's lesson, #1150).
//
// ☠️ What jest CANNOT see here: C1's actual property ("Later" HOLDS focus).
// jest-expo runs the native preset, so react-native-web's ModalFocusTrap
// never executes in this suite. The button-ORDER test below pins the
// mechanism (RNW focuses the first role="button" in tree order); only the
// e2e suite can assert the property itself (#1155, #1476).
describe("UpdatePopup", () => {
  const act = jest.fn();
  const dismiss = jest.fn();
  let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // The popup is web + Android only; jest-expo's default platform would
    // exercise the iOS renders-nothing branch, so each test states its
    // platform. Web is the default here purely because it is the branch with
    // the most machinery (the wrapper's unmount gate).
    platformSpy = jest.replaceProperty(Platform, "OS", "web");
  });

  afterEach(() => platformSpy?.restore());

  it("renders nothing when no update is available", () => {
    renderWithProviders(<UpdatePopup available={false} act={act} dismiss={dismiss} />);
    expect(screen.queryByTestId("update-popup")).toBeNull();
  });

  it("renders nothing on ios even when told an update is available", () => {
    platformSpy?.restore();
    platformSpy = jest.replaceProperty(Platform, "OS", "ios");
    renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);
    // No offer surface at all — not a popup with a dead button (#529, #1150).
    expect(screen.queryByTestId("update-popup")).toBeNull();
  });

  it('renders "Later" before the update action, which is what focuses "Later" on web (C1)', () => {
    renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);

    // On web this ordering IS the C1 mechanism — react-native-web's
    // ModalFocusTrap focuses the first focusable descendant on open, and the
    // Card/Header/Title wrappers carry no tabIndex, so the first
    // `role="button"` receives focus. Swap these two buttons and the
    // irreversible action becomes the Enter-key default for someone who was
    // mid-sentence. Nothing else in the file would look wrong.
    const testIDs = screen.getAllByRole("button").map((button) => button.props.testID);
    expect(testIDs).toEqual(["update-popup-later", "update-popup-act"]);
  });

  it("has no third button — no X, no bare glyph (C3)", () => {
    renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it('"Later" and the system close (Escape / Android back) share one dismiss handler (C2)', () => {
    renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);

    fireEvent.press(screen.getByTestId("update-popup-later"));
    expect(dismiss).toHaveBeenCalledTimes(1);

    // react-native-web routes Escape to onRequestClose; native routes the
    // Android back button there. IDENTITY with the dismiss prop, not merely
    // "some handler": every close path must be the one that persists the
    // per-version dismissal (C2), and a separate wrapper here could drift.
    expect(screen.UNSAFE_getByType(Modal).props.onRequestClose).toBe(dismiss);
  });

  it("pressing the action calls act", () => {
    renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);
    fireEvent.press(screen.getByTestId("update-popup-act"));
    expect(act).toHaveBeenCalledTimes(1);
  });

  // #529: the label used to be a web/native pair whose "native" string was
  // "Open Google Play", so an iPhone was told to open Google Play. The iOS
  // row is not a label row any more — it renders nothing, asserted above.
  describe("names the right action per platform", () => {
    it.each([
      ["android", "Open Google Play", "Refresh"],
      ["web", "Refresh", "Open Google Play"],
    ] as const)("on %s shows %s and never %s", (os, expected, forbidden) => {
      platformSpy?.restore();
      platformSpy = jest.replaceProperty(Platform, "OS", os);
      renderWithProviders(<UpdatePopup available act={act} dismiss={dismiss} />);
      expect(screen.getByText(expected)).toBeTruthy();
      expect(screen.queryByText(forbidden)).toBeNull();
    });
  });
});

// #1150: nothing else catches an orphaned key GROUP. `i18n-key-coverage` is
// source→en and `locale-parity` is en↔bg — a rename that forgot to delete the
// old group from BOTH locales would pass every gate and ship dead strings to
// Weblate. A repo-wide unused-key check is unsound (dynamic keys), so this is
// the one scoped assertion instead. ☠️ The `updateBannerDismissed:`
// AsyncStorage PREFIX is not an i18n key and deliberately keeps the old name
// (see the constant in use-update-availability.ts).
describe("the updateBanner locale group is gone", () => {
  const LOCALES_DIR = join(__dirname, "..", "..", "i18n", "locales");

  const containsKey = (value: unknown, key: string): boolean => {
    if (typeof value !== "object" || value === null) return false;
    if (key in value) return true;
    return Object.values(value).some((nested) => containsKey(nested, key));
  };

  it("no locale file contains an updateBanner key", () => {
    const locales = readdirSync(LOCALES_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(locales.length).toBeGreaterThan(0);
    for (const locale of locales) {
      const files = readdirSync(join(LOCALES_DIR, locale)).filter((name) => name.endsWith(".json"));
      expect(files).toContain("common.json");
      for (const file of files) {
        const parsed: unknown = JSON.parse(readFileSync(join(LOCALES_DIR, locale, file), "utf8"));
        expect({ locale, file, orphaned: containsKey(parsed, "updateBanner") }).toEqual({
          locale,
          file,
          orphaned: false,
        });
      }
    }
  });
});
