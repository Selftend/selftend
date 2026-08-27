import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

/**
 * Which of a screen's RENDER PATHS reach the Escape chrome — the question
 * `escape-coverage.test.ts` cannot ask (#1328).
 *
 * That suite walks a route file and asks "does this route reach the chrome at
 * all?". Its own docblock admits the limit: the verdict is per FILE, not per
 * render path. A screen that mounts `ScreenHeader` on its happy path and
 * early-returns a bare `SafeAreaView` while loading answers YES to the per-file
 * question while stranding the user on the branch that actually renders — R3
 * says the Escape is "never absent below the root", and a loading state is not
 * a declared exception, it is an undeclared one.
 *
 * ☠️ Why an AST and not another regex, unlike `./source-scan`: the question is
 * structural, not lexical. It needs to know which `return` statements belong to
 * the screen component rather than to a `renderItem` callback nested inside it,
 * and where one returned expression ends and the next begins. No regex can
 * answer either, and a scanner that guesses would fail OPEN — silently passing
 * the branch it could not parse, which is the failure mode this gate exists to
 * remove. `typescript` is already a direct devDependency (it compiles the repo),
 * so this adds no dependency.
 *
 * ☠️ Platform forks are outside this walk's sight, exactly as they are outside
 * `escape-coverage.test.ts`'s: `resolveSpec` resolves one specifier to one file
 * and never considers a `.web.tsx` sibling, so a web fork of a screen could drop
 * chrome on one platform invisibly. If a fork ever appears on a route's path,
 * this resolver must learn to demand chrome of BOTH variants.
 *
 * The walk deliberately fails CLOSED in one direction and OPEN in another, and
 * the asymmetry is the design: a path whose chrome it cannot see is REPORTED
 * (better a false alarm someone must read than a strand nobody does), but a
 * file whose component it cannot find at all falls back to the per-file scan
 * rather than inventing a verdict. Every route in the repo parses today, and
 * `unanalysable` is returned alongside the findings so that stops being true
 * loudly rather than quietly.
 */

const CHROME = new Set(["ScreenHeader", "ScreenTopBar", "ModuleHomeHeader", "ScreenEscape"]);

export interface ChromelessPath {
  /** The route whose screen strands the user. */
  route: string;
  /** The file the offending `return` is written in — often not the route file. */
  file: string;
  line: number;
  /** What the branch renders instead, for the failure message. */
  rendered: string;
}

export interface PathScan {
  chromeless: ChromelessPath[];
  /** Routes whose component could not be located; each fell back to the per-file scan. */
  unanalysable: string[];
}

