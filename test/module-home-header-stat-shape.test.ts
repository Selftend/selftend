import fs from "node:fs";
import path from "node:path";

import { sourceFiles, stripComments } from "./source-scan";

const ROOT = path.resolve(__dirname, "..");

// ModuleHomeHeader renders a stat's value in foreground ink and its label in
// muted ink. Passing `count` to a translated value joins the two pieces before
// they reach that contract, producing both mixed typography and unpluralised
// labels when a later caller falls back to a flat noun (#749).
test("counted header stats keep the number out of the translated value", () => {
  const offenders: string[] = [];
  const translatedCountValue = /value\s*:\s*t\(\s*[^,]+,\s*\{[^{}]*\bcount\s*:/g;

  for (const file of sourceFiles(ROOT, { dirs: ["app", "src"] })) {
    const source = stripComments(fs.readFileSync(path.join(ROOT, file), "utf8"));
    if (translatedCountValue.test(source)) offenders.push(file);
    translatedCountValue.lastIndex = 0;
  }

  expect(offenders).toEqual([]);
});
