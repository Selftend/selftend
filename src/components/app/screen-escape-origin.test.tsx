import { fireEvent, render } from "@testing-library/react-native";
import { router, usePathname } from "expo-router";

import { ScreenEscape } from "@/src/components/app/screen-escape";
import { useBreadcrumbs } from "@/src/lib/use-breadcrumbs";
import { useNavigationOriginStore } from "@/src/stores/navigation-origin-store";
import { setLanguage } from "@/test/i18n-language";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  usePathname: jest.fn(),
}));
jest.mock("@/src/lib/use-breadcrumbs", () => ({ useBreadcrumbs: jest.fn() }));

const mockUseBreadcrumbs = useBreadcrumbs as jest.MockedFunction<typeof useBreadcrumbs>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

beforeAll(async () => {
  await setLanguage("en");
});

/**
 * R2 / O1-O7 (#1261): the Escape leads Up, **unless** the arrival carried an
 * Origin that is not on this screen's own trail.
 *
 * This is the originally reported symptom. Reminders sits at the root, so its Up
 * is Home; a user who tapped the bell on the CBT module home lands there and has
 * lost their place. Nothing about the trail changes - the divergence is carried
 * by the arrival, in memory, and consumed once.
 *
 * The Reminders trail used below is a single crumb, exactly as it renders, so
 * these cases also cover the screen where the trail is hidden and the Escape's
 * own label is the only thing naming where the exit goes.
 */
describe("ScreenEscape - an off-trail Origin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationOriginStore.setState({ pending: null });
    mockUsePathname.mockReturnValue("/notifications");
    mockUseBreadcrumbs.mockReturnValue([{ label: "Reminders" }]);
  });

  function arriveFrom(origin: string, forPathname = "/notifications") {
    useNavigationOriginStore.setState({ pending: { origin, forPathname } });
  }

  it("leads back to the Origin instead of Up", () => {
    arriveFrom("/modules/cbt");
    const { getByLabelText } = render(<ScreenEscape />);

    fireEvent.press(getByLabelText("Back to CBT"));
    // Up from Reminders is the root; the Origin overrides it. `replace` for both
    // destinations (R4) - the Origin is typically already in the stack, where a
    // push would mount a second copy of it.
    expect(router.replace).toHaveBeenCalledWith("/modules/cbt");
  });

  it("wears the Origin's name beside the arrow, not a bare glyph", () => {
    arriveFrom("/modules/cbt");
    const { getByText } = render(<ScreenEscape />);
    // R5: an arrow identical to Up but leading somewhere else is a silent
    // divergence, and here the trail is hidden, so this is the only name on row.
    expect(getByText("CBT")).toBeTruthy();
  });

  it("shows plain Up when no Origin was carried", () => {
    const { getByLabelText, queryByText } = render(<ScreenEscape />);

    expect(getByLabelText("Back to Home")).toBeTruthy();
    expect(queryByText("CBT")).toBeNull();
    fireEvent.press(getByLabelText("Back to Home"));
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  /**
   * The stale-Origin case, and the reason the read clears the store rather than
   * merely matching on `forPathname`. Arriving from the bell, escaping, then
   * reaching Reminders again from the sidebar must show Up: a render-time guard
   * would still match the pathname and serve a long-dead CBT.
   */
  it("does not serve the same Origin to a later arrival at the same screen", () => {
    arriveFrom("/modules/cbt");
    const first = render(<ScreenEscape />);
    expect(first.getByLabelText("Back to CBT")).toBeTruthy();
    first.unmount();

    const second = render(<ScreenEscape />);
    expect(second.getByLabelText("Back to Home")).toBeTruthy();
    expect(second.queryByText("CBT")).toBeNull();
  });

  it("ignores an Origin recorded for a different screen", () => {
    arriveFrom("/modules/cbt", "/settings");
    const { getByLabelText } = render(<ScreenEscape />);

    expect(getByLabelText("Back to Home")).toBeTruthy();
  });

  /**
   * O4: consumed on **mount**, not on read. The Escape reads its destination on
   * every render pass, so a consume-on-read would clear the store on the first
   * and lose the Origin before the second - the label would vanish from under
   * the user on any re-render.
   */
  it("keeps the Origin across re-renders of the same screen", () => {
    arriveFrom("/modules/cbt");
    const { getByLabelText, rerender } = render(<ScreenEscape />);

    rerender(<ScreenEscape />);
    rerender(<ScreenEscape />);
    expect(getByLabelText("Back to CBT")).toBeTruthy();
  });

  /**
   * R2's trigger is *off-trail*, not *whenever an Origin exists*. Recording an
   * on-trail push is harmless by design - that is what lets the helper record
   * every push without a judgement call at the call site.
   */
  it("still shows Up when the Origin is already on this screen's trail", () => {
    mockUsePathname.mockReturnValue("/modules/cbt/history");
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Modules", href: "/modules" },
      { label: "CBT", href: "/modules/cbt" },
      { label: "History" },
    ]);
    arriveFrom("/modules/cbt", "/modules/cbt/history");

    const { getByLabelText, queryByText } = render(<ScreenEscape />);
    // Up and the Origin are the same route here, so the Origin adds nothing. The
    // name is withheld too: a labelled arrow would announce a divergence that
    // does not exist, and the trail beside it already says "CBT".
    expect(getByLabelText("Back to CBT")).toBeTruthy();
    expect(queryByText("CBT")).toBeNull();
    fireEvent.press(getByLabelText("Back to CBT"));
    expect(router.replace).toHaveBeenCalledWith("/modules/cbt");
  });

  it("shows Up when the Origin is this screen's Up but carries no crumb", () => {
    // The trail never emits a crumb for the root, so an Origin of "/" would look
    // off-trail while leading exactly where Up already goes.
    arriveFrom("/");
    const { getByLabelText, queryByText } = render(<ScreenEscape />);

    expect(getByLabelText("Back to Home")).toBeTruthy();
    expect(queryByText("Home")).toBeNull();
  });

  /**
   * O5: an Origin belongs to exactly one screen. Drilling from Reminders into a
   * detail screen gets that screen's own Up, never the module - the store is
   * already empty, because the arrival at Reminders consumed it.
   */
  it("does not propagate to the next screen drilled into", () => {
    arriveFrom("/modules/cbt");
    render(<ScreenEscape />).unmount();

    mockUsePathname.mockReturnValue("/routines/3f9a-uuid");
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Routines", href: "/routines" },
      { label: "Entry" },
    ]);
    const detail = render(<ScreenEscape />);
    expect(detail.getByLabelText("Back to Routines")).toBeTruthy();
    expect(detail.queryByText("CBT")).toBeNull();
  });

  /**
   * R5: the X stays bare even on an off-trail arrival - there the promise is
   * *abandoning*, and "X CBT" reads as a location claim. The destination still
   * follows R2; only the label is withheld.
   */
  it("withholds the name under the close glyph but still leads to the Origin", () => {
    mockUsePathname.mockReturnValue("/tools/journal/new");
    mockUseBreadcrumbs.mockReturnValue([
      { label: "Tools", href: "/tools" },
      { label: "Journal", href: "/tools/journal" },
      { label: "New" },
    ]);
    arriveFrom("/modules/cbt", "/tools/journal/new");

    const { getByLabelText, queryByText } = render(<ScreenEscape glyph="close" />);
    expect(getByLabelText("Close")).toBeTruthy();
    expect(queryByText("CBT")).toBeNull();
    fireEvent.press(getByLabelText("Close"));
    expect(router.replace).toHaveBeenCalledWith("/modules/cbt");
  });

  /**
   * O6: the label comes from the route map - and where the map has no name, the
   * Origin reuses #1253's naming path unchanged, "Go back" fallback included.
   *
   * ⚠️ Naming is the announcement's problem, never the destination's. The Escape
   * still GOES to the Origin: a user who left an unnameable record for `/crisis`
   * is the case where being returned to Home instead is least acceptable. What
   * it must not do is render the generic crumb label, which would put "Entry"
   * beside the arrow as though it were a place.
   */
  it("still leads to an Origin the route map cannot name", () => {
    arriveFrom("/routines/3f9a-uuid");
    const { getByLabelText, queryByText } = render(<ScreenEscape />);

    expect(getByLabelText("Go back")).toBeTruthy();
    fireEvent.press(getByLabelText("Go back"));
    expect(router.replace).toHaveBeenCalledWith("/routines/3f9a-uuid");
  });

  it("shows no borrowed name for an Origin it cannot name", () => {
    arriveFrom("/routines/3f9a-uuid");
    const { queryByText, queryByLabelText } = render(<ScreenEscape />);

    // Not the generic fallback word, and not Up's name either - announcing
    // "Back to Home" on a press that goes to the record would put the promise
    // and the destination back out of step.
    expect(queryByText("Entry")).toBeNull();
    expect(queryByLabelText("Back to Entry")).toBeNull();
    expect(queryByLabelText("Back to Home")).toBeNull();
  });
});