export function scanRenderPaths(repo: string, routes: string[], maxHops: number): PathScan {
  const sources = new Map<string, ts.SourceFile>();
  const sourceOf = (file: string): ts.SourceFile => {
    let parsed = sources.get(file);
    if (!parsed) {
      parsed = ts.createSourceFile(
        file,
        fs.readFileSync(path.join(repo, file), "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      sources.set(file, parsed);
    }
    return parsed;
  };

  const lineOf = (file: string, node: ts.Node): number =>
    sourceOf(file).getLineAndCharacterOfPosition(node.getStart(sourceOf(file))).line + 1;

  /** A repo-internal specifier resolved to a repo-relative file, or null. */
  const resolveSpec = (spec: string, fromFile: string): string | null => {
    let base: string;
    if (spec.startsWith("@/")) base = spec.slice(2);
    else if (spec.startsWith(".")) base = path.posix.join(path.posix.dirname(fromFile), spec);
    else return null;
    for (const suffix of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
      const candidate = base + suffix;
      if (!candidate.endsWith(".tsx") && !candidate.endsWith(".ts")) continue;
      if (fs.existsSync(path.join(repo, candidate))) return candidate;
    }
    return null;
  };

  /** Local binding name → module specifier, for default, named and namespace imports. */
  const importMaps = new Map<string, Map<string, string>>();
  const importMap = (file: string): Map<string, string> => {
    let map = importMaps.get(file);
    if (map) return map;
    map = new Map<string, string>();
    for (const statement of sourceOf(file).statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
      if (statement.importClause.isTypeOnly) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const spec = statement.moduleSpecifier.text;
      if (statement.importClause.name) map.set(statement.importClause.name.text, spec);
      const bindings = statement.importClause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) map.set(bindings.name.text, spec);
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          if (!element.isTypeOnly) map.set(element.name.text, spec);
    }
    importMaps.set(file, map);
    return map;
  };

  /**
   * Root names of the capitalized JSX tags a node renders UNCONDITIONALLY.
   *
   * ☠️ Conditional subtrees are not descended into, and that is the whole point.
   * `renderPaths` splits branching written as a whole-screen swap, but branching
   * written INSIDE the children is the same defect wearing different brackets:
   *
   *     <SafeAreaView>{isLoading ? <LoadingState/> : <><ScreenTopBar/>…</>}</SafeAreaView>
   *
   * A walk that counted every tag in the subtree would find `ScreenTopBar` and
   * pass the screen, while the branch that renders during loading has no way
   * out. Refusing to look inside a conditional encodes G1 directly - chrome is
   * rendered unconditionally, never `{cond ? <ScreenEscape/> : null}` - so a
   * screen that hides its chrome behind a condition FAILS rather than passing on
   * the strength of a tag it might not render.
   *
   * `throughConditionals` is for the coarse per-file backstop only, which stays
   * as permissive as the suite it backs up.
   */
  const tagsIn = (node: ts.Node, throughConditionals = false): Set<string> => {
    const tags = new Set<string>();
    const visit = (current: ts.Node): void => {
      if (!throughConditionals) {
        if (ts.isConditionalExpression(current)) return;
        if (
          ts.isBinaryExpression(current) &&
          current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
        )
          return;
      }
      if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) {
        let name: ts.JsxTagNameExpression = current.tagName;
        while (ts.isPropertyAccessExpression(name)) name = name.expression;
        if (ts.isIdentifier(name) && /^[A-Z]/.test(name.text)) tags.add(name.text);
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
    return tags;
  };

  type Component = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
  const isComponent = (node: ts.Node): node is Component =>
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node);

  /** A component defined in `file` under `name` — declaration or `const` arrow. */
  const componentByName = (file: string, name: string): Component | null => {
    for (const statement of sourceOf(file).statements) {
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return statement;
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations)
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === name &&
            declaration.initializer &&
            isComponent(declaration.initializer)
          )
            return declaration.initializer;
    }
    return null;
  };

  /** Where a bare `export { default } from "…"` / `export default X` re-export lands. */
  const defaultExportTarget = (file: string): string | null => {
    for (const statement of sourceOf(file).statements) {
      if (
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause) &&
        statement.exportClause.elements.some((element) => element.name.text === "default")
      )
        return resolveSpec(statement.moduleSpecifier.text, file);
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        const { expression } = statement;
        if (ts.isIdentifier(expression)) {
          const spec = importMap(file).get(expression.text);
          if (spec) return resolveSpec(spec, file);
        }
      }
    }
    return null;
  };

  /** The component this file default-exports, if it is written here. */
  const defaultComponent = (file: string): Component | null => {
    for (const statement of sourceOf(file).statements) {
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      const isDefaultExport =
        modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) &&
        modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (isDefaultExport && ts.isFunctionDeclaration(statement)) return statement;
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        const { expression } = statement;
        if (isComponent(expression)) return expression;
        if (ts.isIdentifier(expression)) {
          const local = componentByName(file, expression.text);
          if (local) return local;
        }
      }
    }
    return null;
  };

  /**
   * The `return` statements belonging to `component` itself — never those of a
   * `renderItem`/`map` callback nested inside it, whose early return is a list
   * cell and not a screen.
   */
  const ownReturns = (component: Component): ts.ReturnStatement[] => {
    const returns: ts.ReturnStatement[] = [];
    const visit = (node: ts.Node): void => {
      if (node !== component && isComponent(node)) return;
      if (ts.isReturnStatement(node)) returns.push(node);
      ts.forEachChild(node, visit);
    };
    if (component.body) ts.forEachChild(component.body, visit);
    return returns;
  };

  /**
   * One returned expression split into the trees it can actually render. Only
   * ROOT-level branching splits: `cond ? <A/> : <B/>` swaps the whole screen, so
   * each side is its own path, while a ternary nested among JSX children is
   * body content rendered UNDER chrome that is already mounted above it.
   *
   * `cond && <A/>` splits the same way, and its second path is deliberately
   * `null`: when the guard is false that return renders NOTHING, which is the
   * blank screen `return null` draws and the same strand. No route writes this
   * shape today - which is the point of handling it now, while the cost is
   * three lines, rather than discovering the gate fails open on the first one.
   */
  const renderPaths = (expression: ts.Expression | undefined): (ts.Expression | null)[] => {
    if (!expression) return [null];
    if (ts.isParenthesizedExpression(expression)) return renderPaths(expression.expression);
    if (ts.isConditionalExpression(expression))
      return [...renderPaths(expression.whenTrue), ...renderPaths(expression.whenFalse)];
    if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    )
      return [...renderPaths(expression.right), null];
    return [expression];
  };

  // Per-file fallback, for a followed component whose definition is not found:
  // does this file render chrome anywhere within the remaining budget? Same
  // question `escape-coverage.test.ts` asks, kept only as the coarse backstop.
  const fileVerdicts = new Map<string, boolean>();
  const fileReachesChrome = (file: string, hopsLeft: number): boolean => {
    const key = `${file} ${hopsLeft}`;
    const cached = fileVerdicts.get(key);
    if (cached !== undefined) return cached;
    fileVerdicts.set(key, false); // Cycles terminate as "not found via this path".
    const tags = tagsIn(sourceOf(file), true);
    let found = [...tags].some((tag) => CHROME.has(tag));
    if (!found && hopsLeft > 0) {
      const imports = importMap(file);
      const next: string[] = [];
      const target = defaultExportTarget(file);
      if (target) next.push(target);
      for (const tag of tags) {
        const spec = imports.get(tag);
        const resolved = spec ? resolveSpec(spec, file) : null;
        if (resolved) next.push(resolved);
      }
      found = next.some((candidate) => fileReachesChrome(candidate, hopsLeft - 1));
    }
    fileVerdicts.set(key, found);
    return found;
  };

  const componentVerdicts = new Map<string, boolean>();

  /** Every render path of `component` reaches chrome. */
  const componentAlwaysReaches = (
    file: string,
    component: Component,
    hopsLeft: number,
  ): boolean => {
    const key = `${file}#${component.pos}#${hopsLeft}`;
    const cached = componentVerdicts.get(key);
    if (cached !== undefined) return cached;
    // A cycle is not a way out; treating it as one would let two components
    // that only ever render each other vouch for themselves.
    componentVerdicts.set(key, false);
    const verdict = chromelessIn(file, component, hopsLeft).length === 0;
    componentVerdicts.set(key, verdict);
    return verdict;
  };

  /** Every component this path renders that is defined somewhere we can read. */
  const followable = (
    file: string,
    expression: ts.Expression,
  ): { file: string; component: Component }[] => {
    const imports = importMap(file);
    const targets: { file: string; component: Component }[] = [];
    for (const tag of tagsIn(expression)) {
      const local = componentByName(file, tag);
      if (local) targets.push({ file, component: local });
      const spec = imports.get(tag);
      const resolved = spec ? resolveSpec(spec, file) : null;
      if (!resolved) continue;
      const target = componentByName(resolved, tag);
      if (target) targets.push({ file: resolved, component: target });
    }
    return targets;
  };

  /**
   * The component a path hands the entire screen to, if it is exactly one
   * CHILDLESS element (`return <RoutinesHomeScreen />`) whose definition we can
   * read.
   *
   * ☠️ Childless is the load-bearing half. `return <MobileFormScreen>…</…>`
   * also looks like one element, but everything the screen renders sits INSIDE
   * it — so the missing chrome belongs to the caller that failed to pass a
   * `topBar`, not to the general-purpose scaffold it passed nothing to. Hopping
   * there blamed `mobile-form-screen.tsx` for `act-urge-surf-screen.tsx`.
   */
  const wholeScreenDelegate = (
    file: string,
    expression: ts.Expression,
  ): { file: string; component: Component } | null => {
    let node: ts.Expression = expression;
    while (ts.isParenthesizedExpression(node)) node = node.expression;
    if (!ts.isJsxSelfClosingElement(node)) return null;
    const tagName: ts.JsxTagNameExpression = node.tagName;
    if (!ts.isIdentifier(tagName) || !/^[A-Z]/.test(tagName.text)) return null;
    const tag = tagName.text;
    const local = componentByName(file, tag);
    if (local) return { file, component: local };
    const spec = importMap(file).get(tag);
    const resolved = spec ? resolveSpec(spec, file) : null;
    if (!resolved) return null;
    const target = componentByName(resolved, tag);
    return target ? { file: resolved, component: target } : null;
  };

  /**
   * The outermost conditionals inside a node - those not themselves nested in
   * another conditional. Each is a fork the screen can take while rendering this
   * path, so each is checked as a set of sub-paths rather than ignored.
   */
  const spineConditionals = (node: ts.Node): ts.Expression[] => {
    const forks: ts.Expression[] = [];
    const visit = (current: ts.Node): void => {
      if (
        ts.isConditionalExpression(current) ||
        (ts.isBinaryExpression(current) &&
          current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      ) {
        forks.push(current);
        return; // Its own branches are explored by the recursive check below.
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
    return forks;
  };

  /** Does this one render path put chrome on screen? */
  const pathReachesChrome = (
    file: string,
    expression: ts.Expression,
    hopsLeft: number,
  ): boolean => {
    const tags = tagsIn(expression);
    if ([...tags].some((tag) => CHROME.has(tag))) return true;
    if (hopsLeft <= 0) return false;
    for (const target of followable(file, expression))
      if (componentAlwaysReaches(target.file, target.component, hopsLeft - 1)) return true;
    const imports = importMap(file);
    for (const tag of tags) {
      const spec = imports.get(tag);
      const resolved = spec ? resolveSpec(spec, file) : null;
      if (resolved && !componentByName(resolved, tag) && fileReachesChrome(resolved, hopsLeft - 1))
        return true;
    }
    // A fork puts chrome on screen only if EVERY way through it does. That is
    // what separates the grounding flow - which picks between two shells that
    // each carry an Escape - from a screen whose chrome sits in one arm of a
    // ternary and vanishes on the other. `renderPaths` supplies the arms, so an
    // `&&` contributes its empty arm and can never satisfy this.
    for (const fork of spineConditionals(expression)) {
      const arms = renderPaths(fork);
      if (arms.every((arm) => arm !== null && pathReachesChrome(file, arm, hopsLeft))) return true;
    }
    return false;
  };

  /** The render paths of `component` that leave the user with no way out. */
  const chromelessIn = (
    file: string,
    component: Component,
    hopsLeft: number,
  ): Omit<ChromelessPath, "route">[] => {
    const found: Omit<ChromelessPath, "route">[] = [];
    for (const statement of ownReturns(component)) {
      for (const rendered of renderPaths(statement.expression)) {
        // A path rendering nothing but `<Redirect>` sends the user somewhere
        // else and never puts a screen on the glass, so there is nothing for an
        // Escape to sit on. DERIVED from the path's own shape, exactly as
        // `isRedirectStub` derives the file-level class — never a hand-kept list.
        if (rendered && rendered.kind !== ts.SyntaxKind.NullKeyword) {
          const tags = tagsIn(rendered);
          if (tags.size > 0 && [...tags].every((tag) => tag === "Redirect")) continue;
        }
        // `return null` and a bare `return` render a blank screen. That is the
        // same strand as a chrome-less body and a worse one to look at: there is
        // not even a title to explain it.
        if (!rendered) {
          found.push({ file, line: lineOf(file, statement), rendered: "return;" });
          continue;
        }
        if (rendered.kind === ts.SyntaxKind.NullKeyword) {
          found.push({ file, line: lineOf(file, statement), rendered: "return null" });
          continue;
        }
        if (pathReachesChrome(file, rendered, hopsLeft)) continue;
        // Report where the offending `return` is actually WRITTEN. A route file
        // is usually a three-line wrapper around the real screen
        // (`return <RoutinesHomeScreen />`), and blaming the wrapper sends the
        // reader to a file with nothing wrong in it. Re-attributed only when
        // the path hands the WHOLE screen to one component — a bare element,
        // no wrapper and no siblings — so a leaf like `BeforeAfterPair` inside
        // a larger tree is never blamed for its parent's missing chrome.
        const delegate = wholeScreenDelegate(file, rendered);
        if (delegate && hopsLeft > 0) {
          const deeper = chromelessIn(delegate.file, delegate.component, hopsLeft - 1);
          if (deeper.length > 0) {
            found.push(...deeper);
            continue;
          }
        }
        const tags = [...tagsIn(rendered)].slice(0, 4).join(", ");
        found.push({ file, line: lineOf(file, statement), rendered: tags || "(no elements)" });
      }
    }
    return found;
  };

  const chromeless: ChromelessPath[] = [];
  const unanalysable: string[] = [];

  for (const route of routes) {
    // Follow the re-export hop to wherever the screen is really written.
    let file = route;
    for (let hop = 0; hop < maxHops; hop += 1) {
      const target = defaultExportTarget(file);
      if (!target) break;
      file = target;
    }
    const component = defaultComponent(file);
    if (!component) {
      // Listed WHENEVER the component cannot be found, never only when the
      // coarse fallback also fails. Reporting it only in the second case would
      // let `export default memo(Screen)` opt a screen out of the branch walk
      // for good, as long as the file mentioned chrome somewhere - which is
      // this very ticket's defect, rebuilt inside the gate meant to close it.
      unanalysable.push(route);
      continue;
    }
    for (const finding of chromelessIn(file, component, maxHops))
      chromeless.push({ route, ...finding });
  }

  // One shared screen behind several routes is ONE defect to fix, so it is one
  // line to read. `route` keeps the first arrival, which is enough to navigate to.
  const seen = new Set<string>();
  const deduped = chromeless.filter((finding) => {
    const key = `${finding.file}:${finding.line}:${finding.rendered}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { chromeless: deduped, unanalysable };
}
