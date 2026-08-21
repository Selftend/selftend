import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import { useLanguage } from "@/test/i18n-language";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;

beforeAll(async () => {
  await useLanguage("en");
});

describe("ScreenEscape", () => {
  beforeEach(() => jest.clearAllMocks());

  // R3/R7 (#1250): the Escape is a slot of its own, so it does not inherit the
  // trail's "hide a lone crumb" rule. These two cases are the whole point of the
  // split - both rendered nothing while the arrow lived inside `ScreenBreadcrumb`.
  it("renders on a one-crumb screen, where the trail hides", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Back to Home")).toBeTruthy();
  });

  it("renders even when the trail is empty", () => {
    mockUseBreadcrumbs.mockReturnValue([]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Back to Home")).toBeTruthy();
  });

  it("climbs to the deepest ancestor crumb, replacing rather than pushing", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Gratitude log", href: "/tools/gratitude-log" },
      { label: "Entry" },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    fireEvent.press(getByLabelText("Back to Gratitude log"));
    // `replace`, not `push`: an Escape is a leave, not a drill-down (R4).
    expect(router.replace).toHaveBeenCalledWith("/tools/gratitude-log");
  });

  it("escapes to the root when no crumb above the current one has an href", () => {
    // The one-crumb screens (`/notifications`, `/settings`, the policy pages):
    // their only crumb is the current page's own, so Up is the root.
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
    const { getByLabelText } = render(<ScreenEscape />);
    fireEvent.press(getByLabelText("Back to Home"));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("labels the close glyph 'Close', never the destination", () => {
    // The label follows the glyph, not the destination: on a form the promise is
    // *abandoning* this, and where it lands is secondary (R6).
    mockUseBreadcrumbs.mockReturnValue([{ label: "Tools", href: "/tools" }, { label: "New" }]);
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape glyph="close" />);
    expect(getByLabelText("Close")).toBeTruthy();
    expect(queryByLabelText("Back to Tools")).toBeNull();
    expect(queryByLabelText("Go back")).toBeNull();
  });

  it("does the same structural hop under either glyph", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Tools", href: "/tools" }, { label: "New" }]);
    const { getByLabelText } = render(<ScreenEscape glyph="close" />);
    fireEvent.press(getByLabelText("Close"));
    expect(router.replace).toHaveBeenCalledWith("/tools");
  });
});

/**
 * T2/R6 (#1253): the Escape says where it goes.
 *
 * An explicit `accessibilityLabel` REPLACES a pressable's children for a screen
 * reader, so once the arrow wears the destination's name (the off-trail Origin
 * case, #1261) a glyph-only label would show sighted users a name that
 * screen-reader users never hear.
 *
 * Where the trail cannot name the destination the Escape says "Go back". It
 * never says "Back to Entry" - that is the absence of a name dressed as one -
 * and never names the nearest *named* ancestor, which would name a place the
 * Escape does not go.
 */
describe("ScreenEscape - naming the destination", () => {
  beforeEach(() => jest.clearAllMocks());

  it("names the crumb it actually hops to, not the deepest named one", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Modules", href: "/modules" },
      { label: "CBT", href: "/modules/cbt" },
      { label: "Goals", href: "/modules/cbt/goals" },
      { label: "Entry" },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Back to Goals")).toBeTruthy();
  });

  it("says 'Go back' when the crumb it hops to has no name", () => {
    // `/tools/journal/[id]/edit`: Up is the record, whose crumb is the generic
    // fallback. "Back to Entry" and "Back to Journal" are both lies.
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Journal", href: "/tools/journal" },
      { label: "Entry", href: "/tools/journal/3f9a-uuid", unresolved: true },
      { label: "Edit" },
    ]);
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Go back")).toBeTruthy();
    expect(queryByLabelText("Back to Entry")).toBeNull();
    expect(queryByLabelText("Back to Journal")).toBeNull();
  });

  it("still hops to the unnamed record even though it will not name it", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Journal", href: "/tools/journal" },
      { label: "Entry", href: "/tools/journal/3f9a-uuid", unresolved: true },
      { label: "Edit" },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    fireEvent.press(getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/tools/journal/3f9a-uuid");
  });

  it("ignores an unresolved crumb that is not the destination", () => {
    // The record's own crumb is unnamed, but Up from the detail screen is the
    // list above it - which has a perfectly good name.
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Journal", href: "/tools/journal" },
      { label: "Entry", unresolved: true },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Back to Journal")).toBeTruthy();
  });
});

describe("ScreenEscape - naming the destination in Bulgarian", () => {
  beforeAll(async () => {
    // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy, and
    // without them these assertions would run against English and go vacuous.
    await useLanguage("bg");
  });

  afterAll(async () => {
    await useLanguage("en");
  });

  it("interpolates the name rather than concatenating English around it", () => {
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Инструменти", href: "/tools" },
      { label: "Дневник", href: "/tools/journal" },
      { label: "Запис" },
    ]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Назад към Дневник")).toBeTruthy();
  });

  it("says the Bulgarian 'Go back' where the destination has no name", () => {
    // The whole reason the marker is structural: this branch is chosen without
    // ever comparing a label to the word "Entry", which reads "Запис" here.
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Инструменти", href: "/tools" },
      { label: "Дневник", href: "/tools/journal" },
      { label: "Запис", href: "/tools/journal/3f9a-uuid", unresolved: true },
      { label: "Редактиране" },
    ]);
    const { getByLabelText, queryByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Върни се")).toBeTruthy();
    expect(queryByLabelText("Назад към Запис")).toBeNull();
  });

  it("names Home in Bulgarian on a one-crumb screen", () => {
    mockUseBreadcrumbs.mockReturnValue([{ label: "Известия" }]);
    const { getByLabelText } = render(<ScreenEscape />);
    expect(getByLabelText("Назад към Начало")).toBeTruthy();
  });
});
