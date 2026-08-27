import { fireEvent, render } from "@testing-library/react-native";
import { Pressable } from "react-native";
import { router, usePathname, type Href } from "expo-router";

import { isOffTrail, nameOrigin, targetPathname, usePushWithOrigin } from "@/src/lib/escape-origin";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import i18n from "@/src/i18n";
import { setLanguage } from "@/test/i18n-language";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
});

/**
 * The one navigation helper an Origin is recorded through (#1261, O3).
 *
 * Recording is opt-out: everything that pushes through this records, and only
 * the global nav chrome keeps calling `router.push` directly. Opt-in was
 * rejected because it fails *invisibly* - a cross-link that forgets just quietly
 * shows Up, with nothing on screen to notice - and because the cross-link set is
 * actively growing.
 */
describe("usePushWithOrigin", () => {
  function Caller({ href }: { href: Href }) {
    const push = usePushWithOrigin();
    return <Pressable testID="go" onPress={() => push(href)} />;
  }

  function OptionCaller({
    href,
    options,
  }: {
    href: Href;
    options: Parameters<typeof router.push>[1];
  }) {
    const push = usePushWithOrigin();
    return <Pressable testID="go" onPress={() => push(href, options)} />;
  }

  function pressFrom(pathname: string, href: Href) {
    mockUsePathname.mockReturnValue(pathname);
    const { getByTestId } = render(<Caller href={href} />);
    fireEvent.press(getByTestId("go"));
  }

  it("records where the user was, and still performs the push", () => {
    pressFrom("/modules/cbt", { pathname: "/notifications", params: { target: "cbt" } });

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/cbt",
      forPathname: "/notifications",
    });
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/notifications",
      params: { target: "cbt" },
    });
  });

  it("records a plain string href too", () => {
    pressFrom("/modules/cbt", "/crisis");

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/cbt",
      forPathname: "/crisis",
    });
  });

  /**
   * The helper has to be able to express everything the call sites it replaces
   * could express, or migrating one silently changes how the app navigates.
   *
   * `dangerouslySingular` is the case that forced this (#1266). ACT's "Also try"
   * row is a lateral jump - "the tool you jump to may be the one you came from
   * two hops ago" (#1027) - and it passed the flag when it migrated, so a helper
   * that forwarded only an `Href` would have dropped it, and the AC that that
   * batch changes no navigation behaviour other than recording would have
   * shipped false. (#1216 later ruled the flag off that row - singularity is the
   * layout's call - which changes nothing about what the helper must express.)
   */
  it("forwards the push options a call site passes", () => {
    mockUsePathname.mockReturnValue("/modules/act/values");
    const { getByTestId } = render(
      <OptionCaller href="/tools/habits" options={{ dangerouslySingular: true }} />,
    );

    fireEvent.press(getByTestId("go"));

    expect(router.push).toHaveBeenCalledWith("/tools/habits", { dangerouslySingular: true });
    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/modules/act/values",
      forPathname: "/tools/habits",
    });
  });

  /**
   * ...and omits the argument entirely when the call site passed none, rather
   * than passing `undefined`. Not cosmetic: `toHaveBeenCalledWith(href)` fails
   * against a call of `(href, undefined)`, so always forwarding a second
   * argument would have broken the existing navigation assertion at every
   * migrated call site in the app - dozens of them - for no behaviour gained.
   */
  it("pushes with a single argument when no options are given", () => {
    pressFrom("/modules/cbt", "/crisis");

    expect((router.push as jest.Mock).mock.calls[0]).toEqual(["/crisis"]);
  });
});

/**
 * The recorded `forPathname` is compared against `usePathname()` on arrival, so
 * anything the address bar carries but the pathname does not has to come off
 * here. A mismatch does not error - it just silently never matches, and the
 * screen quietly shows Up, which is the invisible failure O3 chose opt-out
 * recording to avoid.
 */
