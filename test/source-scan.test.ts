import { stripComments, stripCommentsAndStrings } from "@/test/source-scan";

// The scanner behind the repo-wide static gates (test/accent-ink-call-sites.test.ts,
// test/accent-ink-coverage.test.ts, test/color-scheme-driver.test.ts). Those
// suites fail CI on a pattern appearing in source, so a scanner that mis-parses
// is not a cosmetic problem: it either hides a real finding or invents a fake
// one. The template-literal cases below are the ones that actually bit (#412).
//
// Source snippets are written as ordinary quoted strings rather than template
// literals, so the fixtures are not themselves subject to the parsing this
// suite is pinning down.

describe("stripComments keeps class names and drops prose", () => {
  it("keeps class names, which live in string literals", () => {
    expect(stripComments('const a = "text-be";')).toContain("text-be");
  });

  it("blanks a line comment that names a class", () => {
    expect(stripComments("// use text-be here\nconst a = 1;")).not.toContain("text-be");
  });

  it("blanks a block comment that names a class", () => {
    expect(stripComments("/* text-be */ const a = 1;")).not.toContain("text-be");
  });

  it("does not let a // inside a string start a comment", () => {
    // Without string tracking the URL's slashes would blank the rest of the line.
    const source = 'const url = "https://example.com"; const a = "text-be";';
    expect(stripComments(source)).toContain("text-be");
  });

  it("preserves offsets so line numbers stay accurate", () => {
    const source = "// one\n// two\nconst a = 1;";
    expect(stripComments(source).split("\n")).toHaveLength(3);
  });
});

describe("stripComments tracks template interpolations (#412)", () => {
  // The bug: the scanner broke out of the template at `${` and never returned,
  // so the template's *closing* backtick was read as an opening one. Everything
  // up to the next backtick was then treated as template body - and prose in
  // that span stopped being recognised as a comment.
  it("still blanks a comment that follows an interpolated template", () => {
    const source = ["const cls = `size-${n}`;", "// not text-be here", "const a = 1;"].join("\n");

    expect(stripComments(source)).not.toContain("text-be");
  });

  it("blanks a comment whose own backticks would resync a mis-parse", () => {
    // The exact shape that surfaced mood's comment as a call site: backticks
    // inside the comment flip parity back, so the mis-parse looks self-healing
    // while having already swallowed the `//`.
    const source = [
      "const cls = `size-${n}`;",
      "// Accent ink, not `text-be` (#368): the selected chip stacks",
      "const a = 1;",
    ].join("\n");

    expect(stripComments(source)).not.toContain("text-be");
  });

  it("keeps a real class name that follows an interpolated template", () => {
    const source = ["const cls = `size-${n}`;", 'const a = "text-be";'].join("\n");

    expect(stripComments(source)).toContain("text-be");
  });

  it("does not let an object literal inside an interpolation close it early", () => {
    const source = ["const cls = `a${fn({ x: 1 })}b`;", "// not text-be here"].join("\n");

    expect(stripComments(source)).not.toContain("text-be");
  });

  it("handles a template nested inside an interpolation", () => {
    const source = ["const cls = `a${cn(`b${x}c`)}d`;", "// not text-be here"].join("\n");

    expect(stripComments(source)).not.toContain("text-be");
  });

  it("handles several interpolations in one template", () => {
    const source = ["const cls = `${a} ${b} ${c}`;", "// not text-be here"].join("\n");

    expect(stripComments(source)).not.toContain("text-be");
  });

  it("sees code inside an interpolation", () => {
    expect(stripComments("const cls = `x${useRoomStyle()}y`;")).toContain("useRoomStyle");
  });
});

describe("stripCommentsAndStrings drops string contents too", () => {
  it("blanks a class name in a string, keeping code visible", () => {
    const stripped = stripCommentsAndStrings('const a = "text-be"; useRoomStyle();');

    expect(stripped).not.toContain("text-be");
    expect(stripped).toContain("useRoomStyle");
  });

  it("keeps code inside an interpolation while blanking the template body", () => {
    const stripped = stripCommentsAndStrings("const a = `text-be ${useRoomStyle()}`;");

    expect(stripped).not.toContain("text-be");
    expect(stripped).toContain("useRoomStyle");
  });

  it("does not swallow code after an interpolated template", () => {
    // The blankStrings half of the same bug: the code following the template
    // was treated as template body and blanked away, hiding it from the gate.
    const stripped = stripCommentsAndStrings("const a = `x${n}`; useRoomStyle();");

    expect(stripped).toContain("useRoomStyle");
  });
});
