import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text as mockText, View as mockView } from "react-native";
import type { ReactNode } from "react";
import { router } from "expo-router";

import SettingsScreen from "./settings-screen";
import { defaultUserPreferences } from "@/src/features/modules/types";
import {
  REPLAY_INTRODUCTION_PREFERENCES,
  SHOW_TIPS_AGAIN_PREFERENCES,
} from "@/src/features/settings/onboarding-reset";
import {
  useUpdateOnboardingPreferences,
  useUserPreferences,
} from "@/src/features/settings/queries";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: {
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
  usePathname: () => "/settings",
}));

jest.mock("expo-linking", () => ({
  openURL: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  UIImagePickerPreferredAssetRepresentationMode: {
    Compatible: "compatible",
  },
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: {
    JPEG: "jpeg",
  },
}));

jest.mock("@/src/components/react-native-reusables/label", () => {
  const Text = mockText;

  return {
    Label: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({
    user: {
      email: "person@example.com",
      id: "user-1",
    },
  }),
}));

jest.mock("expo-linear-gradient", () => {
  const View = mockView;
  return {
    LinearGradient: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});

jest.mock("@/src/features/auth/api", () => ({
  signOut: jest.fn(),
}));

// `AppLockRow` calls isBiometricAvailable() inside a useEffect .then() which fires
// setAvailable() outside act() unless we resolve it synchronously. Mocking it as a
// resolved Promise prevents the async state update from leaking out.
jest.mock("@/src/features/security/biometric", () => ({
  authenticate: jest.fn().mockResolvedValue(false),
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/src/features/profile/queries", () => ({
  useRemoveUserAvatar: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useResetUserAvatarToOAuth: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUpdateUserDisplayName: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUploadUserAvatar: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useUserProfile: () => ({ data: null, error: null }),
}));

jest.mock("@/src/features/profile/repository", () => ({
  getOAuthAvatarUrl: jest.fn(() => null),
}));

jest.mock("@/src/features/settings/queries", () => ({
  useDeleteUserAccount: () => ({ isPending: false, mutateAsync: jest.fn() }),
  useExportUserData: () => ({ isError: false, isPending: false, mutateAsync: jest.fn() }),
  useUpdateOnboardingPreferences: jest.fn(),
  useUserPreferences: jest.fn(),
}));

const mockUseUserPreferences = useUserPreferences as jest.MockedFunction<typeof useUserPreferences>;
const mockUseUpdateOnboardingPreferences = useUpdateOnboardingPreferences as jest.MockedFunction<
  typeof useUpdateOnboardingPreferences
>;

const loadedPreferences = {
  ...defaultUserPreferences,
  appOnboardingCompleted: true,
  cbtWizardCompleted: true,
  policyVersionAccepted: "2026-05-01",
  shownButtonTours: ["tune", "notifications", "info"],
};

function mockPreferences(data: unknown, isLoading = false) {
  mockUseUserPreferences.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useUserPreferences
  >);
}

