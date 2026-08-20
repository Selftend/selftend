import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { SharedToolsRow } from "./shared-tools-row";
import { SHARED_TOOLS_BY_PILLAR } from "./cbt-home-config";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const pushMock = router.push as jest.Mock;

beforeEach(() => {
  pushMock.mockClear();
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
      renderWithProviders(<SharedToolsRow tools={tools} />);

      const chips = screen.getAllByRole("button");
      expect(chips).toHaveLength(tools.length);

      tools.forEach((tool, index) => {
        pushMock.mockClear();
        fireEvent.press(chips[index]);
        expect(pushMock).toHaveBeenCalledWith(tool.route);
      });
    },
  );
});
