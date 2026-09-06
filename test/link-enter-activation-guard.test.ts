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
 * ☠️ The walk's one blind spot, and how it is fenced: an element whose role is
 * an EXPRESSION (`role={role}`) may or may not be a link, and a static walk
 * cannot tell. `settings-row.tsx` is the live case - it takes its role as a
 * prop and spreads the helper behind `role === "link" && …` at runtime, which
 * `settings-row.test.tsx` covers (#1725). So every element with a non-literal
 * role is recorded, and the set of files carrying one is pinned below with a
 * reason each: a new runtime-role element fails here until someone has said
 * why it can never be an href-less link (or has covered it in its own suite).
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
 * Each entry names one site by its file and the `href` expression of the Link
 * that wraps it: the suite derives the same set from source and requires
 * equality, so an entry that outlives its anchor (or an anchor this list does
 * not name) fails - per site, not per file, so one anchor swapped for another
 * in the same file cannot hide behind a count.
 */
const ANCHOR_BACKED: { file: string; href: string; reason: string }[] = [
  {
    file: "src/components/app/invisible-header.tsx",
    href: "homeHref",
    reason: "the brand's go-home link, a singular Link to the home route",
  },
  {
    file: "src/components/app/link-button.tsx",
    href: "href",
    reason: "the navigating Button - Link asChild forwards the href to its Pressable",
  },
  {
    file: "src/components/app/sidebar-nav.tsx",
    href: "item.href",
    reason:
      "the route rows - singular Links (the donate row is not one; it carries the helper). #1841 folded the group hubs in here: `All tools` and `All modules` are ordinary rows, so `item.href` covers them and the separate group-label anchor below this entry is gone",
  },
];

/**
 * Files with an element whose role is an expression, and why each can never
 * be an href-less link the walk would otherwise miss. A new one fails the
 * suite until it is listed here with its reason - or, if it CAN be a link,
 * until it carries the helper behind the same runtime check settings-row does
 * and its own suite proves it.
 */
const RUNTIME_ROLE: Record<string, string> = {
  "src/components/app/selectable-chip.tsx": "role is `checkbox` or `radio`, never a link",
  "src/components/react-native-reusables/button.tsx":
    "passes the caller's role through and defaults to button; a link role arrives only via LinkButton, a real anchor",
  "src/components/react-native-reusables/checkbox.tsx":
    "passes the caller's role through; a toggle, never a link",
  "src/components/react-native-reusables/switch.tsx":
    "passes the caller's role through; a toggle, never a link",
  "src/components/react-native-reusables/text.tsx":
    "heading, blockquote and code roles, never a link",
  "src/features/settings/components/settings-row.tsx":
    'role is `link` or `button` by prop; spreads the helper behind `role === "link"` at runtime, covered by settings-row.test.tsx (#1725)',
};

interface LinkSite {
  file: string;
  line: number;
  /**
   * The `href` expression of the `<Link … asChild>` this element is the direct
   * child of - a real anchor on web - or undefined when it is not one.
   */
  anchorHref: string | undefined;
  /** Spreads `{...enterKeyActivationProps(…)}` on the element itself. */
  hasHelper: boolean;
}

interface Site {
  file: string;
  line: number;
}

interface Scan {
  links: LinkSite[];
  /** Button-role elements that spread the helper. */
  helperOnButtons: Site[];
  /** Elements whose role is an expression the walk cannot read. */
  runtimeRoles: Site[];
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

/** The role attribute's own text - `role={role}` reads as `role`. */
function attributeText(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  for (const attribute of node.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== name) continue;
    const initializer = attribute.initializer;
    if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
      return initializer.expression.getText();
    }
    return initializer?.getText();
  }
  return undefined;
}

const RUNTIME = Symbol("a role the walk cannot read");

/**
 * The role the element announces, as this suite classifies it: an explicit
 * literal `role` / `accessibilityRole` wins; a role given as an expression is
 * RUNTIME, which the suite fences separately; a `<Button>` with neither is a
 * button, because the shared component defaults to `role="button"`.
 */
function roleOf(node: ts.JsxOpeningLikeElement): string | typeof RUNTIME | undefined {
  const explicit = literalAttribute(node, "role") ?? literalAttribute(node, "accessibilityRole");
  if (explicit !== undefined) return explicit;
  if (hasAttribute(node, "role") || hasAttribute(node, "accessibilityRole")) return RUNTIME;
  return tagName(node) === "Button" ? "button" : undefined;
}

/**
 * The `href` expression of the `<Link … asChild>` the element is the DIRECT
 * child of, or undefined when it is not one. `asChild` clones only its
 * immediate child, so a grandchild would receive no href and be just as dead.
 */