describe("SettingsScreen structure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferences(loadedPreferences);
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  });

  it("renders hero, four labelled runs and the colophon", async () => {
    renderWithProviders(<SettingsScreen />);
    // waitFor flushes the app-lock useEffect microtasks (isBiometricAvailable and
    // hydrate) so their async setState calls land inside act() boundaries.
    await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

    expect(screen.getByTestId("settings-run-app")).toBeTruthy();
    expect(screen.getByTestId("settings-run-data")).toBeTruthy();
    expect(screen.getByTestId("settings-run-help")).toBeTruthy();
    expect(screen.getByTestId("settings-run-account")).toBeTruthy();
    expect(screen.getByTestId("settings-colophon")).toBeTruthy();
    // #1446: the guest invitation card renders nothing for this registered
    // user (its guest-side visibility is pinned in create-account-card.test).
    expect(screen.queryByTestId("create-account-card")).toBeNull();
  });

  /**
   * The eleven rows are known before any query resolves, so a page-level
   * `LoadingState` would hide a list nothing is waiting for. This is the
   * assertion that the eleventh-hour reflex to add one back stays out.
   */
  it("renders every row while preferences are still loading", async () => {
    mockPreferences(undefined, true);
    renderWithProviders(<SettingsScreen />);

    await waitFor(() => expect(screen.getByLabelText("Sign out")).toBeTruthy());
    expect(screen.getByLabelText("Reminders")).toBeTruthy();
    expect(screen.getByLabelText("Export my data")).toBeTruthy();
    expect(screen.getByLabelText("Delete my account")).toBeTruthy();
    // The deleted `loading` key had one consumer: a page-level LoadingState.
    expect(screen.queryByText(/loading/i)).toBeNull();
  });

  /**
   * #968. This sentence was deleted by #958 because it was false - `signOut()`
   * was taking supabase-js's `scope: 'global'` default, so signing out here also
   * ended the session on the user's phone. The scope is now `local`, which is
   * what makes the copy true again, so the two have to stay tied: if the scope
   * ever goes back to `global`, this row is lying and this test says so.
   *
   * The row's accessible NAME stays "Sign out" (SettingsRow passes the label
   * alone to `accessibilityLabel` and the description to `accessibilityHint`),
   * which is why the sign-out e2e spec still addresses it by that exact name.
   */
  it("tells the user that signing out leaves their other devices signed in", async () => {
    mockPreferences(undefined, true);
    renderWithProviders(<SettingsScreen />);

    await waitFor(() =>
      expect(screen.getByText("You'll stay signed in on other devices.")).toBeTruthy(),
    );
    expect(screen.getByLabelText("Sign out")).toBeTruthy();
  });

  it("waits only the two onboarding rows on the preferences query", async () => {
    mockPreferences(undefined, true);
    renderWithProviders(<SettingsScreen />);

    await waitFor(() => expect(screen.getByLabelText("Replay introduction")).toBeTruthy());
    // `appOnboardingCompletedVia` is the single reason the query survives, and
    // replaying without it would rewrite the user's original completion path.
    expect(screen.getByLabelText("Replay introduction").props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.getByLabelText("Show tips again").props.accessibilityState.disabled).toBe(true);
    // Nothing else waits.
    expect(screen.getByLabelText("Export my data").props.accessibilityState.disabled).toBe(false);
  });

  /**
   * W12 (#1255): the bespoke hero is the page's own title, not chrome, so the
   * Escape slot never reached this screen. `ScreenTopBar` now carries it, and
   * the hero below is untouched - "Settings" appearing exactly once is what
   * pins that the trail stays hidden on this one-crumb route rather than
   * repeating the title as a crumb.
   */
  it("carries exactly one Escape through chrome, and it leads Home", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

    expect(screen.getByTestId("screen-top-bar")).toBeTruthy();
    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    expect(screen.getAllByText("Settings")).toHaveLength(1);

    fireEvent.press(screen.getByLabelText("Back to Home"));
    // `replace`, not `push`: an Escape is a leave, not a drill-down.
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("navigates rather than acting in place on the chevron rows", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Reminders")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Reminders"));
    expect(router.push).toHaveBeenCalledWith("/notifications");

    fireEvent.press(screen.getByLabelText("Privacy"));
    expect(router.push).toHaveBeenCalledWith("/privacy");

    fireEvent.press(screen.getByLabelText("Legal and boundaries"));
    expect(router.push).toHaveBeenCalledWith("/legal");
  });

  /**
   * The stray both sibling batches left unclaimed (#1261, #1266): this screen
   * sits outside every directory the batch tickets named, and Settings IS
   * off-trail from Reminders, whose own Up is Home - the exact reported symptom
   * (#1160) the Origin rule was written for, one door over from the bell.
   *
   * ⚠️ On the STORE, not on `router.push`: `usePushWithOrigin` pushes through
   * `router.push`, so the assertion above passes identically whether or not
   * this row was ever migrated (#1267).
   */
  it("records Settings as the Origin when opening Reminders", async () => {
    useNavigationOriginStore.setState({ pending: null });
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByLabelText("Reminders")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("Reminders"));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/settings",
      forPathname: "/notifications",
    });
  });
});

describe("SettingsScreen profile disclosures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferences(loadedPreferences);
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isPending: false,
      mutateAsync: jest.fn(),
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  });

  it("hides the display-name field until Edit name is pressed", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId("settings-edit-name")).toBeTruthy());

    // Collapsed content is UNMOUNTED, not merely hidden - a hidden-but-mounted
    // input stays in the tab order and in the accessibility tree.
    expect(screen.queryByLabelText("Display name")).toBeNull();

    fireEvent.press(screen.getByTestId("settings-edit-name"));

    expect(screen.getByLabelText("Display name")).toBeTruthy();
    // React Native folds `aria-expanded` into `accessibilityState`.
    expect(screen.getByTestId("settings-edit-name").props.accessibilityState.expanded).toBe(true);
  });

  it("keeps one disclosure open at a time", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId("settings-edit-name")).toBeTruthy());

    fireEvent.press(screen.getByTestId("settings-edit-name"));
    expect(screen.getByLabelText("Display name")).toBeTruthy();

    fireEvent.press(screen.getByTestId("settings-change-photo"));

    expect(screen.queryByLabelText("Display name")).toBeNull();
    // All three photo controls, and they are three: `Use Google photo` and
    // `Remove photo` behave differently on the next screen (#970), so a design
    // pass cannot merge them.
    expect(screen.getByText("Choose a photo")).toBeTruthy();
    expect(screen.getByText("Remove photo")).toBeTruthy();
    expect(screen.getByTestId("settings-change-photo").props.accessibilityState.expanded).toBe(
      true,
    );
    expect(screen.getByTestId("settings-edit-name").props.accessibilityState.expanded).toBe(false);
  });
});

describe("SettingsScreen onboarding actions", () => {
  const mutateAsync = jest.fn().mockResolvedValue(defaultUserPreferences);

  beforeEach(() => {
    jest.clearAllMocks();
    mutateAsync.mockResolvedValue(defaultUserPreferences);
    mockPreferences(loadedPreferences);
    mockUseUpdateOnboardingPreferences.mockReturnValue({
      isPending: false,
      mutateAsync,
    } as unknown as ReturnType<typeof useUpdateOnboardingPreferences>);
  });

  it("replays the app introduction without resetting contextual tips", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByText("Replay introduction")).toBeTruthy());

    fireEvent.press(screen.getByText("Replay introduction"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        ...REPLAY_INTRODUCTION_PREFERENCES,
        appOnboardingCompletedVia: "finish",
      });
    });
  });

  it("re-arms contextual tips without replaying the app introduction", async () => {
    renderWithProviders(<SettingsScreen />);
    await waitFor(() => expect(screen.getByText("Show tips again")).toBeTruthy());

    fireEvent.press(screen.getByText("Show tips again"));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(SHOW_TIPS_AGAIN_PREFERENCES);
    });
  });
});
