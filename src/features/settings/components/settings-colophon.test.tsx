import { render, screen, fireEvent } from "@testing-library/react-native";
import { useWindowDimensions } from "react-native";

import { SettingsColophon } from "@/src/features/settings/components/settings-colophon";
import { openExternalUrl } from "@/src/lib/linking";
import { getRunningVersion } from "@/src/lib/update-availability";

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({
    t: (key: string, options?: { version?: string }) =>
      options?.version ? `${key}:${options.version}` : key,
  }),
}));
jest.mock("@/src/lib/linking", () => ({ openExternalUrl: jest.fn() }));
jest.mock("@/src/lib/update-availability", () => ({ getRunningVersion: jest.fn() }));
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockVersion = getRunningVersion as jest.MockedFunction<typeof getRunningVersion>;
const mockDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

/**
 * ⚠️ Jest reports a 750px window by default and the e2e viewport is Desktop
 * Chrome, so BOTH shipped test layers are blind to every `useWindowDimensions`
 * phone branch. That is the only reason this file mocks the hook: the phone
 * frame is where the colophon has to stack, because the Bulgarian line measures
 * 372px against the 354px a 390dp frame leaves.
 */
function renderAt(width: number) {
  mockDimensions.mockReturnValue({
    width,
    height: 800,
    scale: 2,
    fontScale: 1,
  });
  return render(<SettingsColophon />);
}

describe("SettingsColophon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVersion.mockReturnValue("0.13.0");
  });

  it("lays the version beside the link on desktop, with a separator between", () => {
    renderAt(900);

    expect(screen.getByText("account.version:0.13.0")).toBeTruthy();
    // The separator is `accessibilityElementsHidden`, and RNTL skips hidden
    // subtrees by default - so it has to be asked for explicitly.
    expect(screen.getByText("·", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("settings-colophon").props.className).toContain("flex-row");
  });

  it("stacks and centres on phone, dropping the separator with the row", () => {
    renderAt(390);

    expect(screen.getByText("account.version:0.13.0")).toBeTruthy();
    // A separator is a horizontal device. Stacked, it would sit on a line of
    // its own between the two halves.
    expect(screen.queryByText("·", { includeHiddenElements: true })).toBeNull();
    const className = screen.getByTestId("settings-colophon").props.className;
    expect(className).toContain("items-center");
    expect(className).not.toContain("flex-row");
  });

  it("keeps the repo link when the version is unknown", () => {
    mockVersion.mockReturnValue(null);
    renderAt(900);

    // The version line renders WHEN KNOWN; the repo link renders ALWAYS. A single
    // "Selftend v{{version}} · open source" string could not do both - it would
    // read `Selftend v · open source`.
    expect(screen.queryByText(/^account\.version/)).toBeNull();
    expect(screen.queryByText("·", { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId("settings-open-source")).toBeTruthy();
  });

  it("opens the repo through the shared helper, named for where it goes", () => {
    renderAt(900);

    const link = screen.getByTestId("settings-open-source");
    // `openExternalUrl`, not a bare `Linking.openURL`: on web the helper opens a
    // new tab rather than navigating the app's own tab away.
    fireEvent.press(link);
    expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/Selftend/selftend");

    // "open source" names a licence, not a destination, so it cannot be the
    // link's accessible name.
    expect(link.props.accessibilityLabel).toBe("openSourceA11y");
  });
});
