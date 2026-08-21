import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SharedToolsRow } from "./shared-tools-row";
import { SHARED_TOOLS_BY_PILLAR } from "@/src/features/cbt/cbt-home/cbt-home-config";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { targetPathname } from "@/src/lib/escape-origin";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => "/modules/cbt",
}));

const pushMock = router.push as jest.Mock;

beforeEach(() => {
  pushMock.mockClear();
  useNavigationOriginStore.setState({ pending: null });
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

      const chips = screen.getAllByRole("button");
      expect(chips).toHaveLength(tools.length);

      tools.forEach((tool, index) => {
        pushMock.mockClear();
        fireEvent.press(chips[index]);
        expect(pushMock).toHaveBeenCalledWith(tool.route);
      });
    },
  );

  /**
   * These chips are the nine off-trail pushes #1192 landed hours after the
   * escape rule was charted - the growth that made recording opt-out rather
   * than opt-in (#1265, O3). A chip leaves CBT for a tool that lives under
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

      const chips = screen.getAllByRole("button");

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

  // The heading is the caller's copy, not a key this component owns - that is
  // what lets a second module reuse the row without inheriting `cbt.json`.
  it("renders the heading it is given rather than a CBT string", () => {
    renderWithProviders(<SharedToolsRow heading="Also try" tools={SHARED_TOOLS_BY_PILLAR.think} />);

    expect(screen.getByText("Also try")).toBeTruthy();
    expect(screen.queryByText("Uses these shared tools")).toBeNull();
  });
});
