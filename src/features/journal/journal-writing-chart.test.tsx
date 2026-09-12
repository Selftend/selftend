import { screen } from "@testing-library/react-native";
import { ActivityIndicator, Pressable } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { LOADING_FILL } from "@/src/components/app/reserved-space";
import { Text } from "@/src/components/react-native-reusables/text";
import {
  JournalWritingChart,
  JournalWritingChartReservation,
} from "@/src/features/journal/journal-writing-chart";
import { journalWritingReservationBuckets } from "@/src/features/journal/journal-overview";
import type { JournalWritingRange } from "@/src/features/journal/types";
import { renderWithProviders } from "@/test/render-with-providers";

const THURSDAY = new Date("2026-05-28T12:00:00.000Z");
beforeAll(() => jest.useFakeTimers({ now: THURSDAY }));
afterAll(() => jest.useRealTimers());

/**
 * What a host node carries when a pointer or a keyboard can reach it - probed off a real
 * `Pressable`'s rendered root, which carries all three.
 *
 * ☠️ `queryAllByRole("link", { includeHiddenElements: true })` is NOT a substitute: with a
 * role-carrying `Pressable` planted inside the stick it still returned `[]`, so it would
 * have been a guard that cannot fail. The test below plants one and proves this walk finds
 * it, because an assertion about an absence is worth only as much as its ability to find a
 * presence.
 */
const INTERACTIVE_PROPS = ["onStartShouldSetResponder", "onClick", "focusable"] as const;

function interactiveNodes(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll(
    (node) =>
      typeof node.type === "string" &&
      INTERACTIVE_PROPS.some((prop) => node.props[prop] !== undefined),
    { deep: true },
  );
}

/**
 * The day numbers under the columns, which only a seven-bucket range draws. Read off the
 * chart's own label class rather than by text: a day number is one or two digits, and the
 * screen this chart sits on is full of those.
 */
function labelClassNames(root: ReactTestInstance): string[] {
  return root
    .findAll(
      (node) =>
        typeof node.type === "string" &&
        String(node.props.className ?? "").includes("tabular-nums"),
      { deep: true },
    )
    .map((node) => String(node.props.className));
}

describe("JournalWritingChart", () => {
  it("draws a bar per bucket and names what one bar covers", () => {
    renderWithProviders(
      <JournalWritingChart
        buckets={[
          {
            startDayKey: "2026-05-27",
            endDayKey: "2026-05-27",
            wordCount: 0,
            unit: "day",
            rangeStartDayKey: "2026-05-27",
            rangeEndDayKey: "2026-05-28",
          },
          {
            startDayKey: "2026-05-28",
            endDayKey: "2026-05-28",
            wordCount: 120,
            unit: "day",
            rangeStartDayKey: "2026-05-27",
            rangeEndDayKey: "2026-05-28",
          },
        ]}
      />,
    );

    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(2);
    // Drawn, and announced as one fact per column - the half the reservation below hides.
    // Asserted here so that "the stick says nothing" is a difference rather than a query
    // that would have found nothing either way.
    expect(screen.getAllByRole("image")).toHaveLength(2);
    expect(screen.getByText("Words written per day.")).toBeTruthy();
    expect(screen.getByLabelText("May 28: 120 words")).toBeTruthy();
  });

  // The caption names the unit the read returned, so a ninety-day chart does not call its
  // seven-day buckets days.
  it("captions weekly buckets as seven-day periods", () => {
    renderWithProviders(
      <JournalWritingChart
        buckets={[
          {
            startDayKey: "2026-03-01",
            endDayKey: "2026-03-07",
            wordCount: 42,
            unit: "week",
            rangeStartDayKey: "2026-03-01",
            rangeEndDayKey: "2026-05-28",
          },
        ]}
      />,
    );

    expect(screen.getByText("Words written per seven-day period.")).toBeTruthy();
  });
});

/**
 * ADR-0009 clause 2, on the journal writing chart. The stick is the chart itself at
 * `opacity-0`, so there is no silhouette to keep in step and no pixel number to go stale
 * - which is why every assertion below is about what the stick IS rather than how tall it
 * is.
 *
 * ⚠️ A height assertion here would be **vacuously green**: NativeWind resolves nothing
 * into `props.style` under jest, so a reserved-size check passes without testing anything
 * (`item-card.tsx`, and ADR-0009's Enforcement section). The one guard that runs in a real
 * engine is `test/e2e/loading-reserves-space.e2e.test.ts`, deliberately kept to the single
 * site whose shift lands a tap.
 */
