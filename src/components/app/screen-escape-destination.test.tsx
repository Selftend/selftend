import { render } from "@testing-library/react-native";
import { usePathname } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import i18n, { type SupportedLanguage } from "@/src/i18n";
import { UNNAMED_DESTINATION_FORMS } from "@/test/escape-forms";
import { setLanguage } from "@/test/i18n-language";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

/**
 * The Escape's label, derived end to end (#1253): a real pathname through the
 * real `computeBreadcrumbs` and the real resource bundles, with nothing mocked
 * between the route and the announced string.
 *
 * `screen-escape.test.tsx` stubs the trail to exercise the label's branches in
 * isolation. It therefore cannot catch the failure that actually reaches users:
 * a route whose crumb table says something other than what the stub assumed. So
 * this file asserts against pathnames copied from `app/`, in both shipped
 * locales - the same reasoning behind `breadcrumbs-i18n.test.ts`, which exists
 * because `test/i18n-key-coverage.test.ts` is structurally blind to labels that
 * come from a table VALUE rather than a literal `t("…")`.
 */
describe.each([
  {
    language: "en",
    goBack: "Go back",
    backToHome: "Back to Home",
    backToGoals: "Back to Goals",
    backToJournal: "Back to Journal",
  },
  {
    language: "bg",
    goBack: "Върни се",
    backToHome: "Назад към Начало",
    backToGoals: "Назад към Цели",
    backToJournal: "Назад към Дневник",
  },
])("ScreenEscape announces its destination in $language", (copy) => {
  beforeAll(async () => {
    // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy, and
    // without them these assertions would run against English copy and pass
    // whatever the implementation did.
    await setLanguage(copy.language as SupportedLanguage);
  });

  afterAll(async () => {
    await setLanguage("en");
  });

  beforeEach(() => jest.clearAllMocks());

  it("names the parent it hops to", () => {
    mockUsePathname.mockReturnValue("/modules/cbt/goals/new");
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText(copy.backToGoals)).toBeTruthy();
  });

  it("names the list a record's detail screen sits under", () => {
    mockUsePathname.mockReturnValue("/tools/journal/3f9a-uuid");
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText(copy.backToJournal)).toBeTruthy();
  });

  it("names Home where the screen is a leaf off the root", () => {
    // `(auth)`: a one-crumb screen whose trail hides, so Up is the root.
    mockUsePathname.mockReturnValue("/sign-in");
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText(copy.backToHome)).toBeTruthy();
  });

  it("keeps saying 'Close' under the close glyph, on a form whose parent IS named", () => {
    mockUsePathname.mockReturnValue("/modules/cbt/goals/new");
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape glyph="close" />);
    expect(getByLabelText(i18n.t("common:close"))).toBeTruthy();
    expect(queryByLabelText(copy.backToGoals)).toBeNull();
  });

  /**
   * The seven forms that hop up to an unnamed record, each rendered with the
   * glyph its screen ACTUALLY ships.
   *
   * ⚠️ The ticket's acceptance criteria say all seven announce "Go back". They
   * do not, and the code is right: five of them are forms wearing the X, and the
   * label follows the glyph, not the destination - which the same ticket states
   * ("The X glyph keeps announcing 'Close'"). The two criteria collide on those
   * five and the glyph wins. Rendering a hard-coded arrow for all seven would
   * have made this suite agree with the ticket instead of with the app.
   *
   * What holds across all seven, and is the point of the fallback, is the
   * negative: no route in this set announces the word "Entry", and none names
   * the ancestor above the record either.
   */
  it.each(UNNAMED_DESTINATION_FORMS.map((form) => [form.pathname, form] as const))(
    "announces no borrowed name on %s",
    (_pathname, form) => {
      mockUsePathname.mockReturnValue(form.pathname);
      const { getByLabelText, queryByLabelText } = render(<ScreenEscape glyph={form.glyph} />);

      expect(
        getByLabelText(form.glyph === "close" ? i18n.t("common:close") : copy.goBack),
      ).toBeTruthy();
      // The generic fallback's own translated word never appears in the label,
      // in either locale - not "Back to Entry", not "Назад към Запис".
      expect(queryByLabelText(new RegExp(i18n.t("navigation:breadcrumb.entry")))).toBeNull();
      // Nor the nearest NAMED ancestor, which is a screen the Escape skips past.
      expect(queryByLabelText(copy.backToJournal)).toBeNull();
    },
  );

  /**
   * The trail's half of the same seven, held separately from the glyph above:
   * whatever glyph a screen happens to ship today, the trail supplies no name
   * for any of these destinations. This is what would change if a record's crumb
   * ever became nameable - and it is deliberately NOT coupled to which of the
   * five editors currently wears an X.
   */
  it.each(UNNAMED_DESTINATION_FORMS.map((form) => [form.pathname]))(
    "has no name to offer for the destination of %s",
    (pathname) => {
      mockUsePathname.mockReturnValue(pathname);
      const { getByLabelText } = render(<ScreenEscape glyph="arrow-back" />);
      expect(getByLabelText(copy.goBack)).toBeTruthy();
    },
  );
});
