import { fireEvent, screen, within } from "@testing-library/react-native";
import type { ReactElement } from "react";

import { SidebarNav } from "./sidebar-nav";
import { appEnv } from "@/src/lib/env";
import { openExternalUrl } from "@/src/lib/linking";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("@/src/lib/linking", () => ({ openExternalUrl: jest.fn() }));

jest.mock("expo-router", () => {
  const React = require("react");

  return {
    // `dangerouslySingular` rides through with `href` because it is half of what a
    // panel link IS (#989) - a link that pushes a duplicate of a screen already in the
    // stack is a different thing from one that returns to it.
    Link: ({
      href,
      asChild: _asChild,
      children,
      dangerouslySingular,
    }: {
      href: string;
      asChild?: boolean;
      children: ReactElement;
      // expo-router's real SingularOptions; the panel only ever passes `true`.
      dangerouslySingular?: boolean | ((name: string, params: object) => string | undefined);
    }) => React.cloneElement(React.Children.only(children), { href, dangerouslySingular }),
    usePathname: () => "/",
  };
});

/** Every string rendered inside one row, in document order. Icons are `aria-hidden`. */
function textsInRow(accessibilityLabel: string): string[] {
  const row = screen.getByLabelText(accessibilityLabel);
  return within(row)
    .queryAllByText(/.+/)
    .map((node) => node.props.children)
    .filter((child): child is string => typeof child === "string");
}

/**
 * The sidebar carried a status chip on all three module rows: DBT read "Soon"
 * over a screen headed "On the roadmap", and CBT and ACT both read "Beta"
 * despite being fully usable. Apple cited build 6 under Guideline 2.1 *App
 * Completeness* (#998), which is exactly what a nav entry advertising a module
 * the app does not have invites. #1020 took all three off.
 *
 * These assertions count the text nodes in a row rather than querying for the
 * words that were removed. A `queryByText("Soon")).toBeNull()` passes just as
 * happily when the chip returns under new wording, or when the row stops
 * rendering altogether - it rots into a test of nothing. One label and nothing
 * beside it is the property that actually holds.
 */
