import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import { sourceFiles } from "./source-scan";

/**
 * #1730 → #1737: no href-less link ships keyboard-dead on web, and no button
 * double-fires.
 *
 * react-native-web (0.21.2, `PressResponder.js:217`) treats a `role="link"` as
 * a native anchor and hands its Enter to the browser instead of calling
 * `onPress`. That is right for an expo-router `Link asChild` (the child renders
 * as a real `<a>`, which the browser follows) and wrong for everything else: a
 * Pressable without an `href` renders `<div role="link">`, which the browser
 * does nothing with - Tab reaches it, Enter is dead. #1734, #1735 and #1736
 * spread the web-only `enterKeyActivationProps` helper on every such site;
 * this suite is what stops the next one from being written without it.
 *
 * The inverse is guarded too. react-native-web activates a `role="button"` on
 * Enter itself, so the helper on a button fires the press twice (the pair the
 * `docs/accessibility.md` bullet forbids).
 *
 * ☠️ Why an AST and not a regex, as `./escape-paths` argues: the questions are
 * structural. Whether a spread belongs to the SAME element as a `role="link"`
 * attribute, and whether that element's direct parent is a `Link asChild`,
 * cannot be read off a line. A regex would fail OPEN on the first multi-line
 * tag it could not pair, which is the failure mode this gate exists to remove.
 * `typescript` is already a direct devDependency; this adds none.
 *
 * ☠️ One blind spot, named: `settings-row.tsx` takes its role as a PROP and
 * spreads the helper behind `role === "link" && …` at runtime. A static walk
 * sees neither a literal link nor a literal button there, so it is out of this
 * suite's sight either way; `settings-row.test.tsx` covers it (#1725). The
 * last test below pins that the blind spot is still that one file, so a second
 * runtime-role site cannot hide behind the same note.
 *
 * Derived from `src/` and `app/` rather than pinned, so a new site lands
 * already covered or fails CI here.
 */

const ROOT = join(__dirname, "..");
const HELPER = "enterKeyActivationProps";

/**
 * The sites whose `role="link"` is backed by a real anchor: each is the direct
 * child of an expo-router `<Link … asChild>`, which forwards the `href` to the
 * child's Pressable so react-native-web renders `<a>` and the browser itself
 * activates Enter. They need no helper - spreading one would double-activate.
 * Keyed by file, with the number of such sites in it: the suite derives the
 * same map from source and requires equality, so an entry that outlives its
 * anchor (or an anchor this list does not name) fails.
 */
const ANCHOR_BACKED: Record<string, { sites: number; reason: string }> = {
  "src/components/app/invisible-header.tsx": {
    sites: 1,
    reason: "the brand's go-home link, a singular Link to the home route",
  },
  "src/components/app/link-button.tsx": {
    sites: 1,
    reason: "the navigating Button - Link asChild forwards the href to its Pressable",
  },
  "src/components/app/sidebar-nav.tsx": {
    sites: 2,
    reason:
      "the route rows and the group rows - both singular Links (the donate row is not one; it carries the helper)",
  },
};

interface LinkSite {
  file: string;
  line: number;
  /** Direct child of a `<Link … asChild>` - a real anchor on web. */
  anchorBacked: boolean;
  /** Spreads `{...enterKeyActivationProps(…)}` on the element itself. */
  hasHelper: boolean;
}

interface ButtonSite {
  file: string;
  line: number;
}

interface Scan {
  links: LinkSite[];
  /** Button-role elements that spread the helper. */
  helperOnButtons: ButtonSite[];
}

function tagName(node: ts.JsxOpeningLikeElement): string {
  return node.tagName.getText();
}

/** The string value of a literal JSX attribute (`role="link"`), if present. */
function literalAttribute(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute)) continue;
    if (attribute.name.getText() !== name) continue;
    const initializer = attribute.initializer;
    if (!initializer) return undefined;
    if (ts.isStringLiteral(initializer)) return initializer.text;
    if (
      ts.isJsxExpression(initializer) &&
      initializer.expression &&
      ts.isStringLiteral(initializer.expression)
    ) {
      return initializer.expression.text;
    }
    return undefined;
  }
  return undefined;
}

