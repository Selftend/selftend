import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";

import { RelatedTools } from "@/src/features/act/related-tools";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

const mockPush = router.push as jest.MockedFunction<typeof router.push>;

describe("RelatedTools", () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * The row used to pass `dangerouslySingular: true` on every push, because its targets are
   * lateral: the tool you jump to may be the one you came from two hops ago (#1027).
   *
   * ☠️ That reasoning was right and the mechanism was wrong. Singularity is decided by the
   * layout, once, for every caller — and three of these four routes were not declared there
   * at all, so this flag was the only thing holding them (#1278). Now that they are
   * declared, the flag is redundant for them and actively WRONG for the fourth:
   * `/tools/meditation` is keyed by `?practice=` and holds per-visit state, so
   * `protected-layout.tsx` deliberately leaves it plain, and forcing singular here made a
   * push REUSE an existing meditation instance rather than mount a fresh one.
   *
   * So the row pushes plainly and the layout stays the single place singularity is decided.
   */
  it("pushes the route plainly, leaving singularity to the layout", () => {
    renderWithProviders(
      <RelatedTools
        tools={[{ icon: "self-improvement", nameKey: "meditation", href: "/tools/meditation" }]}
      />,
    );

    fireEvent.press(screen.getByRole("link"));

    expect(mockPush).toHaveBeenCalledWith("/tools/meditation");
  });

  it("pushes each tool it is given", () => {
    renderWithProviders(
      <RelatedTools
        tools={[
          { icon: "edit-note", nameKey: "journal", href: "/tools/journal" },
          { icon: "anchor", nameKey: "grounding", href: "/tools/grounding" },
        ]}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);

    fireEvent.press(links[1]);
    expect(mockPush).toHaveBeenCalledWith("/tools/grounding");
  });
});
