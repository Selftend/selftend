import {
  CardFrame,
  ReplicaHeader,
  TwoStat,
  StatTiles,
  OutlineButton,
  GhostButton,
  MoodFacesRow,
  glyph,
  MATERIAL_FONT,
} from "@/src/features/widgets/cards/kit";
import { TINTS, PALETTE, withAlpha } from "@/src/features/widgets/palette";
import {
  widgetTree,
  findAll,
  texts,
  clickPaths,
} from "@/src/features/widgets/cards/widget-tree-helper";

describe("kit", () => {
  it("glyph converts hyphenated icon names to ligatures", () => {
    expect(glyph("show-chart")).toBe("show_chart");
    expect(glyph("mood")).toBe("mood");
  });

  it("CardFrame paints an opacity-scaled card background with border", () => {
    const tree = widgetTree(
      <CardFrame theme="light" opacity={0.5}>
        {null}
      </CardFrame>,
    );
    expect(tree.type).toBe("FlexWidget");
    expect(tree.props.style.backgroundColor).toBe(withAlpha(PALETTE.light.card, 0.5));
    expect(tree.props.style.borderRadius).toBe(12);
    expect(tree.props.style.borderColor).toBe(PALETTE.light.border);
  });

  it("ReplicaHeader renders tinted icon chip, title, and module pill", () => {
    const tree = widgetTree(
      <ReplicaHeader
        theme="dark"
        icon="filter-drama"
        tint="act"
        title="Defusion"
        moduleLabel="ACT"
      />,
    );
    const icons = findAll(tree, (n) => n.type === "IconWidget");
    expect(icons[0].props.icon).toBe("filter_drama");
    expect(icons[0].props.font).toBe(MATERIAL_FONT);
    expect(icons[0].props.style.color).toBe(TINTS.dark.act);
    expect(texts(tree)).toEqual(["Defusion", "ACT"]);
  });

  it("buttons carry their deep link", () => {
    const out = widgetTree(
      <OutlineButton theme="light" cta={{ label: "Start", path: "/tools/breathing/session" }} />,
    );
    expect(clickPaths(out)).toEqual(["/tools/breathing/session"]);
    const ghost = widgetTree(
      <GhostButton theme="light" cta={{ label: "Open", path: "/tools/sleep" }} />,
    );
    expect(clickPaths(ghost)).toEqual(["/tools/sleep"]);
  });

  it("MoodFacesRow renders 5 faces each deep-linking with its score", () => {
    const tree = widgetTree(<MoodFacesRow theme="light" selectedScore={4} />);
    expect(texts(tree)).toEqual(["😭", "🙁", "😐", "😊", "😁"]);
    expect(clickPaths(tree)).toEqual(
      [1, 2, 3, 4, 5].map((s) => `/tools/mood-tracker/new?score=${s}`),
    );
  });

  it("TwoStat and StatTiles render value/label pairs", () => {
    const two = widgetTree(<TwoStat theme="light" stats={[{ value: "12", label: "Entries" }]} />);
    expect(texts(two)).toEqual(["12", "Entries"]);
    const tiles = widgetTree(
      <StatTiles
        theme="light"
        tiles={[
          { label: "7-day", value: "3.8" },
          { label: "Entries", value: "12", dim: true },
        ]}
      />,
    );
    expect(texts(tiles)).toEqual(["7-DAY", "3.8", "ENTRIES", "12"]);
  });
});