function hasAttribute(node: ts.JsxOpeningLikeElement, name: string): boolean {
  return node.attributes.properties.some(
    (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === name,
  );
}

/** `{...enterKeyActivationProps(…)}` among the element's own attributes. */
function spreadsHelper(node: ts.JsxOpeningLikeElement): boolean {
  return node.attributes.properties.some((attribute) => {
    if (!ts.isJsxSpreadAttribute(attribute)) return false;
    let expression: ts.Expression = attribute.expression;
    while (ts.isParenthesizedExpression(expression)) expression = expression.expression;
    return (
      ts.isCallExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === HELPER
    );
  });
}

/**
 * The role the element announces, as this suite classifies it: an explicit
 * literal `role` / `accessibilityRole` wins; a `<Button>` with neither is a
 * button, because the shared component defaults to `role="button"`.
 */
function roleOf(node: ts.JsxOpeningLikeElement): string | undefined {
  const explicit = literalAttribute(node, "role") ?? literalAttribute(node, "accessibilityRole");
  if (explicit !== undefined) return explicit;
  if (hasAttribute(node, "role") || hasAttribute(node, "accessibilityRole")) return undefined;
  return tagName(node) === "Button" ? "button" : undefined;
}

/** Whether the element is the DIRECT child of `<Link … asChild>`. */
function isAnchorBacked(node: ts.JsxOpeningLikeElement): boolean {
  // An opening element's parent is its own JsxElement; a self-closing element
  // sits directly among the parent's children.
  const own = ts.isJsxOpeningElement(node) ? node.parent : node;
  const parent = own.parent;
  if (!parent || !ts.isJsxElement(parent)) return false;
  const wrapper = parent.openingElement;
  return tagName(wrapper) === "Link" && hasAttribute(wrapper, "asChild");
}

/** Every link-role element and every helper-on-button in one source text. */
export function scanSource(file: string, source: string): Scan {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const scan: Scan = { links: [], helperOnButtons: [] };

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const role = roleOf(node);
      if (role === "link") {
        scan.links.push({
          file,
          line,
          anchorBacked: isAnchorBacked(node),
          hasHelper: spreadsHelper(node),
        });
      } else if (role === "button" && spreadsHelper(node)) {
        scan.helperOnButtons.push({ file, line });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return scan;
}

function scanTree(): Scan {
  const files = sourceFiles(ROOT, { dirs: ["src", "app"] });
  const scan: Scan = { links: [], helperOnButtons: [] };
  for (const file of files) {
    const result = scanSource(file, readFileSync(join(ROOT, file), "utf8"));
    scan.links.push(...result.links);
    scan.helperOnButtons.push(...result.helperOnButtons);
  }
  return scan;
}

const at = (site: { file: string; line: number }) => `${site.file}:${site.line}`;

const tree = scanTree();

describe("every href-less link activates on Enter, and no button does so twice (#1730 → #1737)", () => {
  it("derives the link sites from source (canary: the Show-all door and the donate row are found)", () => {
    // If the walk rots, `tree.links` goes empty and the checks below pass
    // vacuously - this canary turns that silent blindness into a failure.
    const files = tree.links.map((site) => site.file);
    expect(files).toContain("src/components/app/show-all-link.tsx");
    expect(files).toContain("src/components/app/sidebar-nav.tsx");
    expect(files).toContain("app/(app)/modules/cbt/self-care.tsx");
  });

  it("every link that is not a real anchor spreads the Enter activation helper", () => {
    const offenders = tree.links.filter((site) => !site.anchorBacked && !site.hasHelper).map(at);

    // Each listed element is a `<div role="link">` on web that react-native-web
    // leaves to the browser on Enter - which does nothing with it. Hoist the
    // press into one callback and spread `{...enterKeyActivationProps(open)}`
    // beside `onPress={open}` (see docs/accessibility.md), or render it through
    // an expo-router `Link asChild` so it becomes a real anchor.
    expect(offenders).toEqual([]);
  });

  it("no real anchor carries the helper - the browser already activates it", () => {
    const offenders = tree.links.filter((site) => site.anchorBacked && site.hasHelper).map(at);
    expect(offenders).toEqual([]);
  });

  it("the anchor-backed sites are exactly the listed ones, so the list cannot go stale", () => {
    const derived: Record<string, number> = {};
    for (const site of tree.links) {
      if (!site.anchorBacked) continue;
      derived[site.file] = (derived[site.file] ?? 0) + 1;
    }
    const listed = Object.fromEntries(
      Object.entries(ANCHOR_BACKED).map(([file, { sites }]) => [file, sites]),
    );

    // A mismatch in either direction: an entry whose site no longer sits inside
    // a `Link asChild` (drop it from ANCHOR_BACKED), or a new anchor this list
    // does not name (add it, with the reason).
    expect(derived).toEqual(listed);
  });

  it("the helper never lands on a button - react-native-web activates those itself", () => {
    // A `role="button"` (or a `<Button>` with no other role) that also spreads
    // the helper fires its press twice on Enter. Drop the spread.
    expect(tree.helperOnButtons.map(at)).toEqual([]);
  });

  it("the one runtime-role carrier is still only settings-row.tsx", () => {
    // Files that call the helper but expose no literal link to the walk are
    // outside its sight; keep that set to the one file whose own suite covers
    // it, so a second runtime-role site cannot hide behind the same note.
    const unseen = sourceFiles(ROOT, { dirs: ["src", "app"] })
      .filter((file) => file !== "src/lib/accessibility.ts")
      .filter((file) => readFileSync(join(ROOT, file), "utf8").includes(`${HELPER}(`))
      .filter((file) => !tree.links.some((site) => site.file === file && site.hasHelper));
    expect(unseen).toEqual(["src/features/settings/components/settings-row.tsx"]);
  });
});

/**
 * The detector, exercised on probe sources on every CI pass - so the real-tree
 * assertions above are known to be able to fail, not merely to pass.
 */
describe("the detector itself", () => {
  const probe = (jsx: string) => scanSource("probe.tsx", `export const P = () => (${jsx});`);

  it("flags a fresh href-less link Pressable that brings no helper", () => {
    const scan = probe(`<Pressable role="link" onPress={open} />`);
    expect(scan.links).toEqual([
      { file: "probe.tsx", line: 1, anchorBacked: false, hasHelper: false },
    ]);
  });

  it("reads the legacy accessibilityRole and a braced string the same way", () => {
    expect(probe(`<Pressable accessibilityRole="link" onPress={open} />`).links).toHaveLength(1);
    expect(probe(`<Pressable role={"link"} onPress={open} />`).links).toHaveLength(1);
  });

  it("passes a link that spreads the helper on the same element, however the tag is laid out", () => {
    const scan = probe(`<Pressable
      role="link"
      onPress={open}
      {...enterKeyActivationProps(open)}
    >
      <Text>x</Text>
    </Pressable>`);
    expect(scan.links).toEqual([
      { file: "probe.tsx", line: 1, anchorBacked: false, hasHelper: true },
    ]);
  });

  it("does not let a helper on a sibling stand in for the link's own", () => {
    const scan = probe(`<View>
      <Pressable role="link" onPress={open} />
      <Pressable role="link" onPress={open} {...enterKeyActivationProps(open)} />
    </View>`);
    expect(scan.links.map((site) => site.hasHelper)).toEqual([false, true]);
  });

  it("recognises the direct child of a Link asChild as a real anchor", () => {
    const scan = probe(`<Link href="/" asChild><Pressable role="link" /></Link>`);
    expect(scan.links).toEqual([
      { file: "probe.tsx", line: 1, anchorBacked: true, hasHelper: false },
    ]);
  });

  it("does not treat a Link without asChild, or a grandchild of one, as an anchor", () => {
    expect(probe(`<Link href="/"><Pressable role="link" /></Link>`).links[0].anchorBacked).toBe(
      false,
    );
    expect(
      probe(`<Link href="/" asChild><View><Pressable role="link" /></View></Link>`).links[0]
        .anchorBacked,
    ).toBe(false);
  });

  it('flags the helper on a role="button" element, and on a bare <Button>', () => {
    expect(
      probe(`<Pressable role="button" {...enterKeyActivationProps(open)} />`).helperOnButtons,
    ).toHaveLength(1);
    expect(
      probe(`<Button onPress={open} {...enterKeyActivationProps(open)} />`).helperOnButtons,
    ).toHaveLength(1);
    expect(
      probe(`<Button role="link" {...enterKeyActivationProps(open)} />`).helperOnButtons,
    ).toHaveLength(0);
  });

  it('ignores prose: a role="link" inside a comment is not a site', () => {
    const scan = scanSource(
      "probe.tsx",
      `// a <Pressable role="link"> that is only described\nexport const P = () => <View />;`,
    );
    expect(scan.links).toEqual([]);
  });
});
