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
 * carries no allowlist on purpose - the ruling is absolute, and every entry in
 * an allowlist is a hole. If a legitimate non-DOM `{ type: "date" }` ever trips
 * it, that is a conversation worth having, not a line to append.
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
 * `\s` spans newlines, so an attribute broken across lines still matches.
 */
const BROWSER_WIDGET_TYPE = new RegExp(
  String.raw`\btype\s*[:=]\s*\{?\s*["'](?:${BROWSER_WIDGET_TYPES.join("|")})["']`,
);

/** `showPicker(` - the DOM call that opens the browser popup by hand. */
const SHOW_PICKER = /\bshowPicker\s*\(/;

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
 * Lines of `source` that summon a browser widget, ignoring prose. String
 * literals are KEPT - `"date"` lives inside one, so blanking strings would
 * erase the very thing being looked for.
 */
function offendingLines(source: string): number[] {
  const code = stripComments(source);

  // Whole-source first, so an attribute split across lines is still caught even
  // though the per-line pass below cannot see it.
  if (!PATTERNS.some((pattern) => pattern.test(code))) return [];

  const lines = code
    .split("\n")
    .flatMap((line, index) => (PATTERNS.some((pattern) => pattern.test(line)) ? [index + 1] : []));

  // A match spanning lines leaves no single offending line; report the file.
  return lines.length > 0 ? lines : [0];
}

const files = sourceFiles(ROOT, { dirs: ["src", "app"] });

const offenders = files.flatMap((file) => {
  const source = readFileSync(join(ROOT, file), "utf8");
  const raw = source.split("\n");

  return offendingLines(source).map((line) =>
    line === 0 ? `  ${file}` : `  ${file}:${line}: ${raw[line - 1].trim()}`,
  );
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

  it("catches an attribute broken across lines", () => {
    // The per-line pass cannot see this one; the whole-source pass can, and
    // reports the file rather than a line.
    expect(offendingLines('<input\n  type=\n    "date"\n/>')).toEqual([0]);
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