describe("targetPathname", () => {
  it("keeps a plain path unchanged", () => {
    expect(targetPathname("/notifications")).toBe("/notifications");
  });

  it("drops a query string and a fragment", () => {
    expect(targetPathname("/notifications?target=cbt")).toBe("/notifications");
    expect(targetPathname("/notifications#row")).toBe("/notifications");
  });

  it("keeps the pathname of an object href, leaving its params off the route", () => {
    expect(targetPathname({ pathname: "/notifications", params: { target: "cbt" } } as Href)).toBe(
      "/notifications",
    );
  });

  it("substitutes a dynamic segment from the params, as the router will", () => {
    // `usePathname()` reports `/tools/journal/3f9a` on arrival, so recording the
    // un-substituted `[id]` form would never match.
    expect(
      targetPathname({ pathname: "/tools/journal/[id]", params: { id: "3f9a" } } as Href),
    ).toBe("/tools/journal/3f9a");
  });

  it("substitutes a catch-all segment", () => {
    expect(
      targetPathname({
        pathname: "/tools/habits/learn/[...rest]",
        params: { rest: ["a", "b"] },
      } as Href),
    ).toBe("/tools/habits/learn/a/b");
  });

  it("leaves a segment alone when the params do not supply it", () => {
    expect(targetPathname({ pathname: "/tools/journal/[id]", params: {} } as Href)).toBe(
      "/tools/journal/[id]",
    );
  });

  /**
   * ⚠️ Hrefs in this repo are routinely written with the route group in them -
   * the sidebar's whole table is `/(app)/…` - and `usePathname()` never reports
   * one. A migrated call site copying that form is the likeliest way to record a
   * target that can never match, and the symptom would be silence.
   */
  it("strips a route group, which usePathname never reports", () => {
    expect(targetPathname("/(app)/settings")).toBe("/settings");
    expect(targetPathname({ pathname: "/(app)/notifications" } as Href)).toBe("/notifications");
  });

  it("strips a group that appears mid-path", () => {
    expect(targetPathname("/(app)/(tabs)/tools/journal")).toBe("/tools/journal");
  });

  it("keeps the root a root when the group was the whole path", () => {
    expect(targetPathname("/(app)")).toBe("/");
  });
});

/**
 * R2's trigger. Off-trail is the whole condition: inside a subtree Up and the
 * Origin are the same route, so an unconditional Origin rule could only ever
 * differ by being wrong.
 */
describe("isOffTrail", () => {
  const remindersCrumbs = [{ label: "Reminders" }];
  const historyCrumbs = [
    { label: "Modules", href: "/modules" },
    { label: "CBT", href: "/modules/cbt" },
    { label: "History" },
  ];

  it("is true for a module reached from outside its subtree", () => {
    expect(isOffTrail("/modules/cbt", "/notifications", remindersCrumbs, "/")).toBe(true);
  });

  it("is false when the Origin is an ancestor on this screen's trail", () => {
    expect(isOffTrail("/modules/cbt", "/modules/cbt/history", historyCrumbs, "/modules/cbt")).toBe(
      false,
    );
  });

  it("is false when the Origin is where Up already goes but has no crumb", () => {
    // The trail never emits a crumb for the root.
    expect(isOffTrail("/", "/notifications", remindersCrumbs, "/")).toBe(false);
  });

  it("is false when the Origin is the screen the user is already on", () => {
    expect(isOffTrail("/notifications", "/notifications", remindersCrumbs, "/")).toBe(false);
  });

  it("is true for a sibling subtree that shares no crumb", () => {
    expect(isOffTrail("/modules/act", "/modules/cbt/history", historyCrumbs, "/modules/cbt")).toBe(
      true,
    );
  });
});

/**
 * O6: the name comes from the route map, never from copy at the call site -
 * which would put an i18n string in every cross-link and render nothing the
 * first time one forgot.
 */
describe("nameOrigin", () => {
  const t = (key: string) => i18n.t(key, { ns: "navigation" });

  it("names a module home from the route map", () => {
    expect(nameOrigin("/modules/cbt", t)).toBe("CBT");
  });

  it("names the deepest segment, not the root of the path", () => {
    expect(nameOrigin("/tools/journal", t)).toBe("Journal");
  });

  it("gives no name for an opaque record the map cannot resolve", () => {
    // Rendering the generic fallback would put "Entry" beside the arrow as
    // though it were a place; callers fall back to Up instead.
    expect(nameOrigin("/tools/journal/3f9a-uuid", t)).toBeNull();
  });

  it("gives no name for the root, which the trail emits no crumb for", () => {
    expect(nameOrigin("/", t)).toBeNull();
  });
});