function anchorHrefOf(node: ts.JsxOpeningLikeElement): string | undefined {
  // An opening element's parent is its own JsxElement; a self-closing element
  // sits directly among the parent's children.
  const own = ts.isJsxOpeningElement(node) ? node.parent : node;
  const parent = own.parent;
  if (!parent || !ts.isJsxElement(parent)) return undefined;
  const wrapper = parent.openingElement;
  if (tagName(wrapper) !== "Link" || !hasAttribute(wrapper, "asChild")) return undefined;
  return attributeText(wrapper, "href") ?? "";
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
  const scan: Scan = { links: [], helperOnButtons: [], runtimeRoles: [] };

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const role = roleOf(node);
      if (role === "link") {
        scan.links.push({
          file,
          line,
          anchorHref: anchorHrefOf(node),
          hasHelper: spreadsHelper(node),
        });
      } else if (role === "button" && spreadsHelper(node)) {
        scan.helperOnButtons.push({ file, line });
      } else if (role === RUNTIME) {
        scan.runtimeRoles.push({ file, line });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return scan;
}

function scanTree(): Scan {
  const files = sourceFiles(ROOT, { dirs: ["src", "app"] });
  const scan: Scan = { links: [], helperOnButtons: [], runtimeRoles: [] };
  for (const file of files) {
    const result = scanSource(file, readFileSync(join(ROOT, file), "utf8"));
    scan.links.push(...result.links);
    scan.helperOnButtons.push(...result.helperOnButtons);
    scan.runtimeRoles.push(...result.runtimeRoles);
  }
  return scan;
}

const anchorKey = (site: { file: string; href: string }) =>
  `${site.file} <Link href={${site.href}}>`;

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
    const offenders = tree.links
      .filter((site) => site.anchorHref === undefined && !site.hasHelper)
      .map(at);

    // Each listed element is a `<div role="link">` on web that react-native-web
    // leaves to the browser on Enter - which does nothing with it. Hoist the
    // press into one callback and spread `{...enterKeyActivationProps(open)}`
    // beside `onPress={open}` (see docs/accessibility.md), or render it through
    // an expo-router `Link asChild` so it becomes a real anchor.
    expect(offenders).toEqual([]);
  });

  it("no real anchor carries the helper - the browser already activates it", () => {
    const offenders = tree.links
      .filter((site) => site.anchorHref !== undefined && site.hasHelper)
      .map(at);
    expect(offenders).toEqual([]);
  });

  it("the anchor-backed sites are exactly the listed ones, so the list cannot go stale", () => {
    const derived = tree.links
      .filter((site) => site.anchorHref !== undefined)
      .map((site) => anchorKey({ file: site.file, href: site.anchorHref ?? "" }))
      .sort();
    const listed = ANCHOR_BACKED.map(anchorKey).sort();

    // A mismatch in either direction: an entry whose site no longer sits inside
    // a `Link asChild` with that href (drop it from ANCHOR_BACKED), or a new
    // anchor this list does not name (add it, with the reason).
    expect(derived).toEqual(listed);
  });

  it("the helper never lands on a button - react-native-web activates those itself", () => {
    // A `role="button"` (or a `<Button>` with no other role) that also spreads
    // the helper fires its press twice on Enter. Drop the spread.
    expect(tree.helperOnButtons.map(at)).toEqual([]);
  });

  it("every element whose role the walk cannot read is in a file listed with its reason", () => {
    // A `role={expression}` may be a link the walk cannot see. The files that
    // carry one are pinned, each with why it can never be an href-less link
    // (or which suite proves its own Enter handling); a new one fails here
    // until it is reasoned about. Both directions: a listed file with no
    // runtime role left is stale too.
    const derived = [...new Set(tree.runtimeRoles.map((site) => site.file))].sort();
    expect(derived).toEqual(Object.keys(RUNTIME_ROLE).sort());
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
      { file: "probe.tsx", line: 1, anchorHref: undefined, hasHelper: false },
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
      { file: "probe.tsx", line: 1, anchorHref: undefined, hasHelper: true },
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
      { file: "probe.tsx", line: 1, anchorHref: '"/"', hasHelper: false },
    ]);
  });

  it("does not treat a Link without asChild, or a grandchild of one, as an anchor", () => {
    expect(
      probe(`<Link href="/"><Pressable role="link" /></Link>`).links[0].anchorHref,
    ).toBeUndefined();
    expect(
      probe(`<Link href="/" asChild><View><Pressable role="link" /></View></Link>`).links[0]
        .anchorHref,
    ).toBeUndefined();
  });

  it("records an element whose role is an expression, without guessing what it is", () => {
    const scan = probe(`<Pressable role={role} onPress={open} />`);
    expect(scan.links).toEqual([]);
    expect(scan.helperOnButtons).toEqual([]);
    expect(scan.runtimeRoles).toEqual([{ file: "probe.tsx", line: 1 }]);
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
