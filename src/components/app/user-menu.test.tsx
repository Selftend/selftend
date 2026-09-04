import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Dimensions, Platform, StyleSheet } from "react-native";

import { UserMenu } from "./user-menu";
import { signOut } from "@/src/features/auth/api";
import { appEnv } from "@/src/lib/env";
import { cancelAllReminders } from "@/src/lib/notifications";
import { openExternalUrl } from "@/src/lib/linking";
import { useToastStore } from "@/src/stores/toast-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

// ☠️ Load-bearing for exactly ONE test: "shows the compact get-the-app section on
// web", which flips `Platform.OS` to "web". `popover.tsx` picks its wrapper at
// MODULE LOAD (`Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment`),
// and jest-expo loads with `defaultPlatform: "ios"` - so the alias is already
// frozen to the real overlay by the time the test moves the platform, and the
// overlay's own off-iOS branch then warns. Nothing else here needs it: verified
// (#1338) that the real overlay renders silently under react-test-renderer on
// iOS, which is why `app-toast.tsx`'s wrapper is tested against the REAL thing
// and this mock deliberately stayed local rather than moving to `test/setup.js`.
jest.mock("react-native-screens", () => ({
  ...jest.requireActual("react-native-screens"),
  FullWindowOverlay: ({ children }: { children: React.ReactNode }) => children,
}));

let mockPathname = "/";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => mockPathname,
}));

const signedInSession = {
  session: { access_token: "token" },
  user: { id: "user-1", email: "user@example.com" },
};
let mockSession: { session: object | null; user: object | null } = signedInSession;
jest.mock("@/src/providers/session-provider", () => ({
  useSession: () => mockSession,
}));

jest.mock("@/src/features/profile/queries", () => ({
  useUserProfile: () => ({ data: null }),
}));

jest.mock("@/src/features/auth/api", () => ({
  signOut: jest.fn(),
}));

