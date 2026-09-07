import { fireEvent, screen, within } from "@testing-library/react-native";

import FaqRoute from "../../../app/faq";
import type { FaqEntrySlug } from "@/src/features/policies/faq-layout";
import { FAQ_ENTRY_INDEX, FAQ_LAYOUT } from "@/src/features/policies/faq-layout";
import enCommon from "@/src/i18n/locales/en/common.json";
import enPolicies from "@/src/i18n/locales/en/policies.json";
import { contactEmails } from "@/src/lib/env";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";
import { renderWithProviders } from "@/test/render-with-providers";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: () => "/faq",
}));

jest.mock("expo-linking", () => ({ openURL: jest.fn() }));

beforeAll(async () => {
  await setLanguage("en");
});

beforeEach(() => {
  jest.clearAllMocks();
  useNavigationOriginStore.setState({ pending: null });
});

const en = enPolicies.faq;
const sections = en.sections as { title: string; body: string[] }[];
const entryOf = (slug: FaqEntrySlug) => sections[FAQ_ENTRY_INDEX[slug]];

/**
 * The eight questions that collapse and the six that never do — **spelled out,
 * not re-derived from `FAQ_LAYOUT`.**
 *
 * Deriving them the way the screen does would make the test agree with a wrong
 * derivation: move an entry from a group into `pinned` and both sides would
 * follow it, leaving "only the group answers collapse" true of whatever the
 * layout happens to say rather than of what the page is supposed to be. Written
 * out, a change to the grouping fails here and has to be stated. Same reason
 * `faq-layout.test.ts` pins each slug against its `en` title rather than reading
 * the title through the index it is checking.
 */
const COLLAPSIBLE: FaqEntrySlug[] = [
  "needAccount",
  "exportDelete",
  "minimumAge",
  "dataCollected",
  "reminders",
  "tooMuch",
  "openSource",
  "contact",
];
const ALWAYS_OPEN: FaqEntrySlug[] = ["crisis", "therapy", "free", "whoCanSee", "noAi", "parents"];

/**
 * The first paragraph of an answer, **as the page renders it**.
 *
 * ☠️ The addresses are interpolated here rather than compared raw. Entries 9 and
 * 13 carry the `{{supportEmail}}` / `{{privacyEmail}}` / `{{securityEmail}}`
 * placeholders `InfoScreen` supplies values for (#2150), so the shipped JSON
 * string is not the string on screen - and a `queryByText` of the raw copy comes
 * back null whether the row is closed or open, which would make every
 * closed-state assertion below vacuous for entry 13.
 *
 * Resolving it through `contactEmails()` is also what keeps the sharp edge: a
 * screen that forgot to supply the values would render the braces verbatim, and
 * that is a failing text query here rather than a page quietly telling a reader
 * to write to `{{supportEmail}}`.
 */
const resolved = contactEmails() as Record<string, string>;
const answerText = (slug: FaqEntrySlug): string =>
  entryOf(slug).body[0].replace(/\{\{(\w+)\}\}/g, (match, name: string) => resolved[name] ?? match);

const escapeForPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The rendered order of a set of strings, read from the tree rather than guessed. */
const orderOf = (...values: string[]): unknown[] =>
  screen
    .getAllByText(new RegExp(`^(${values.map(escapeForPattern).join("|")})$`))
    .map((node) => node.props.children);