describe("SidebarNav module rows", () => {
  it.each([
    ["CBT", "CBT module - Cognitive Behavioural Therapy"],
    ["ACT", "ACT module - Acceptance and Commitment Therapy"],
    ["DBT", "DBT module - Dialectical Behaviour Therapy"],
  ])("renders %s as a bare label with no status chip beside it", (label, accessibilityLabel) => {
    renderWithProviders(<SidebarNav />);

    expect(textsInRow(accessibilityLabel)).toEqual([label]);
  });

  // The chip is the visible half; a screen reader heard the other half. The DBT
  // row announced itself as "(coming soon)" whether or not the pill rendered.
  it("announces DBT without a coming-soon suffix", () => {
    renderWithProviders(<SidebarNav />);

    expect(screen.getByLabelText("DBT module - Dialectical Behaviour Therapy")).toBeTruthy();
    expect(screen.queryByLabelText(/coming soon/i)).toBeNull();
  });

  it("still lists all three modules", () => {
    renderWithProviders(<SidebarNav />);

    for (const label of ["CBT", "ACT", "DBT"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

/**
 * The panel is LATERAL navigation between peer destinations, and expo-router's default
 * NAVIGATE only reuses the route it is already on: a target sitting deeper in the stack
 * gets pushed again. Routines -> Home therefore mounted a SECOND Home and every query on
 * it ran twice (#989). `dangerouslySingular` moves the existing screen to the top instead.
 *
 * Asserted over every row rather than a sampled one: the defect is per-link, so one
 * un-marked row is the whole bug back for that destination.
 */
describe("SidebarNav link identity", () => {
  it("marks every destination singular so a revisit cannot stack a second copy", () => {
    renderWithProviders(<SidebarNav />);

    // Report the hrefs that are NOT singular rather than asserting row by row: the
    // failure then names the destination that regressed instead of just "false !== true".
    //
    // Only rows that carry an `href` are destinations: the Donate row is a link by
    // role but leaves the app (#1711), so it has no route to keep singular.
    const notSingular = screen
      .getAllByRole("link")
      .filter((link) => link.props.href !== undefined)
      .filter((link) => link.props.dangerouslySingular !== true)
      .map((link) => String(link.props.href));

    expect(notSingular).toEqual([]);
  });

  // Guards the assertion above against passing vacuously: an empty-array expectation is
  // satisfied forever by a render that produces no links at all. Named destinations
  // rather than a count, so adding a nav item doesn't fail a test about something else.
  it("actually renders the destinations that assertion is about", () => {
    renderWithProviders(<SidebarNav />);

    const hrefs = screen.getAllByRole("link").map((link) => String(link.props.href));

    expect(hrefs).toEqual(expect.arrayContaining(["/(app)", "/(app)/routines", "/(app)/settings"]));
  });
});

/**
 * The donation path (#1625, decided 2026-09-02): one plain row, last in the panel,
 * that opens GitHub Sponsors and nothing else. The ruling's negative space is the
 * part a test can hold - no badge, no count, no prompt - so the row is asserted the
 * way the module rows are: one label and nothing beside it.
 */
describe("SidebarNav donate row", () => {
  const A11Y = "Donate to Selftend on GitHub Sponsors - opens in your browser";

  it("renders Donate as a bare label with nothing beside it", () => {
    renderWithProviders(<SidebarNav />);

    expect(textsInRow(A11Y)).toEqual(["Donate"]);
  });

  it("is the last row in the panel", () => {
    renderWithProviders(<SidebarNav />);

    const labels = screen.getAllByRole("link").map((link) => link.props.accessibilityLabel);

    expect(labels.at(-1)).toBe(A11Y);
  });

  it("opens the Sponsors page externally instead of routing", () => {
    const onSelect = jest.fn();
    renderWithProviders(<SidebarNav onSelect={onSelect} />);

    const row = screen.getByLabelText(A11Y);
    fireEvent.press(row);

    expect(row.props.href).toBeUndefined();
    expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/sponsors/vasilyoshev");
    // The phone drawer closes on any selection; leaving the app is a selection too.
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  // A fork that has not set its own page must not ship a link to the maintainer's
  // (docs/self-hosting.md). Blank URL, no row - and Support stays the last row, so the
  // panel does not end in a gap.
  it("drops the row entirely when no Sponsors URL is configured, keeping Support last", () => {
    const original = appEnv.sponsorsUrl;
    appEnv.sponsorsUrl = "";
    try {
      renderWithProviders(<SidebarNav />);

      expect(screen.queryByLabelText(A11Y)).toBeNull();
      const labels = screen.getAllByRole("link").map((link) => link.props.accessibilityLabel);
      expect(labels.at(-1)).toBe("Support");
    } finally {
      appEnv.sponsorsUrl = original;
    }
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor. The panel's route rows ARE anchors - `Link asChild` forwards a real
   * `href`, RNW renders `<a>` - so the browser opens them itself. The donate row
   * is the one row that is not: it leaves the app through `openExternalUrl`, has
   * no `href`, and so was a `<div role="link">` Tab could reach and Enter could
   * not open (#1730). It brings its own Enter handler: once per press, never on
   * auto-repeat, never on Space. The anchor rows must NOT get one - the browser
   * already follows an anchor on Enter, and a second handler would open the
   * screen twice.
   */
  describe("on web", () => {
    // The pointer test above has already opened Sponsors once on the same mock.
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      setPlatformOS("ios");
    });

    it("activates on Enter, once, and the anchor rows keep no handler of their own", () => {
      setPlatformOS("web");
      const onSelect = jest.fn();
      renderWithProviders(<SidebarNav onSelect={onSelect} />);

      const row = screen.getByLabelText(A11Y);
      const preventDefault = jest.fn();
      row.props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
      expect(openExternalUrl).toHaveBeenCalledTimes(1);
      expect(openExternalUrl).toHaveBeenCalledWith("https://github.com/sponsors/vasilyoshev");
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);

      row.props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
      row.props.onKeyDown({ key: " ", repeat: false, preventDefault });
      expect(openExternalUrl).toHaveBeenCalledTimes(1);

      const anchors = screen.getAllByRole("link").filter((link) => link.props.href !== undefined);
      expect(anchors.length).toBeGreaterThan(0);
      for (const anchor of anchors) {
        expect(anchor.props.onKeyDown).toBeUndefined();
      }
    });
  });
});

/**
 * ☠️ `history` — a clock turning back — and NOT `insights` (#1903).
 * `insights` is an UPWARD-TRENDING CHART glyph: it draws the improvement
 * implication #1837 rejected in words, on a screen that computes nothing and
 * makes no claim about direction. `timeline` fails the same way.
 *
 * Pinned because reverting the glyph passed the ENTIRE suite — an acceptance
 * criterion of #1903 that shipped with no coverage at all. Found by mutation.
 */
describe("SidebarNav Looking back glyph", () => {
  it("uses a clock turning back, never an upward-trending chart", () => {
    renderWithProviders(<SidebarNav />);

    const row = screen.getByLabelText("Looking back");
    const glyphs = row
      .findAll((node) => typeof node.props?.name === "string")
      .map((node) => String(node.props.name));

    expect(glyphs).toContain("history");
    expect(glyphs).not.toContain("insights");
    expect(glyphs).not.toContain("timeline");
  });
});
