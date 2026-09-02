// test/analytics-shared-sql.test.ts
//
// The three aggregate reports in scripts/ are standalone files by design: the
// runner pipes each one through a single psql session, and `\i` cannot include
// anything because --local runs psql *inside* the Docker container where the
// repo does not exist. So the pieces they must agree on are duplicated, and
// this guard is what stops the duplicates drifting.
//
// ☠️ The expensive drift is `content_events`. Adding a new user-content table to
// analytics-engagement.sql but not analytics-segment.sql does not fail anything
// at runtime - the segment report just quietly counts fewer people as retained,
// which is the one number the whole Step-1 instrument is built to read (#1613).
import * as fs from "node:fs";
import * as path from "node:path";

const SCRIPTS_DIR = path.resolve(__dirname, "..", "scripts");

/** Which report files must carry each shared block. */
const EXPECTED_BLOCKS: Record<string, string[]> = {
  accounts: ["analytics-engagement.sql", "analytics-onboarding.sql", "analytics-segment.sql"],
  content_events: ["analytics-engagement.sql", "analytics-segment.sql"],
};

const START = /^-- >>> shared:([a-z_]+)$/;
const END = /^-- <<< shared:([a-z_]+)$/;

/** Extracts every `-- >>> shared:<name>` .. `-- <<< shared:<name>` body from one file. */
function extractBlocks(source: string, file: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const lines = source.split("\n");
  let open: { name: string; body: string[] } | null = null;

  for (const line of lines) {
    const start = START.exec(line);
    const end = END.exec(line);

    if (start) {
      if (open) throw new Error(`${file}: shared:${start[1]} opened inside shared:${open.name}`);
      open = { name: start[1], body: [] };
      continue;
    }
    if (end) {
      if (!open) throw new Error(`${file}: shared:${end[1]} closed but never opened`);
      if (open.name !== end[1]) {
        throw new Error(`${file}: shared:${open.name} closed by shared:${end[1]}`);
      }
      if (blocks.has(open.name)) throw new Error(`${file}: shared:${open.name} appears twice`);
      blocks.set(open.name, open.body.join("\n"));
      open = null;
      continue;
    }
    if (open) open.body.push(line);
  }

  if (open) throw new Error(`${file}: shared:${open.name} is never closed`);
  return blocks;
}

function reportFiles(): string[] {
  return fs
    .readdirSync(SCRIPTS_DIR)
    .filter((name) => /^analytics-.*\.sql$/.test(name))
    .sort();
}

const blocksByFile = new Map<string, Map<string, string>>();
for (const file of reportFiles()) {
  const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8");
  blocksByFile.set(file, extractBlocks(source, file));
}

describe("analytics report shared SQL blocks", () => {
  it("covers every analytics report file in scripts/", () => {
    // Guards the guard: a fourth report added without a shared block would
    // otherwise be invisible here.
    expect(reportFiles()).toEqual([
      "analytics-engagement.sql",
      "analytics-onboarding.sql",
      "analytics-segment.sql",
    ]);
  });

  for (const [name, expectedFiles] of Object.entries(EXPECTED_BLOCKS)) {
    describe(`shared:${name}`, () => {
      it(`is present in exactly ${expectedFiles.join(", ")}`, () => {
        const actual = [...blocksByFile.entries()]
          .filter(([, blocks]) => blocks.has(name))
          .map(([file]) => file)
          .sort();
        expect(actual).toEqual([...expectedFiles].sort());
      });

      it("is byte-identical across those files", () => {
        const [first, ...rest] = expectedFiles;
        const reference = blocksByFile.get(first)?.get(name);
        expect(typeof reference).toBe("string");
        for (const file of rest) {
          expect(`${file}\n${blocksByFile.get(file)?.get(name)}`).toBe(`${file}\n${reference}`);
        }
      });

      it("is not empty", () => {
        expect(blocksByFile.get(expectedFiles[0])?.get(name)?.trim().length).toBeGreaterThan(0);
      });
    });
  }

  it("declares no shared block that EXPECTED_BLOCKS does not know about", () => {
    const seen = new Set<string>();
    for (const blocks of blocksByFile.values()) {
      for (const name of blocks.keys()) seen.add(name);
    }
    expect([...seen].sort()).toEqual(Object.keys(EXPECTED_BLOCKS).sort());
  });
});

describe("analytics reports never read enabled_modules as an axis", () => {
  // #1672. `user_preferences.enabled_modules` gates nothing: every module's
  // tools sit on the tools grid whether or not the array lists them, the last
  // write hook went in the May 2026 dead-code sweep (059ae523), and what is
  // left is the column default (`['cbt']`) plus one write from the meditation
  // wizard. A report that unnests it is therefore reading a default and calling
  // it adoption - "cbt enabled 45 of 46" was the default, not a choice, and
  // gratitude read as "used but never enabled" by five people. Usage (a content
  // row) is the only adoption signal the schema carries; the reports count that.
  for (const file of reportFiles()) {
    it(`${file} does not unnest or filter on enabled_modules`, () => {
      const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8");
      const outsideComments = source
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .filter((line) => /enabled_modules/.test(line));
      expect(outsideComments).toEqual([]);
    });
  }
});

describe("analytics reports carry the account split", () => {
  // Part A of #1613. Guest accounts are minted one per tap of the landing CTA,
  // so a report that counts auth.users without splitting on is_anonymous starts
  // lying — silently — the day anonymous sign-ins are switched on.
  for (const file of reportFiles()) {
    it(`${file} splits its population by is_anonymous`, () => {
      const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8");
      expect(source).toContain("is_anonymous");
      expect(source).toContain("'=== 0) Population split");
    });

    it(`${file} reads auth.users only through the accounts view`, () => {
      const source = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8");
      // The one permitted mention is inside the shared accounts block.
      const outside = source
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .filter((line) => /auth\.users/.test(line));
      expect(outside).toEqual(["  from auth.users;"]);
    });
  }
});