/**
 * ☠️ **The outline is read by PROPS, never through `getAllByRole("heading")`.**
 *
 * `Disclosure` puts its trigger inside a `View role="heading"` - it has to, since
 * the accordion pattern is a heading *containing* a button and one node cannot
 * carry both roles. RNTL's `*ByRole` queries filter on `isAccessibilityElement`,
 * false for a host `View` unless `accessible` is set explicitly (and setting it
 * would merge the subtree into one a11y element and swallow the button). So a
 * role query here returns the h1, the four group eyebrows and the letter and
 * **silently omits all eight question headings** - the level-3 run this page's
 * outline exists to guarantee. It would pass, green, over the wrong tree; the
 * anti-vacuity floor does not save it, because the page has enough `Text`
 * headings to clear any reasonable floor while the questions are missing.
 *
 * ☠️ Host nodes only. A prop query matches every element carrying the prop, and
 * `role="heading"` on a `Text` is visible on our `Text`, on React Native's, and on
 * the host - three nodes for one heading, and two for a `View`. Filtering to host
 * elements is what makes the array below one entry per heading.
 *
 * ☠️ Levels through `Number(...)`: `text.tsx`'s `ARIA_LEVEL` map yields the
 * STRING `"1"` for `variant="h1"`, while `Section`, `CardTitle` and `Disclosure`
 * all pass numbers. A bare `toBe(1)` fails on a correct tree.
 */
const headingLevels = (): number[] =>
  screen
    .UNSAFE_getAllByProps({ role: "heading" })
    .filter((node) => typeof node.type === "string")
    .map((node) => Number(node.props["aria-level"]));

/**
 * `/faq` is its own screen (#2147): a crisis block, "Start here", four
 * collapsible groups, the parents' letter and a way to write.
 *
 * The page used to be fourteen flat cards with every answer open. Half the answer
 * text now sits behind a row - and ☠️ **what does not collapse is the design.**
 * Every one of the fourteen questions is on the page as text at all times, the
 * crisis callout and the crisis answer are never hidden, and the parents' letter
 * is never hidden. This file's job is to keep it that way: a later pass that
 * "tidies" the crisis answer into a group, or filters the questions, turns it red.
 */