describe("JournalWritingChartReservation", () => {
  /**
   * Clause 1. The stick holds real words - a caption naming a unit nothing has confirmed,
   * a per-column announcement for each of thirty days - and a chart that has not loaded is
   * not a chart of silence. Drawn or read out, any of it would claim a fact this surface
   * does not have.
   */
  it("says nothing: the whole stick is out of the accessibility tree", () => {
    renderWithProviders(<JournalWritingChartReservation range={30} />);

    expect(screen.queryByText("Words written per day.")).toBeNull();
    expect(screen.queryAllByRole("image")).toHaveLength(0);
    expect(screen.getByTestId("journal-writing-reservation")).toBeTruthy();
  });

  /**
   * ☠️ No fill, only the spinner it replaces. Grey bars would say writing is coming and
   * how much of it, and whether this range holds any writing at all is precisely what the
   * read is about to answer (ADR-0009, edge 2) - it can perfectly well settle on "No
   * writing in this range."
   *
   * ☠️ The obvious spelling of the second half - `UNSAFE_queryAllByProps({ className:
   * expect.stringContaining(LOADING_FILL) })` - is vacuously green and was shipped that
   * way once (#2346): `findAllByProps` compares with `!==`, so an asymmetric matcher (an
   * object) never equals a className (a string) and the query returns `[]` whatever the
   * tree holds. Walk the tree and read the prop instead.
   */
  it("shows the spinner it stands in for, and draws no fill", () => {
    const tree = renderWithProviders(<JournalWritingChartReservation range={30} />);

    expect(tree.UNSAFE_getAllByType(ActivityIndicator)).toHaveLength(1);
    const filled = tree.root.findAll(
      (node) =>
        typeof node.type === "string" && String(node.props.className ?? "").includes(LOADING_FILL),
      { deep: true },
    );
    expect(filled).toEqual([]);
  });

  /**
   * ☠️ Nothing inside a reservation may be reachable by keyboard - `ReservedSpace` hides
   * its stick from eye, screen reader and pointer, and none of that reaches the Tab key.
   * A chart column is a labelled `View` rather than a control, so this holds by
   * construction here; it is asserted so that it stays that way when the chart next grows
   * a pressable column.
   */
  it("holds no control, by a walk proven able to find one", () => {
    const probe = renderWithProviders(
      <Pressable accessibilityRole="link" onPress={() => {}}>
        <Text>a control</Text>
      </Pressable>,
    );
    expect(interactiveNodes(probe.root)).toHaveLength(1);
    probe.unmount();

    const tree = renderWithProviders(<JournalWritingChartReservation range={30} />);

    expect(interactiveNodes(tree.root)).toEqual([]);
  });

  /**
   * The reservation's whole claim to exactness: the columns it holds are the columns the
   * range will land, labels and all. Thirty columns with no day numbers under them, seven
   * with one each - so a stick that guessed the same shape for both ranges would be a
   * label line short on one of them, which is the drift this technique exists to rule out.
   */
  it.each([
    [7 as JournalWritingRange, 7, 7],
    [30 as JournalWritingRange, 30, 0],
    [90 as JournalWritingRange, 13, 0],
    ["all" as JournalWritingRange, 12, 0],
  ])("reserves the %s range's columns and its label line", (range, bars, labels) => {
    const tree = renderWithProviders(<JournalWritingChartReservation range={range} />);

    expect(screen.getAllByTestId("bar-chart-bar", { includeHiddenElements: true })).toHaveLength(
      bars,
    );
    expect(labelClassNames(tree.root)).toHaveLength(labels);
  });

  /**
   * The pair the assertion above is only worth having against: the stick and the chart the
   * read lands are the same component drawing the same columns, so the reservation cannot
   * be right about the bars and wrong about the line under them.
   */
  it("holds exactly what the loaded chart draws for the same range", () => {
    const stick = renderWithProviders(<JournalWritingChartReservation range={7} />);
    const stickLabels = labelClassNames(stick.root);
    const stickBars = screen.getAllByTestId("bar-chart-bar", {
      includeHiddenElements: true,
    }).length;
    stick.unmount();

    const loaded = renderWithProviders(
      <JournalWritingChart
        buckets={journalWritingReservationBuckets(7, THURSDAY).map((bucket, index) => ({
          ...bucket,
          wordCount: index * 10,
        }))}
      />,
    );

    expect(screen.getAllByTestId("bar-chart-bar")).toHaveLength(stickBars);
    expect(labelClassNames(loaded.root)).toEqual(stickLabels);
  });
});
