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
import { useThemeStore } from "@/src/stores/theme-store";
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

const registeredSessionUser = {
  email: "person@example.com",
  id: "user-1",
};
let mockSessionUser: {
  id: string;
  email?: string;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
} | null = registeredSessionUser;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => ({ user: mockSessionUser }),
}));

afterEach(() => {
  mockSessionUser = registeredSessionUser;
});

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
   * The identity row (#1829, word from #1810).
   *
   * ☠️ Every test in this file mocks `useUserProfile` as `{ data: null }`, so a
   * guest assertion MUST also pin `user` — otherwise a registered Apple user,
   * who has an email and no name, satisfies it for the wrong reason. Each case
   * below sets `mockSessionUser` explicitly for exactly that reason.
   */
  describe("the identity row", () => {
    async function renderSettings() {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());
    }

    /**
     * ☠️ The circle is `aria-hidden`, and RNTL excludes hidden subtrees from
     * EVERY query by default — `*ByTestId` included, not just the a11y ones. So
     * the row being correctly hidden from assistive tech is exactly what puts
     * its contents out of reach here, and the query has to opt back in. Without
     * this the glyph assertion fails while the component is right.
     */
    const insideCircle = (testID: string) =>
      screen.queryByTestId(testID, { includeHiddenElements: true });

    /**
     * The bug. A guest saw a 96px band holding an empty circle beside an empty
     * line, because `profile?.displayName ?? user?.email ?? ""` found neither —
     * `user.email` being `""` rather than `undefined` is what walked past the
     * `??`. The band does not collapse, so it read as breakage.
     */
    it("names the guest state and draws the glyph, instead of an empty band", async () => {
      mockSessionUser = { id: "guest-1", email: "", is_anonymous: true };
      await renderSettings();

      expect(screen.getByText("Guest")).toBeTruthy();
      expect(insideCircle("profile-avatar-person")).toBeTruthy();
      // No sub-line: `showEmail` is `Boolean(name && email)`, false by
      // construction here. #1784 and #1805 both rejected a guest subtitle.
      expect(screen.queryByText("person@example.com")).toBeNull();
      // The sentinel that used to leak into the circle. (The deleted
      // `userMenu.account` key is asserted in `user-menu.test.tsx` instead: on
      // this page "Account" is also the hero eyebrow AND a run label, so its
      // absence here would say nothing about the key.)
      expect(screen.queryByText("?")).toBeNull();
    });

    /**
     * ☠️ Not a guest-only fix. `resolveDisplayName` reads `full_name` THEN
     * `name`, while the hand-rolled expression read the profile only — so a
     * provider supplying just `name` put the EMAIL in the name slot here while
     * the header showed the name. This is the row that proves the widened half.
     */
    it("shows a metadata `name` in the name slot, not the email", async () => {
      mockSessionUser = {
        id: "user-2",
        email: "nick@example.com",
        user_metadata: { name: "Nick" },
      };
      await renderSettings();

      expect(screen.getByText("Nick")).toBeTruthy();
      expect(screen.getByText("nick@example.com")).toBeTruthy();
    });

    it("shows both lines for a user with a name and an email", async () => {
      mockSessionUser = {
        id: "user-3",
        email: "alex@example.com",
        user_metadata: { full_name: "Alex Petrov" },
      };
      await renderSettings();

      expect(screen.getByText("Alex Petrov")).toBeTruthy();
      expect(screen.getByText("alex@example.com")).toBeTruthy();
      expect(insideCircle("profile-avatar-person")).toBeNull();
    });

    /** Apple sends no name at all: the email stands in, with no sub-line under it. */
    it("puts the email in the name slot when there is no name, with no sub-line", async () => {
      mockSessionUser = { id: "user-4", email: "person@example.com" };
      await renderSettings();

      expect(screen.getAllByText("person@example.com")).toHaveLength(1);
      expect(screen.queryByText("Guest")).toBeNull();
      expect(insideCircle("profile-avatar-person")).toBeNull();
    });

    /**
     * ☠️ #1810 §5 pins this row UNCHANGED: a guest who saves a name reads as
     * that name and nothing else. `showEmail = Boolean(name && email)` is what
     * keeps `Guest` from appearing beside it — making the word persist would
     * need the banned `is_anonymous` branch.
     */
    it("shows only the name for a guest who has saved one, never Guest beside it", async () => {
      mockSessionUser = {
        id: "guest-1",
        email: "",
        is_anonymous: true,
        user_metadata: { full_name: "Alex" },
      };
      await renderSettings();

      expect(screen.getByText("Alex")).toBeTruthy();
      expect(screen.queryByText("Guest")).toBeNull();
      // A real letter, taken from the name they gave — not the glyph.
      expect(insideCircle("profile-avatar-person")).toBeNull();
      expect(screen.getByText("A", { includeHiddenElements: true })).toBeTruthy();
    });

    /**
     * ☠️ No `is_anonymous` branch anywhere. The JWT keeps claiming it after a
     * guest converts, which is why `support.tsx` hand-codes `&& !user.email`.
     * A converted user carries a stale `is_anonymous: true` AND an email, and
     * an absence-driven expression must show the email regardless.
     */
    it("shows the email of a converted guest still carrying a stale is_anonymous", async () => {
      mockSessionUser = { id: "guest-1", email: "converted@example.com", is_anonymous: true };
      await renderSettings();

      expect(screen.getByText("converted@example.com")).toBeTruthy();
      expect(screen.queryByText("Guest")).toBeNull();
    });
  });

  /**
   * The appearance group, whose second control arrived with #1827. Settings had
   * only ever had the STYLE axis - #594 shipped half of #583 while claiming
   * compliance - so the assertion that matters is that the scheme control is
   * here at all, and that adding it left the page with two radiogroups a screen
   * reader can tell apart.
   */
  describe("the appearance group", () => {
    it("offers the scheme axis beside the palette, under distinct group names", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      const schemeGroup = screen.getByLabelText("Switch theme");
      expect(schemeGroup.props.accessibilityRole).toBe("radiogroup");
      expect(screen.getByLabelText("Palette").props.accessibilityRole).toBe("radiogroup");
      for (const name of ["System", "Light", "Dark"]) {
        expect(screen.getByRole("radio", { name })).toBeTruthy();
      }
    });

    // Both captions are suppressed here: the group is named once, above them.
    // `StylePicker heading={false}` is the shipped half of that and stays.
    it("drops both grids' own captions, keeping the groups named", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      expect(screen.queryByText("Switch theme")).toBeNull();
      expect(screen.queryByText("Palette")).toBeNull();
    });

    /**
     * #1828. Both premises of the shipped "two labels for one grid" ruling died:
     * #1827 gave the group a second control, and #1800 removed the card that was
     * delimiting it - leaving the only region on the page with no name.
     */
    it("carries an Appearance eyebrow, the group's own name", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      expect(screen.getByRole("header", { name: "Appearance" })).toBeTruthy();
    });

    /**
     * The eyebrow is what cures the "wrong by omission" worry, so the sentence
     * it relieves must not also be rewritten - it stops standing in as the group
     * label and is read as the palette's own line, unchanged.
     */
    it("leaves the palette line's copy alone, and drops its optical inset", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      const line = screen.getByText("Choose a palette. This device only.");
      // The inset was optical, against a card edge #1800 removed - the same
      // reasoning that took it off the runs.
      expect(String(line.props.className ?? "").split(/\s+/)).not.toContain("px-1");
    });

    /**
     * ☠️ Do not hoist "This device only" to a group-level caption, however the
     * drawing shows it: `theme` syncs to `user_preferences.theme` while only
     * `style` is device-local, so the claim is false about the control above.
     * The drawn palette note is out too - it describes the palette while sitting
     * beside the scheme pill, and does not fit a phone column.
     */
    it("hoists no caption to the group and adds no palette note", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      expect(screen.getAllByText(/This device only/)).toHaveLength(1);
      expect(screen.queryByText(/Palettes change colour/)).toBeNull();
    });
  });

  /**
   * D7 applies to the five GROUP labels and must not reach the page eyebrow,
   * which is the same `variant="eyebrow"` doing the other of two jobs the design
   * separates. Asserted from both sides so a sweep cannot silently take the hero
   * with it.
   */
  describe("the eyebrow scale", () => {
    /** Both the hero eyebrow and the Account run label render the word "Account". */
    function eyebrowClasses(text: string, isHeader: boolean): string[] {
      const node = screen
        .getAllByText(text)
        .find((el) => (el.props.accessibilityRole === "header") === isHeader);

      return String(node?.props.className ?? "")
        .split(/\s+/)
        .filter(Boolean);
    }

    it("sets the five group labels at 600 / 0.1em", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      for (const label of ["Appearance", "App", "Your data", "Help", "Account"]) {
        const classes = eyebrowClasses(label, true);
        expect(classes).toContain("font-semibold");
        expect(classes).toContain("tracking-[0.1em]");
      }
    });

    /**
     * The outline the group's name joins: the hero's `h1`, then five `h2`s.
     *
     * ⚠️ Two role names, one outline. `Text variant="h1"` sets ARIA's
     * `role="heading"`, the group labels set RN's `accessibilityRole="header"`,
     * and this jest matcher does not alias one to the other - on the web DOM
     * both become heading elements.
     *
     * ☠️ And the level is asserted because a level-less heading is NOT an `h2`:
     * `react-native-web` swaps in a literal `<h1>` when `aria-level` is absent,
     * so without it this page would ship six `h1`s.
     */
    it("registers one h1 and five h2s, in that order", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      // Read in tree order and across BOTH role names, so "followed by" is what
      // is actually asserted - two separate role queries could each be in order
      // and still describe an outline that opens on an h2.
      const outline = screen.UNSAFE_root.findAll(
        (node) =>
          typeof node.type === "string" &&
          (node.props.role === "heading" || node.props.accessibilityRole === "header"),
      ).map((node) => [String(node.props["aria-level"]), node.props.children]);

      expect(outline).toEqual([
        ["1", "Settings"],
        ["2", "Appearance"],
        ["2", "App"],
        ["2", "Your data"],
        ["2", "Help"],
        ["2", "Account"],
      ]);
    });

    it("leaves the page eyebrow at the scale it already had", async () => {
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      const classes = eyebrowClasses("Account", false);
      expect(classes).toContain("font-bold");
      expect(classes).toContain("tracking-[0.14em]");
    });

    it("stores a scheme chosen here exactly as the header menu would", async () => {
      useThemeStore.setState({ preference: "system", hydrated: true });
      renderWithProviders(<SettingsScreen />);
      await waitFor(() => expect(screen.getByText("Settings")).toBeTruthy());

      fireEvent.press(screen.getByRole("radio", { name: "Dark" }));

      expect(useThemeStore.getState().preference).toBe("dark");
    });
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

  // #1442: a guest's session token is the only key to their account, so the
  // sign-out row must not exist for them (silent irreversible data loss). The
  // rest of the account run stays word-for-word: for a guest, "start fresh"
  // IS delete-account, and export works unchanged.
  it("hides the sign-out row for a guest, keeping delete-account and export", async () => {
    // `email: ""` is the live guest shape, not an absent key (#1829).
    mockSessionUser = { id: "guest-1", email: "", is_anonymous: true };
    renderWithProviders(<SettingsScreen />);

    await waitFor(() => expect(screen.getByLabelText("Delete my account")).toBeTruthy());
    expect(screen.queryByLabelText("Sign out")).toBeNull();
    expect(screen.getByLabelText("Export my data")).toBeTruthy();
    expect(screen.getByTestId("settings-run-account")).toBeTruthy();
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
