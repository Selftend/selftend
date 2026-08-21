import { render } from "@testing-library/react-native";
import { usePathname } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import i18n, { type SupportedLanguage } from "@/src/i18n";
import { useLanguage } from "@/test/i18n-language";

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
    await useLanguage(copy.language as SupportedLanguage);
  });

  afterAll(async () => {
    await useLanguage("en");
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
   * The seven forms that hop up to an unnamed record. Each would otherwise
   * announce "Back to Entry" - and the nearest named ancestor ("Back to
   * Journal") would name a screen the Escape does not go to.
   */
  it.each([
    ["/routines/3f9a-uuid/edit"],
    ["/tools/check-in/3f9a-uuid/edit"],
    ["/tools/gratitude-log/3f9a-uuid/edit"],
    ["/tools/habits/3f9a-uuid/edit"],
    ["/tools/habits/3f9a-uuid/log"],
    ["/tools/journal/3f9a-uuid/edit"],
    ["/tools/sleep/3f9a-uuid/edit"],
  ])("says 'Go back' on %s", (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText(copy.goBack)).toBeTruthy();
    // The generic fallback's own translated word never appears in the label, in
    // either locale - not "Back to Entry", not "Назад към Запис".
    expect(queryByLabelText(new RegExp(i18n.t("navigation:breadcrumb.entry")))).toBeNull();
    // Nor the nearest NAMED ancestor, which is a screen the Escape skips past.
    expect(queryByLabelText(copy.backToJournal)).toBeNull();
  });
});
