import { fireEvent, render } from "@testing-library/react-native";
import { usePathname, router } from "expo-router";

import { Text } from "@/src/components/react-native-reusables/text";
import { FocusSessionShell } from "@/src/components/app/focus-session-shell";
import type { SupportedLanguage } from "@/src/i18n";
import { setLanguage } from "@/test/i18n-language";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

function renderShell() {
  return render(
    <FocusSessionShell eyebrow="Box breathing" trailing="Cycle 1 of 8">
      <Text>session body</Text>
    </FocusSessionShell>,
  );
}

/**
 * The shell carries the Escape (#1256, W14/W15 on the #1167 spec): the focus
 * surface is a ROUTE, not a modal, so R3 admits no carve-out for it. The two
 * red routes it fixes are asserted end to end - a real pathname through the
 * real `computeBreadcrumbs` and the real resource bundles, exactly like
 * `screen-escape-destination.test.tsx`, because a stubbed trail cannot catch a
 * crumb table saying something other than what the stub assumed.
 */
describe("FocusSessionShell", () => {
  beforeAll(async () => {
    await setLanguage("en");
  });

  beforeEach(() => jest.clearAllMocks());

  it("renders exactly one Escape (R1), unconditionally", () => {
    mockUsePathname.mockReturnValue("/tools/meditation/session");
    // The barest shell the API allows - no trailing read-out - so an Escape
    // accidentally tied to any optional prop fails here, not in review.
    const { getAllByTestId } = render(
      <FocusSessionShell eyebrow="Sitting">
        <Text>session body</Text>
      </FocusSessionShell>,
    );
    expect(getAllByTestId("screen-escape")).toHaveLength(1);
  });

  it("still renders the eyebrow-and-progress row beside it", () => {
    mockUsePathname.mockReturnValue("/tools/meditation/session");
    const { getByText } = renderShell();
    expect(getByText("Box breathing")).toBeTruthy();
    expect(getByText("Cycle 1 of 8")).toBeTruthy();
    expect(getByText("session body")).toBeTruthy();
  });

  // The announcement follows the destination on both routes the ticket names
  // (R6), and the hop is a `replace` - a leave, not a drill-down (R4).
  describe.each([
    {
      language: "en" as SupportedLanguage,
      grounding: "Back to Grounding",
      meditation: "Back to Meditation",
    },
    {
      language: "bg" as SupportedLanguage,
      grounding: "Назад към Заземяване",
      meditation: "Назад към Медитация",
    },
  ])("announces its destination in $language", (copy) => {
    beforeAll(async () => {
      // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy,
      // and without them these assertions would run against English copy.
      await setLanguage(copy.language);
    });

    afterAll(async () => {
      await setLanguage("en");
    });

    it("on /tools/grounding/[slug], leads up to Grounding", () => {
      mockUsePathname.mockReturnValue("/tools/grounding/54321");
      const { getByLabelText } = renderShell();
      fireEvent.press(getByLabelText(copy.grounding));
      expect(router.replace).toHaveBeenCalledWith("/tools/grounding");
    });

    it("on /tools/meditation/session, leads up to Meditation", () => {
      mockUsePathname.mockReturnValue("/tools/meditation/session");
      const { getByLabelText } = renderShell();
      fireEvent.press(getByLabelText(copy.meditation));
      expect(router.replace).toHaveBeenCalledWith("/tools/meditation");
    });
  });
});
