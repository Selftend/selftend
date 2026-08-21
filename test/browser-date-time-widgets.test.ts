import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

/**
 * #1175 owner ruling: on web, a browser date or time widget must never appear.
 *
 * The widgets the browser gives you for `<input type="date">` and
 * `<input type="time">` are unthemed, unlocalised, and - measured on #1205 -
 * effectively unusable to a screen reader before activation: the date field we
 * shipped was a 1x1px `aria-hidden` handle poked open with `showPicker()`, so
 * there was never an accessible input there at all. Date and time entry now
 * goes through the shared picker sheet (`ThemedCalendar` for dates, the typed
 * `HH:MM` control for times), which we own, theme, translate, and can make
 * accessible.
 *
 * Native is deliberately NOT in scope: iOS and Android keep their OS pickers,
 * which are good. The rule is about browser widgets in app source.
 *
 * This suite DERIVES its file list from source rather than pinning it, so a
 * newly added browser widget fails CI here instead of quietly shipping. It
 * carries no allowlist on purpose - the baseline is clean by construction, so
 * unlike the sibling `modal-web-unmount` gate there is nothing to exempt, and
 * an empty allowlist is just a hole waiting for its first entry. If a
 * legitimate non-DOM `{ type: "date" }` ever trips it, that is a conversation
 * worth having, not a line to append.
 *
 * ⚠️ It matches SPELLINGS, not semantics, and a determined evasion beats it:
 * `type={variable}`, a template literal, a ternary, or `setAttribute("type",
 * "date")` all pass. That is the accepted trade for a matcher a contributor can
 * read. It is aimed at the widget someone reaches for by habit, not at someone
 * routing around a rule they have read.
 */

const ROOT = join(__dirname, "..");

/** The `<input type="...">` values that summon a browser date/time widget. */
const BROWSER_WIDGET_TYPES = ["date", "time", "datetime-local", "month", "week"];

/**
 * `type` set to one of those, in either shape this repo has actually shipped:
 * the JSX attribute (`type="time"`, and its `type={"time"}` spelling) and the
 * props-object key (`type: "date"`, which is how the goal date field wrote it
 * inside `React.createElement("input", { ... })`).
 *
 * The second shape is the one that matters: the date widget this guard exists
 * to keep out was a `createElement` props object, so a matcher written only for
 * the JSX spelling would have missed the real offender while looking like
 * coverage.
 *
 * The optional `["']` after `type` admits a quoted object key (`"type": "date"`).
 * `\s` spans newlines, so an attribute broken across lines still matches.
 */
const BROWSER_WIDGET_TYPE = new RegExp(
  String.raw`\btype["']?\s*[:=]\s*\{?\s*["'](?:${BROWSER_WIDGET_TYPES.join("|")})["']`,
);

/**
 * `showPicker` being CALLED - the DOM call that opens the browser popup by hand.
 *
 * More than the plain `showPicker(` the ticket named, because mutation-testing
 * this guard caught `type: "time"` in a probe file while walking straight past
 * `el.showPicker?.()` on the line above it: an optional call puts `?.` between
 * the name and the paren. `\b` already covers the `el.showPicker()` member form,
 * so the arms here are the optional call and the computed access.
 *
 * ⚠️ Matching a CALL, not a mention. An earlier revision had a `\.\s*showPicker\b`
 * arm to catch aliasing, and it made `store.showPicker` and `props.showPicker`
 * findings - a Zustand selector, which AGENTS.md names as this repo's local-state
 * default. With no allowlist here, that false positive would hard-block CI on
 * innocent code, which is how guards get deleted. Aliasing (`const open =
 * el.showPicker`) is the accepted miss; the feature test the goal date field
 * shipped still matches, because that line calls it too:
 *
 *   if (typeof el.showPicker === "function") el.showPicker();
 *
 * The one false positive left is a local opener literally named `showPicker`.
 * That spelling is reserved by the ticket, so name yours `openPicker`.
 */