describe("FaqScreen renders its own page rather than InfoScreen's cards (#2147)", () => {
  /**
   * The chrome, proven by what only the chrome provides. `PolicyPageLayout` owns
   * the header block and `ScreenHeader` renders `<ScreenEscape />` unconditionally,
   * so an Escape here is the observable consequence of going through the shared
   * layout rather than a hand-rolled copy of it.
   */
  it("renders through PolicyPageLayout, so it carries an Escape", () => {
    renderWithProviders(<FaqRoute />);

    expect(screen.getAllByTestId("screen-escape")).toHaveLength(1);
    // Once, not twice: `/faq` has no `STATIC_ROUTES` row, so the one-crumb trail
    // still hides itself and the page name is not repeated above its own heading.
    expect(screen.getAllByText(en.pageTitle)).toHaveLength(1);
    expect(screen.getByText(en.pageDescription)).toBeTruthy();
  });

  /**
   * ☠️ **Every question, always.** The collapse is of answers, not of questions -
   * a reader scanning for whether their question is even addressed must never
   * have to open eight rows to find out.
   */
  it("shows all fourteen questions as text, with the eight group rows closed", () => {
    renderWithProviders(<FaqRoute />);

    // Anti-vacuity: the loop below is meaningless over an empty corpus.
    expect(sections).toHaveLength(14);
    for (const section of sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
    }

    // The two sets above account for the whole corpus, so "only the group
    // answers collapse" is a statement about all fourteen entries rather than
    // about the fourteen minus whichever this file forgot to list.
    expect([...COLLAPSIBLE, ...ALWAYS_OPEN].sort()).toEqual(
      (Object.keys(FAQ_ENTRY_INDEX) as FaqEntrySlug[]).sort(),
    );
  });

  /**
   * The other half of the same rule, stated as an absence and a presence together
   * so neither can pass alone: the eight group answers are gone from the tree, and
   * the six that carry the page's safety and framing are not.
   *
   * `Disclosure` UNMOUNTS its content rather than hiding it, so an absent query is
   * the honest test - a style-hidden subtree would still answer `getByText`.
   */
  it("hides only the eight group answers, and never the crisis or parents copy", () => {
    renderWithProviders(<FaqRoute />);

    expect(COLLAPSIBLE).toHaveLength(8);
    for (const slug of COLLAPSIBLE) {
      expect(screen.queryByText(answerText(slug))).toBeNull();
    }

    expect(ALWAYS_OPEN).toHaveLength(6);
    for (const slug of ALWAYS_OPEN) {
      expect(screen.getByText(answerText(slug))).toBeTruthy();
    }
  });

  /**
   * ☠️ **The crisis block is two things.** `CrisisSupportCallout` is standing
   * safety furniture shared with four other screens and renders unmodified - one
   * copy, with its own routed button. Entry 1 then answers the same question in
   * the FAQ's own voice, always open, and is the entry
   * `docs/app-store-review-information.md` and `docs/child-safety-review.md` both
   * cite when they say the boundary is stated to users. Order is asserted rather
   * than mere presence: two `getByText`s pass just as happily on a page that put
   * the callout at the bottom.
   */
  it("renders the callout once, above the always-open crisis answer", () => {
    renderWithProviders(<FaqRoute />);

    expect(screen.getAllByText(enCommon.safety.title)).toHaveLength(1);
    expect(screen.getByText(enCommon.safety.openCrisis)).toBeTruthy();

    expect(orderOf(enCommon.safety.title, entryOf("crisis").title)).toEqual([
      enCommon.safety.title,
      entryOf("crisis").title,
    ]);
  });

  /**
   * Block order, top to bottom, read off the tree. `getAllByText` returns matches
   * in render order, so one query over the four block titles pins the sequence -
   * and a group reordered in `FAQ_LAYOUT` fails here as well as in its own guard.
   */
  it("orders the blocks: Start here, the four groups, then the parents' letter", () => {
    renderWithProviders(<FaqRoute />);

    const groupLabels = FAQ_LAYOUT.groups.map(
      (group) => en.groups[group.key as keyof typeof en.groups],
    );

    expect(orderOf(en.startHere, ...groupLabels, entryOf("parents").title)).toEqual([
      en.startHere,
      ...groupLabels,
      entryOf("parents").title,
    ]);
  });

  /**
   * ☠️ The outline the page exists to have, asserted end to end rather than spot
   * checked. h1 title → h3 callout → h3 crisis question → h2 *Start here* → h3 ×4
   * pinned → then a group's h2 label followed by its questions at h3.
   *
   * The callout's level 3 above the level-2 blocks is inherited, not invented:
   * `/support` already ships this exact h1 → h3 → h2 order from the same
   * component, so `/faq` matches its sibling. #2137 owns that question for all
   * five call sites at once.
   */
  it("gives the page one h1 and a level-2/level-3 outline under it", () => {
    renderWithProviders(<FaqRoute />);

    const groupRuns = FAQ_LAYOUT.groups.flatMap((group) => [2, ...group.entries.map(() => 3)]);

    expect(headingLevels()).toEqual([
      1, // the page title
      3, // the crisis callout's own CardTitle
      3, // entry 1, always open
      2, // Start here
      3,
      3,
      3,
      3, // the four pinned questions
      ...groupRuns,
      2, // the parents' letter
    ]);
  });

  /**
   * One press opens all eight, and the label flips. The control sits in its own
   * row above the groups because `Section`'s `action` slot is per-section: a
   * control inside any one group would govern that group alone.
   */
  it("expands and collapses all eight rows from one control", () => {
    renderWithProviders(<FaqRoute />);

    fireEvent.press(screen.getByText(en.expandAll));

    for (const slug of COLLAPSIBLE) {
      expect(screen.getByText(answerText(slug))).toBeTruthy();
    }
    expect(screen.getByText(en.collapseAll)).toBeTruthy();
    expect(screen.queryByText(en.expandAll)).toBeNull();

    fireEvent.press(screen.getByText(en.collapseAll));

    for (const slug of COLLAPSIBLE) {
      expect(screen.queryByText(answerText(slug))).toBeNull();
    }
    expect(screen.getByText(en.expandAll)).toBeTruthy();
  });

  /**
   * ☠️ **The id keying, not a positional guess.** Open state is keyed by the
   * entry's slug from `FAQ_LAYOUT`; an array index is correct exactly until the
   * list is filtered or reordered, at which point it re-points the open row at a
   * different answer. So the assertion reads the opened body out of THAT row's
   * own content region - `<id>-content`, which `Disclosure` derives from the id
   * this screen gives it - rather than asking whether the text is anywhere.
   *
   * The seven rows that were not pressed are checked closed in the same test: an
   * implementation that opened everything would satisfy the first half alone.
   */
  it("opens the row that was pressed, keyed by its own id", () => {
    renderWithProviders(<FaqRoute />);

    const slug: FaqEntrySlug = "exportDelete";
    fireEvent.press(screen.getByText(entryOf(slug).title));

    const [content] = screen.UNSAFE_getAllByProps({ nativeID: `faq-${slug}-content` });
    expect(within(content).getByText(answerText(slug))).toBeTruthy();

    for (const other of COLLAPSIBLE.filter((candidate) => candidate !== slug)) {
      expect(screen.queryByText(answerText(other))).toBeNull();
    }
    // Still *Expand all*: one open row is not eight.
    expect(screen.getByText(en.expandAll)).toBeTruthy();
  });

  /**
   * Nothing is persisted, and that is a product decision rather than an omission:
   * a reader coming back to the page meets the same short page they met the first
   * time, not a wall of prose they opened three weeks ago.
   */
  it("closes every row again on a remount", () => {
    const first = renderWithProviders(<FaqRoute />);
    fireEvent.press(screen.getByText(en.expandAll));
    expect(screen.getByText(answerText("contact"))).toBeTruthy();
    first.unmount();

    renderWithProviders(<FaqRoute />);

    for (const slug of COLLAPSIBLE) {
      expect(screen.queryByText(answerText(slug))).toBeNull();
    }
    expect(screen.getByText(en.expandAll)).toBeTruthy();
  });

  /**
   * The footer's way to write. ☠️ Not `ShowAllLink` - that component's copy is
   * fixed to a nine-noun door vocabulary `test/show-all-door-copy.test.ts` watches,
   * and *Send a message* is not a door to a list. The behaviour is asserted, not
   * just the label: it pushes through `usePushWithOrigin`, so `/support`'s Escape
   * can return here.
   */
  it("offers a way to write, recording the Origin", () => {
    renderWithProviders(<FaqRoute />);

    expect(screen.getByText(en.stillNotAnswered)).toBeTruthy();
    fireEvent.press(screen.getByText(en.sendMessage));

    expect(useNavigationOriginStore.getState().pending).toEqual({
      origin: "/faq",
      forPathname: "/support",
    });
  });

  /**
   * ☠️ **No raw `{{placeholder}}` reaches the page.** Entries 9 and 13 interpolate
   * the contact addresses, and an unsupplied variable renders the braces verbatim
   * - silently, on the one page whose job is telling a reader how to reach a
   * human, and invisibly to every i18n gate. The sweep is over the whole rendered
   * tree with every row open, so it covers whatever a later entry adds too.
   */
  it("interpolates the contact addresses everywhere, with every row open", () => {
    renderWithProviders(<FaqRoute />);
    fireEvent.press(screen.getByText(en.expandAll));

    const rendered = screen
      .UNSAFE_getAllByProps({})
      .filter((node) => typeof node.type === "string")
      .flatMap((node) =>
        (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).filter(
          (child: unknown): child is string => typeof child === "string",
        ),
      );

    // Anti-vacuity: an empty sweep would pass the `not.toMatch` below forever.
    expect(rendered.length).toBeGreaterThan(50);
    for (const text of rendered) {
      expect(text).not.toMatch(/\{\{\w+\}\}/);
    }
  });
});