describe("ScreenEscape - an off-trail Origin in Bulgarian", () => {
  beforeAll(async () => {
    // Via the helper, never a bare `changeLanguage`: bg's bundles are lazy, and
    // without them these assertions would run against English and go vacuous.
    await setLanguage("bg");
  });

  afterAll(async () => {
    await setLanguage("en");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationOriginStore.setState({ pending: null });
    mockUsePathname.mockReturnValue("/notifications");
    mockUseBreadcrumbs.mockReturnValue([{ label: "Напомняния" }]);
  });

  it("names the Origin from the route map, in the user's language", () => {
    useNavigationOriginStore.setState({
      pending: { origin: "/modules/cbt", forPathname: "/notifications" },
    });
    const { getByText, getByLabelText } = render(<ScreenEscape />);

    // Read through the real bundles, so a name that only exists in English
    // cannot pass here. CBT is "КПТ" in Bulgarian.
    expect(getByText("КПТ")).toBeTruthy();
    expect(getByLabelText("Назад към КПТ")).toBeTruthy();
  });

  /**
   * The widest name either shipped locale can put beside the arrow, and the
   * reason the label was measured rather than guessed: "Дневник на
   * благодарността" is 216.5dp at the trail's eyebrow type (11px, weight 600,
   * uppercased, 0.14em tracking - canvas `measureText` against the real Noto
   * Sans face), against 292dp of row on `/notifications` at 360dp. It fits, so
   * nothing truncates today; `numberOfLines={1}` keeps the fallback in a tighter
   * host predictable rather than letting it wrap or break mid-word.
   */
  it("renders the longest Bulgarian origin name on one line", () => {
    useNavigationOriginStore.setState({
      pending: { origin: "/tools/gratitude-log", forPathname: "/notifications" },
    });
    const { getByText } = render(<ScreenEscape />);

    const label = getByText("Дневник на благодарността");
    expect(label).toBeTruthy();
    expect(label.props.numberOfLines).toBe(1);
  });
});