const SHOW_PICKER = /\bshowPicker\s*(?:\?\.)?\s*\(|\[\s*["']showPicker["']\s*\]\s*(?:\?\.)?\s*\(/;

const PATTERNS = [BROWSER_WIDGET_TYPE, SHOW_PICKER];

/** What a contributor should do instead. Printed with any failure. */
const GUIDANCE = [
  "A browser date or time widget reached app source (#1175).",
  "",
  "Use the shared picker sheet instead:",
  '  - dates     -> <PickerSheet> around <ThemedCalendar mode="date">',
  '  - date+time -> <ThemedCalendar mode="datetime">',
  "  - times     -> <TimeField>, which types HH:MM on web and keeps the OS picker on native",
  "",
  "Native keeps its OS pickers; this rule is about browser widgets on web.",
  "",
  "Offending lines:",
].join("\n");

/**
 * Line numbers in `source` that summon a browser widget, ascending, ignoring
 * prose. String literals are KEPT - `"date"` lives inside one, so blanking
 * strings would erase the very thing being looked for.
 *
 * Matched over the whole source rather than line by line, so an attribute
 * broken across lines is caught (`\s` spans newlines) and still reported at the
 * line its match STARTS on. A per-line pass could only have reported such a
 * match as "somewhere in this file", and would have dropped it entirely
 * whenever the same file also held a single-line offender.
 */
function offendingLines(source: string): number[] {
  const code = stripComments(source);

  // `stripComments` blanks with spaces and preserves newlines, so offsets into
  // `code` are offsets into `source`.
  const lineOf = (index: number) => {
    let line = 1;
    for (let i = 0; i < index; i += 1) if (code[i] === "\n") line += 1;
    return line;
  };

  const hits = new Set<number>();
  for (const pattern of PATTERNS) {
    for (const match of code.matchAll(new RegExp(pattern.source, "g"))) {
      hits.add(lineOf(match.index));
    }
  }

  return [...hits].sort((a, b) => a - b);
}

const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

const offenders = files.flatMap((file) => {
  const source = readFileSync(join(ROOT, file), "utf8");
  const raw = source.split("\n");

  return offendingLines(source).map((line) => `  ${file}:${line}: ${raw[line - 1].trim()}`);
});

describe("no browser date or time widget in app source (#1175)", () => {
  it("scans both src/ and app/ (canary: the walk still finds known files)", () => {
    // If the walk rots, `files` goes empty and the guard below passes
    // vacuously. `app/` is asserted separately because grepping only `src/` has
    // produced false "no callers" conclusions in this repo before - the router
    // tree is real source.
    expect(files).toContain("src/components/app/time-field.tsx");
    expect(files).toContain("app/_layout.tsx");
  });

  it("still detects every widget shape we have actually shipped (canary)", () => {
    // Verbatim from the two files that held browser widgets until #1299/#1300
    // removed them. A matcher that stops matching these passes vacuously and is
    // worse than no guard, because it looks like coverage.
    const shippedTimeInput =
      '      <input\n        type="time"\n        aria-label={accessibilityLabel}\n';
    const shippedDateInput =
      '      {React.createElement("input", {\n        type: "date",\n        ref: inputRef,\n';
    const shippedShowPicker = '    if (typeof el.showPicker === "function") el.showPicker();\n';

    expect(offendingLines(shippedTimeInput)).toEqual([2]);
    expect(offendingLines(shippedDateInput)).toEqual([2]);
    expect(offendingLines(shippedShowPicker)).toEqual([1]);
  });

  it("also detects the sibling browser date widgets", () => {
    // Same ruling, same widgets - a contributor reaching for `datetime-local`
    // rather than `date` is not a different case.
    expect(offendingLines('<input type="datetime-local" />')).toEqual([1]);
    expect(offendingLines('<input type="month" />')).toEqual([1]);
    expect(offendingLines('<input type="week" />')).toEqual([1]);
    expect(offendingLines('<input type={"date"} />')).toEqual([1]);
  });

  it("catches the showPicker calls that are not a plain call", () => {
    // Found by mutating this guard: it reported `type: "time"` two lines below
    // `el.showPicker?.()` and said nothing about the call. A member call, an
    // optional call, a feature test and a computed call are the same DOM API.
    expect(offendingLines("el.showPicker();")).toEqual([1]);
    expect(offendingLines("el.showPicker?.();")).toEqual([1]);
    expect(offendingLines('if (typeof el.showPicker === "function") el.showPicker();')).toEqual([
      1,
    ]);
    expect(offendingLines('el["showPicker"]();')).toEqual([1]);
  });

  it("leaves a boolean named showPicker alone, however it is reached", () => {
    // A guard that fails on this teaches people to delete guards. `showPicker`
    // as state is reasonable in an app full of picker sheets, and only the DOM
    // API's CALL shapes are forbidden - reading the value is not a call.
    //
    // The last two are why: an earlier revision matched any `.showPicker`
    // member access, which made a Zustand selector and a prop read into CI
    // failures on innocent code. Review caught it; these pin it.
    expect(offendingLines("const [showPicker, setShowPicker] = useState(false);")).toEqual([]);
    expect(offendingLines("setShowPicker(true);")).toEqual([]);
    expect(offendingLines("{showPicker ? <PickerSheet /> : null}")).toEqual([]);
    expect(offendingLines("const open = useSheetStore((s) => s.showPicker);")).toEqual([]);
    expect(offendingLines("{props.showPicker && <PickerSheet />}")).toEqual([]);
  });

  it("catches a quoted object key", () => {
    expect(offendingLines('{ "type": "date" }')).toEqual([1]);
  });

  it("reports every offender in a file, ascending and deduplicated", () => {
    // The previous per-line implementation dropped a cross-line match whenever
    // the same file also held a single-line one, so the second offender was
    // invisible on an already-red file - the kind of gap you only find by
    // reading the output rather than the exit code.
    const both = '<input\n  type=\n    "date"\n/>\nel.showPicker();\n<input type="time" />';

    expect(offendingLines(both)).toEqual([2, 5, 6]);
    // One line matching both patterns is still one entry.
    expect(offendingLines('<input type="date" onFocus={() => el.showPicker()} />')).toEqual([1]);
  });

  it("catches an attribute broken across lines, at the line it starts on", () => {
    // A per-line pass could not see this at all. Matching over the whole source
    // both catches it and keeps a usable location.
    expect(offendingLines('<input\n  type=\n    "date"\n/>')).toEqual([2]);
  });

  it("ignores prose, so notes about the retired approach do not trip it", () => {
    const commented = [
      '// The browser\'s own <input type="time"> is unthemed and untranslated.',
      "/* We used to call el.showPicker() here. */",
      '/**\n * Replaced React.createElement("input", { type: "date" }).\n */',
    ].join("\n");

    expect(offendingLines(commented)).toEqual([]);
  });

  it("proves comment-stripping on real source, not only on a fixture", () => {
    // time-field.tsx's docblock explains why the browser time input went away,
    // and names it. That mention is the live proof that stripping is doing
    // work: without it, this file would be a finding.
    //
    // If you reworded that docblock, point this at another comment that names a
    // browser widget - do not delete the assertion, or the fixture above
    // becomes the only thing standing between prose and a false failure.
    const path = "src/components/app/time-field.tsx";
    const source = readFileSync(join(ROOT, path), "utf8");

    expect(source).toContain('<input type="time">');
    expect(offendingLines(source)).toEqual([]);
  });

  it("no app source summons a browser date or time widget", () => {
    const report = offenders.length === 0 ? "" : [GUIDANCE, ...offenders].join("\n");

    expect(report).toBe("");
  });
});