jest.mock("@/src/lib/notifications", () => ({
  cancelAllReminders: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/lib/linking", () => ({
  openExternalUrl: jest.fn(),
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;
const mockOpen = openExternalUrl as jest.MockedFunction<typeof openExternalUrl>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockCancelAllReminders = cancelAllReminders as jest.MockedFunction<typeof cancelAllReminders>;

const originalDiscordUrl = appEnv.discordUrl;
const originalRedditUrl = appEnv.redditUrl;
const originalYoutubeUrl = appEnv.youtubeUrl;

afterEach(() => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
  appEnv.discordUrl = originalDiscordUrl;
  appEnv.redditUrl = originalRedditUrl;
  appEnv.youtubeUrl = originalYoutubeUrl;
  mockPathname = "/";
  mockSession = signedInSession;
  // The real teardown rather than a hand-written `setState`: the slot is two
  // fields now, and an error toast no longer expires on its own.
  useToastStore.getState().clearToasts();
  jest.clearAllMocks();
  // `clearAllMocks` wipes recorded calls but NOT implementations, so a
  // `mockRejectedValue` set by one test would still be rejecting in the next.
  mockCancelAllReminders.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

describe("UserMenu", () => {
  // The header (and this menu) persists across routes: navigating from a
  // sidebar link used to leave the open menu hanging over the new screen (#491).
  it("closes when the route changes", () => {
    const { rerender } = renderWithProviders(<UserMenu />);

    fireEvent.press(screen.getByLabelText("Open account menu"));
    expect(screen.getByText("Send feedback")).toBeTruthy();

    mockPathname = "/routines";
    rerender(<UserMenu />);

    expect(screen.queryByText("Send feedback")).toBeNull();
  });

  it("routes to the support page from Send feedback", () => {
    renderWithProviders(<UserMenu />);

    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Send feedback"));

    // Lateral jump to a panel destination, so it must reuse the screen already in the
    // stack rather than push a second copy (#1027).
    expect(mockPush).toHaveBeenCalledWith("/(app)/support", { dangerouslySingular: true });
  });

  it("shows the compact get-the-app section on web", () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Get the mobile app")).toBeTruthy();
  });

  // #92: on mobile the header carries no community icons, so the dropdown's
  // social row is the Discord entry point - pin its presence and its
  // hide-when-unconfigured behavior.
  it("offers the Discord link in the dropdown", () => {
    appEnv.discordUrl = "https://discord.gg/pdaAr9FhcQ";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Join our Discord"));
    expect(mockOpen).toHaveBeenCalledWith("https://discord.gg/pdaAr9FhcQ");
  });

  it("hides the Discord link when no Discord URL is configured, keeping GitHub", () => {
    appEnv.discordUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Join our Discord")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  // #668: Reddit and YouTube join the social row with the same
  // hide-when-unconfigured contract as Discord; GitHub stays unconditional.
  it("offers the Reddit link in the dropdown", () => {
    appEnv.redditUrl = "https://www.reddit.com/r/Selftend/";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Open the Selftend subreddit"));
    expect(mockOpen).toHaveBeenCalledWith("https://www.reddit.com/r/Selftend/");
  });

  it("offers the YouTube link in the dropdown", () => {
    appEnv.youtubeUrl = "https://www.youtube.com/@Selftend";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    fireEvent.press(screen.getByLabelText("Open the Selftend YouTube channel"));
    expect(mockOpen).toHaveBeenCalledWith("https://www.youtube.com/@Selftend");
  });

  it("hides the Reddit link when no Reddit URL is configured, keeping GitHub", () => {
    appEnv.redditUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Open the Selftend subreddit")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  it("hides the YouTube link when no YouTube URL is configured, keeping GitHub", () => {
    appEnv.youtubeUrl = "";

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByLabelText("Open the Selftend YouTube channel")).toBeNull();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  // The decided row order (#659): community spaces first in order of
  // interactivity, GitHub last as the transparency door.
  it("renders the social row as Discord, Reddit, YouTube, GitHub", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    const row = screen.getByTestId("social-connections");
    const labels = within(row)
      .getAllByLabelText(/./)
      .map((node) => node.props.accessibilityLabel as string);

    expect(labels).toEqual([
      "Join our Discord",
      "Open the Selftend subreddit",
      "Open the Selftend YouTube channel",
      "View the source code on GitHub",
    ]);
  });

  it("renders the full social row on the signed-out menu too", () => {
    mockSession = { session: null, user: null };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByLabelText("Join our Discord")).toBeTruthy();
    expect(screen.getByLabelText("Open the Selftend subreddit")).toBeTruthy();
    expect(screen.getByLabelText("Open the Selftend YouTube channel")).toBeTruthy();
    expect(screen.getByLabelText("View the source code on GitHub")).toBeTruthy();
  });

  it("exposes the language and theme rows as radios in labelled radiogroups", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    // byRole skips plain Views (not accessibility elements), so assert the
    // containers' group semantics through their labels instead.
    expect(screen.getByLabelText("Switch language").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByLabelText("Switch theme").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Bulgarian" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dark" })).not.toBeChecked();
  });

  // The palette grid made this menu tall enough to run off a short or
  // landscape phone, and a popover does not scroll on its own - so the rows
  // below the fold (lower palettes, Settings, feedback, sign out) became
  // unreachable rather than merely awkward. Asserted as the property that
  // matters - bounded strictly below the viewport, and scrollable - rather
  // than against the exact fraction, so tuning the ratio does not fail this.
  it("keeps the menu body scrollable and bounded inside the viewport", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    const body = screen.getByTestId("user-menu-scroll");
    const { maxHeight } = StyleSheet.flatten(body.props.style) as { maxHeight?: number };
    const viewport = Dimensions.get("window").height;

    expect(typeof maxHeight).toBe("number");
    expect(maxHeight).toBeGreaterThan(0);
    expect(maxHeight).toBeLessThan(viewport);
    // Reachable by scrolling, not just clipped by the bound above.
    expect(body.props.scrollEnabled).not.toBe(false);
  });

  it("still renders the actions below the palette row", () => {
    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Sign Out")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  // #1774: eight cards were about 470px of a 288px-wide popover - the largest
  // thing in the menu, and the reason the scroller above it exists. The grid
  // now sits behind one row and opens as a pane that REPLACES the body.
  describe("the palette submenu (#1774)", () => {
    function openMenu() {
      fireEvent.press(screen.getByLabelText("Open account menu"));
    }

    it("shows one row carrying the active palette, and not the grid", () => {
      renderWithProviders(<UserMenu />);
      openMenu();

      // Section and value are both in the accessible name: an explicit label
      // hides a Pressable's children from assistive tech on the web.
      expect(screen.getByLabelText("Palette, Quiet Lilac")).toBeTruthy();
      expect(screen.queryByTestId("style-card-quiet-lilac")).toBeNull();
      expect(screen.queryByTestId("style-card-glacier")).toBeNull();
    });

    it("opens the grid in a pane that replaces the menu body", () => {
      renderWithProviders(<UserMenu />);
      openMenu();
      fireEvent.press(screen.getByTestId("user-menu-palette-row"));

      expect(screen.getByTestId("style-card-glacier")).toBeTruthy();
      // Replaced, not expanded - an accordion would leave the grid competing
      // with every other section, which is the shape being retired.
      expect(screen.queryByText("Send feedback")).toBeNull();
      expect(screen.queryByLabelText("Palette, Quiet Lilac")).toBeNull();
    });

    it("returns to the root view from the back row", () => {
      renderWithProviders(<UserMenu />);
      openMenu();
      fireEvent.press(screen.getByTestId("user-menu-palette-row"));
      fireEvent.press(screen.getByTestId("user-menu-palette-back"));

      expect(screen.getByText("Send feedback")).toBeTruthy();
      expect(screen.getByLabelText("Palette, Quiet Lilac")).toBeTruthy();
      expect(screen.queryByTestId("style-card-glacier")).toBeNull();
    });

    // The route-change close is imperative (`triggerRef.close()`), not a press -
    // it still has to reset the pane, or the next open lands mid-submenu.
    it("reopens on the root view after a route change closed it mid-pane", () => {
      const { rerender } = renderWithProviders(<UserMenu />);
      openMenu();
      fireEvent.press(screen.getByTestId("user-menu-palette-row"));
      expect(screen.getByTestId("style-card-glacier")).toBeTruthy();

      mockPathname = "/routines";
      rerender(<UserMenu />);
      openMenu();

      expect(screen.getByLabelText("Palette, Quiet Lilac")).toBeTruthy();
      expect(screen.queryByTestId("style-card-glacier")).toBeNull();
    });
  });

  // #1442: a guest's session token is the only key to their account, so
  // signing out is silent irreversible data loss - the control must not exist.
  // The other actions stay: Settings is where delete-account ("start fresh")
  // lives, and feedback works for guests.
  it("hides Sign Out for a guest, keeping Settings and Send feedback", () => {
    mockSession = {
      session: { access_token: "token" },
      // ☠️ `email: ""`, not an absent key. THIS FIXTURE IS WHAT HID THE BLANK
      // IDENTITY LINE: supabase gives an anonymous user an EMPTY STRING, and the
      // type is `email?: string`, so a fixture that omits the key makes `??`
      // reach its fallback and look correct. Under the live shape it does not.
      // Leaving it absent would let the header regress to `??` and stay green.
      user: { id: "guest-1", email: "", is_anonymous: true },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.queryByText("Sign Out")).toBeNull();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Send feedback")).toBeTruthy();
  });

  /**
   * #1829/#1810. This line rendered BLANK for every guest: `email ?? t(…)` with
   * an empty-string email passes the empty string straight through, so the
   * fallback never fired — which also means `navigation:userMenu.account` never
   * rendered for anyone, since every registered identity has an email. The key
   * is deleted and the state is named instead.
   */
  it("names the guest state instead of rendering a blank identity line", () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "guest-1", email: "", is_anonymous: true },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Guest")).toBeTruthy();
    // The word it replaces, so a later "restore consistency" cannot bring back
    // a string nobody chose.
    expect(screen.queryByText("Account")).toBeNull();
  });

  // A guest has no photo and no letter to take, so the trigger and the header
  // both draw the glyph rather than `getInitial`'s old `?`.
  it("draws the person glyph for a guest, never a `?`", () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "guest-1", email: "", is_anonymous: true },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getAllByTestId("profile-avatar-person").length).toBeGreaterThan(0);
    expect(screen.queryByText("?")).toBeNull();
  });

  /**
   * ☠️ Through `setLanguage`, never `i18n.changeLanguage("bg")` — only `en` is
   * registered at init, so changing the language alone falls through to English
   * and a `Гост` assertion would be vacuously green against English copy.
   */
  it("names the guest state in Bulgarian too", async () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "guest-1", email: "", is_anonymous: true },
    };
    await setLanguage("bg");

    const view = renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Отвори меню на акаунта"));

    expect(screen.getByText("Гост")).toBeTruthy();

    // Unmounted BEFORE the language goes back, or i18n's change notifies a
    // still-mounted tree and the un-acted update fails the suite.
    view.unmount();
    await setLanguage("en");
  });

  /**
   * ☠️ The row #1810 pins as UNCHANGED, and the one a fallback written into the
   * SUB-line silently breaks. A guest who opens `Edit name` and saves "Alex"
   * must read as Alex and nothing else — putting `Guest` below the name would be
   * a second guest-status signal on one surface, which #1784 and #1805 refused.
   * Caught by review after exactly that version shipped here.
   */
  it("shows only the name for a guest who has saved one, never Guest beside it", () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "guest-1", email: "", is_anonymous: true, user_metadata: { full_name: "Alex" } },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.queryByText("Guest")).toBeNull();
  });

  /**
   * Apple sends no name at all, so the email stands in — ONCE, in the name slot,
   * with nothing repeated beneath it. `showEmail = Boolean(name && email)` is
   * what makes that true; gating on the email alone renders it twice, and
   * without this test that mutation survives (it did).
   */
  it("puts the email in the name slot when there is no name, and never twice", () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "user-2", email: "apple@example.com" },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getAllByText("apple@example.com")).toHaveLength(1);
    expect(screen.queryByText("Guest")).toBeNull();
  });

  /** Registered users are pinned unchanged: the shared helper is a superset. */
  it("still shows a registered user's name and email, unchanged", () => {
    mockSession = {
      session: { access_token: "token" },
      user: { id: "user-1", email: "person@example.com", user_metadata: { full_name: "Alex" } },
    };

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("person@example.com")).toBeTruthy();
    expect(screen.queryByText("Guest")).toBeNull();
  });

  /**
   * #1869/#1807. Before this row a guest had NO route back into their own
   * account from anywhere inside the app: sign-out is hidden for them (#1442),
   * `app/index.tsx` bounces any session past the landing screen's Sign in, and
   * on native there is no URL bar to type `/sign-in` into. The only in-app path
   * from a guest session to the sign-in form was deleting the account.
   */
  describe("the guest's Sign in door (#1869)", () => {
    const guestSession = {
      session: { access_token: "token" },
      user: { id: "guest-1", email: "", is_anonymous: true },
    };

    it("opens the sign-in screen for a guest, closing the menu behind it", () => {
      mockSession = guestSession;

      renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Open account menu"));
      fireEvent.press(screen.getByTestId("user-menu-sign-in-row"));

      // ☠️ No `{ dangerouslySingular: true }` — unlike the two `(app)` lateral
      // jumps this menu makes, `sign-in` declares its own singularity in
      // `app/(auth)/_layout.tsx`, so passing it here would be a second answer.
      expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-in");
      expect(screen.queryByText("Settings")).toBeNull();
    });

    /**
     * The gate is `isSignedIn && !email`, never `is_anonymous` — the JWT keeps
     * claiming that flag after conversion, so a converted user would keep a door
     * built on it. This fixture is a registered user and must not see the row.
     */
    it("does not offer it to a registered user", () => {
      renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Open account menu"));

      expect(screen.queryByTestId("user-menu-sign-in-row")).toBeNull();
      expect(screen.getByText("Sign Out")).toBeTruthy();
    });

    /** The registered menu is untouched: no shared markup moved. */
    it("leaves the registered action row at three buttons", () => {
      renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Open account menu"));

      expect(screen.getByText("Settings")).toBeTruthy();
      expect(screen.getByText("Send feedback")).toBeTruthy();
      expect(screen.getByText("Sign Out")).toBeTruthy();
    });

    /**
     * ☠️ #1863: the row carries NO `accessibilityLabel`. With a single `Text`
     * child the label IS the accessible name, and an explicit one would hide
     * that child from assistive tech on the web. The Palette row composes a name
     * only because it has a value to fold in — this row has no value slot, by
     * decision, so it must not copy that prop along with the rest.
     */
    it("takes its accessible name from the label, with no explicit one", () => {
      mockSession = guestSession;

      renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Open account menu"));

      const row = screen.getByTestId("user-menu-sign-in-row");
      expect(row.props.accessibilityLabel).toBeUndefined();
      expect(row.props["aria-label"]).toBeUndefined();
      expect(screen.getByText("Sign in")).toBeTruthy();
      // ☠️ `role="button"`, never `role="link"`: react-native-web skips `onPress`
      // on Enter for an href-less link role, the keyboard-dead failure the #1730
      // chain closed. jest(ios) cannot fail on that, so it is pinned as a prop.
      expect(row.props.role).toBe("button");
    });

    /**
     * ☠️ Position IS the ruling (#1811), not a detail: the candidate that lost
     * put the door in the action row, which the prototype measured 156px BELOW
     * the fold in Bulgarian on a 667pt screen — this menu already overflows its
     * own 70% cap for everyone, in English, today (#1862), so the actions are
     * its LEAST reachable region. A door nobody scrolls to is not a door.
     *
     * Asserted as real document order rather than "before the palette row",
     * which a door dropped BELOW the language group would also satisfy.
     */
    it("sits directly beneath the identity row, above the language group", () => {
      mockSession = guestSession;

      renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Open account menu"));

      // The rendered tree flattened in document order, which is the only thing
      // that distinguishes "beneath the identity row" from "somewhere in the
      // menu". Landmarks are read off props so nesting can change freely.
      const order: string[] = [];
      const walk = (node: unknown): void => {
        if (Array.isArray(node)) return void node.forEach(walk);
        if (!node || typeof node !== "object") return;
        const { props = {}, children } = node as {
          props?: Record<string, unknown>;
          children?: unknown;
        };
        if (props.testID === "user-menu-sign-in-row") order.push("door");
        if (
          props.accessibilityRole === "radiogroup" &&
          props.accessibilityLabel === "Switch language"
        ) {
          order.push("language");
        }
        if (props.testID === "user-menu-palette-row") order.push("palette");
        if (children) walk(children);
      };
      walk(screen.toJSON());

      // The identity row carries no testID, so its text anchors the top edge:
      // the door is below the word naming the state it is offered for.
      expect(screen.getByText("Guest")).toBeTruthy();
      expect(order).toEqual(["door", "language", "palette"]);
    });

    /**
     * ☠️ `Вход`, not `Влез`. Both ship today, and the menu's rows split by part
     * of speech: `Настройки` is a noun naming a place, `Изпрати обратна връзка` a
     * verb naming an act. #1811 put this row in the navigation grammar so it
     * reads as a place, and `navigation:breadcrumb.signIn` already calls this
     * very destination `Вход`.
     *
     * ☠️ Through `setLanguage`, never `i18n.changeLanguage("bg")` — only `en` is
     * registered at init, so a Cyrillic assertion would be vacuously green.
     */
    it("reads Вход in Bulgarian", async () => {
      mockSession = guestSession;
      await setLanguage("bg");

      const view = renderWithProviders(<UserMenu />);
      fireEvent.press(screen.getByLabelText("Отвори меню на акаунта"));

      expect(screen.getByText("Вход")).toBeTruthy();
      // The CTA wording this row is NOT, so a later "consistency" pass cannot
      // quietly swap the place for the act.
      expect(screen.queryByText("Влез")).toBeNull();

      view.unmount();
      await setLanguage("en");
    });
  });

  // #968: supabase-js's `signOut()` defaults to `scope: 'global'`, which revokes
  // every refresh token the user holds - pressing Sign Out on the laptop ended
  // the session on the phone. Nothing in the product ever asked for that. The
  // scope is now an explicit argument, and this pins the one this menu passes.
  it("signs out of this device only, leaving other devices signed in", async () => {
    mockCancelAllReminders.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith("local"));
    // And still after the reminder deregistration, which needs a live RLS context.
    expect(mockCancelAllReminders.mock.invocationCallOrder[0]).toBeLessThan(
      mockSignOut.mock.invocationCallOrder[0],
    );
  });

  // #1053: the menu closes first and unconditionally, so a rejected sign-out used
  // to leave the user still signed in with nothing on screen to say so - the
  // failure existed only as an unhandled rejection in the console. The toast is
  // the only surface that survives a dismissed menu.
  //
  // These two asserted the thrown message ("boom") until #1055 made the toast say
  // it in the user's language instead. What the menu owns is that a failure
  // reaches the user at all - the wording is `useSignOut`'s, and pinned there.
  it("reports a failed sign-out through the toast", async () => {
    mockCancelAllReminders.mockResolvedValue(undefined);
    mockSignOut.mockRejectedValue(new Error("boom"));

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(useToastStore.getState().visible).toMatchObject({ tone: "error" }));
  });

  // `cancelAllReminders` is awaited first, so a failure there means `signOut`
  // never runs at all - "sign-out did nothing" does not require the sign-out
  // call itself to be the thing that broke.
  it("reports a failure that stopped sign-out from being attempted", async () => {
    mockCancelAllReminders.mockRejectedValue(new Error("reminders offline"));

    renderWithProviders(<UserMenu />);
    fireEvent.press(screen.getByLabelText("Open account menu"));
    fireEvent.press(screen.getByText("Sign Out"));

    await waitFor(() => expect(useToastStore.getState().visible).toMatchObject({ tone: "error" }));
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

/**
 * The header used to read `profile?.avatarUrl ?? null` while settings fell back to the
 * OAuth photo, so a Google user with no upload saw a photo on one surface and an initial
 * on the other — and `Remove photo` changed the header while appearing to do nothing in
 * settings (#970). Both now go through `resolveAvatarUrl`.
 */
describe("UserMenu avatar (#970)", () => {
  it("shows the OAuth photo when the profile stores none", () => {
    mockSession = {
      session: { access_token: "token" },
      user: {
        id: "user-1",
        email: "user@example.com",
        user_metadata: { avatar_url: "https://lh3.googleusercontent.com/photo" },
      },
    };

    renderWithProviders(<UserMenu />);

    // The avatar is an <Image source={{ uri }}> inside the trigger; assert the URI reached
    // the tree rather than reaching for the element, which is nested in menu chrome.
    expect(JSON.stringify(screen.toJSON())).toContain("https://lh3.googleusercontent.com/photo");
  });
});
