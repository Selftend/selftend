import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SharedToolsRow } from "./shared-tools-row";
import { SHARED_TOOLS_BY_PILLAR } from "@/src/features/cbt/cbt-home/cbt-home-config";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { targetPathname } from "@/src/lib/escape-origin";
import { expectEscapeReturnsTo } from "@/test/escape-round-trip";
import { setLanguage } from "@/test/i18n-language";
import { setPlatformOS } from "@/test/modal-marker-mock";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/cbt";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => mockPathname,
}));

const pushMock = router.push as jest.Mock;

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
  mockPathname = "/modules/cbt";
});

describe("SharedToolsRow", () => {
  // The row used to branch: breathing navigated, the other eight popped a guide
  // modal that closed back to the page you were already on. Every chip opens its
  // tool now, so the assertion is the same for all of them - and the chip order
  // is the config order, which is what lets this index by position.
  it.each(["think", "act", "be"] as const)(
    "opens the tool's own route when a %s chip is pressed",
    (pillar) => {
      const tools = SHARED_TOOLS_BY_PILLAR[pillar];
      renderWithProviders(<SharedToolsRow heading="Uses these shared tools" tools={tools} />);

      const chips = screen.getAllByRole("link");
      expect(chips).toHaveLength(tools.length);

      tools.forEach((tool, index) => {
        pushMock.mockClear();
        fireEvent.press(chips[index]);
        expect(pushMock).toHaveBeenCalledWith(tool.route);
      });
    },
  );

  /**
   * These chips are the off-trail pushes #1192 landed hours after the escape
   * rule was charted - the growth that made recording opt-out rather than
   * opt-in (#1265, O3). A chip leaves CBT for a tool that lives under
   * `/tools`, so the tool's own Up climbs to `/tools` and never back to the
   * module the user was working in.
   *
   * `targetPathname` rather than a literal, because `SharedTool.route` is an
   * `Href` the config owns: writing the expected pathname out by hand here would
   * pin this test to today's routes instead of to the recording.
   */
  it.each(["think", "act", "be"] as const)(
    "records the module it left as the Origin for every %s chip",
    (pillar) => {
      const tools = SHARED_TOOLS_BY_PILLAR[pillar];
      renderWithProviders(<SharedToolsRow heading="Uses these shared tools" tools={tools} />);

      const chips = screen.getAllByRole("link");

      tools.forEach((tool, index) => {
        useNavigationOriginStore.setState({ pending: null });
        fireEvent.press(chips[index]);
        expect(useNavigationOriginStore.getState().pending).toEqual({
          origin: "/modules/cbt",
          forPathname: targetPathname(tool.route),
        });
      });
    },
  );

  /**
   * The chip count, pinned - because the prose describing this row has already
   * carried a wrong one.
   *
   * #1192 landed NINE chips ("eight of the nine chips never went anywhere");
   * the config holds EIGHT today, so every later comment saying "the nine
   * chips" describes a set that no longer exists. #1266's own ticket inherited
   * the stale number and called them "nine pushes from the CBT home".
   *
   * ⚠️ If this fails, a shared tool was added or removed - which is fine. Update
   * the number here and the sentence in `shared-tools-row.tsx` that states it,
   * so the two cannot drift apart again.
   */
  it("renders one chip per configured shared tool - eight of them today", () => {
    const configured = [
      ...SHARED_TOOLS_BY_PILLAR.think,
      ...SHARED_TOOLS_BY_PILLAR.act,
      ...SHARED_TOOLS_BY_PILLAR.be,
    ];

    expect(configured).toHaveLength(8);

    renderWithProviders(<SharedToolsRow heading="Uses these shared tools" tools={configured} />);
    expect(screen.getAllByRole("link")).toHaveLength(8);
  });

  // The heading is the caller's copy, not a key this component owns - that is
  // what lets a second module reuse the row without inheriting `cbt.json`.
  it("renders the heading it is given rather than a CBT string", () => {
    renderWithProviders(<SharedToolsRow heading="Also try" tools={SHARED_TOOLS_BY_PILLAR.think} />);

    expect(screen.getByText("Also try")).toBeTruthy();
    expect(screen.queryByText("Uses these shared tools")).toBeNull();
  });

  /**
   * react-native-web hands a `link`'s Enter to the browser, expecting a native
   * anchor - and an href-less chip is a `<div role="link">` the browser does
   * nothing with, so Tab reached every chip and Enter opened none (#1730). Each
   * chip brings its own Enter handler: once per press, never on auto-repeat, and
   * never on Space. Every chip, because the tools are config and a chip that
   * happened to be last would otherwise be the one nobody pressed.
   */
  describe("on web", () => {
    afterEach(() => {
      setPlatformOS("ios");
    });

    it("every chip activates on Enter, once, and not on a held key or on Space", () => {
      setPlatformOS("web");
      const tools = SHARED_TOOLS_BY_PILLAR.think;
      renderWithProviders(<SharedToolsRow heading="Uses these shared tools" tools={tools} />);

      const chips = screen.getAllByRole("link");
      expect(chips).toHaveLength(tools.length);

      tools.forEach((tool, index) => {
        pushMock.mockClear();
        const preventDefault = jest.fn();
        chips[index].props.onKeyDown({ key: "Enter", repeat: false, preventDefault });
        expect(pushMock).toHaveBeenCalledTimes(1);
        expect(pushMock).toHaveBeenCalledWith(tool.route);
        expect(preventDefault).toHaveBeenCalledTimes(1);

        chips[index].props.onKeyDown({ key: "Enter", repeat: true, preventDefault });
        chips[index].props.onKeyDown({ key: " ", repeat: false, preventDefault });
        expect(pushMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});

/**
 * AC2 of #1266, end to end: "opening a shared tool from a CBT chip and escaping
 * returns to CBT, named."
 *
 * ⚠️ The criterion belongs to #1266 but the code that satisfies it shipped with
 * #1265, because these chips render through `SharedToolsRow`, which lives in
 * `src/components/app` - batch 1's territory, not the therapy modules'. The
 * ticket for batch 2 called them "the one genuinely off-trail set in this
 * batch"; they had already been migrated one batch early. The set that was
 * actually still crossing out of CBT unmigrated was `self-care.tsx`, which the
 * ticket never mentions (see `src/features/self-care/self-care-origin.test.tsx`).
 *
 * Recording alone was already pinned above. What is added here is the other end
 * of the journey - the arrival - which nothing asserted: that the Escape waiting
 * on the tool screen actually names CBT and actually goes back there.
 */
describe("escaping a shared tool returns to CBT, named", () => {
  it.each(["/tools/journal", "/tools/breathing"])(
    "returns from %s to the module the chip was pressed in",
    (route) => {
      const tool = SHARED_TOOLS_BY_PILLAR.think
        .concat(SHARED_TOOLS_BY_PILLAR.act, SHARED_TOOLS_BY_PILLAR.be)
        .find((candidate) => targetPathname(candidate.route) === route);
      if (!tool) throw new Error(`no shared-tool chip targets ${route}`);

      const session = renderWithProviders(
        <SharedToolsRow heading="Uses these shared tools" tools={[tool]} />,
      );
      fireEvent.press(screen.getByRole("link"));
      // The module screen is really gone before the tool mounts, so nothing below
      // can match a leftover node from the departed tree.
      session.unmount();

      expectEscapeReturnsTo({
        arriveAt: (pathname) => {
          mockPathname = pathname;
        },
        destination: route,
        name: "CBT",
        origin: "/modules/cbt",
      });
    },
  );
});
