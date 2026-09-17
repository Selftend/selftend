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

const ALL_REPORTS = [
  "analytics-engagement.sql",
  "analytics-onboarding.sql",
  "analytics-segment.sql",
];

/** Which report files must carry each shared block. */
const EXPECTED_BLOCKS: Record<string, string[]> = {
  accounts: ALL_REPORTS,
  content_events: ["analytics-engagement.sql", "analytics-segment.sql"],
  // k=5 cell suppression governs all three reports, not just the segment one
  // where it was first implemented (#2373, docs/analytics.md).
  k_suppression: ALL_REPORTS,
  // Route 1 of docs/analytics.md, "What the floor does not guarantee": the
  // caveat that a suppressed cell in an exhaustively printed partition is
  // bounded by subtraction from a raw total printed elsewhere in the same
  // report. Two files, not three - analytics-engagement.sql has no section
  // whose arms partition a population, and printing a partition warning beside
  // a table that has no partitioned arms would add one more false statement to
  // a file family whose comments have already asserted the opposite twice
  // (#2556).
  partition_caveat: ["analytics-onboarding.sql", "analytics-segment.sql"],
  // Route 2 of the same section: the digest republishes these tables monthly,
  // and a cell suppressed in one publication and printed in a later one
  // discloses the MOVEMENT between them. ☠️ All three files, and printed ONCE
  // PER REPORT rather than beside a section - unlike partition_caveat, whose
  // census names three sections, every suppressed cell in all three reports is
  // series-exposed, so there is nothing to exempt and no list to keep (#2557).
  series_caveat: ALL_REPORTS,
  // Who is in the population: the owner count, the heuristic upper bound, and
  // the standing line that the guest arm is not identifiable at all. Printed by
  // each report separately and deliberately - every report runs independently,
  // so a surviving one must carry its own population statement.
  population_provenance: ALL_REPORTS,
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

/** The report's SQL lines matching `pattern`, with whole-line `--` comments left out. */
function sqlLinesMatching(file: string, pattern: RegExp): string[] {
  return fs
    .readFileSync(path.join(SCRIPTS_DIR, file), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .filter((line) => pattern.test(line));
}

describe("analytics reports never read enabled_modules as an axis", () => {
  // #1672. `user_preferences.enabled_modules` gates nothing, so a report that
  // unnests it reads the column default and calls it adoption; usage (a content
  // row) is the only adoption signal the schema carries. The history is in
  // docs/analytics.md, under the engagement report.
  for (const file of reportFiles()) {
    it(`${file} does not unnest or filter on enabled_modules`, () => {
      expect(sqlLinesMatching(file, /enabled_modules/)).toEqual([]);
    });
  }
});

describe("analytics reports never read widget_preferences", () => {
  // ☠️ #2376. `widget_preferences` fails the same test `enabled_modules` failed:
  // the current app neither reads nor seeds it (#1958). ⚠️ And it is NOT frozen
  // residue, which would be the safer failure - pre-Favourites native builds
  // still write it, so a section over it prints LIVE data about a removed
  // feature as though it were current behaviour. Favourites is the live
  // successor and took the slot.
  for (const file of reportFiles()) {
    it(`${file} does not read widget_preferences`, () => {
      expect(sqlLinesMatching(file, /widget_preferences/)).toEqual([]);
    });
  }

  it("reads the live successor instead", () => {
    // Guards the guard: deleting the section satisfies the ban just as well as
    // replacing it, and that is the other way to lose the measurement.
    expect(
      sqlLinesMatching("analytics-onboarding.sql", /public\.favorites/).length,
    ).toBeGreaterThan(0);
  });
});

describe("the onboarding report keeps completion and conversion apart", () => {
  // #2376. `CONTEXT.md` reserves CONVERSION for guest -> registered. This report
  // used the same word for finishing the introduction, which is a different
  // funnel step - and it is the one report that now measures both, so the two
  // words have to stay on their own sections.
  const source = fs.readFileSync(path.join(SCRIPTS_DIR, "analytics-onboarding.sql"), "utf8");
  const heading = (n: number) =>
    source.split("\n").find((line) => line.startsWith(`\\echo '=== ${n})`)) ?? "";

  it("calls finishing the introduction completion", () => {
    expect(heading(2)).toContain("completion");
    expect(heading(2).toLowerCase()).not.toContain("conversion");
  });

  it("keeps the word conversion for guest to registered", () => {
    expect(heading(4)).toContain("Guest-to-registered conversion");
  });
});

describe("analytics reports never read notifications_enabled_global", () => {
  // ☠️ #2375, and it is the `enabled_modules` mistake (#1672) waiting to happen
  // on a newer column. `notifications_enabled_global` DEFAULTS TO TRUE and is
  // true for very nearly everyone, so a report that counted it would measure a
  // default and call it adoption. `reminder_consent` defaults to FALSE and is
  // set only by someone choosing it - it is the column that varies, and the one
  // that evidences the quiet-by-default guardrail actually holding.
  //
  // Reminder adoption is the section most at risk of being "improved" into
  // uselessness by a later reader who notices the consent number is small and
  // the global number is big, and swaps one for the other. This is what stops
  // that being a convention someone has to remember.
  for (const file of reportFiles()) {
    it(`${file} does not read notifications_enabled_global`, () => {
      expect(sqlLinesMatching(file, /notifications_enabled_global/)).toEqual([]);
    });
  }

  it("still reads the column that does vary", () => {
    // Guards the guard: the ban above is satisfied just as well by reporting no
    // reminder figure at all, which is the other way to lose this measurement.
    expect(sqlLinesMatching("analytics-engagement.sql", /reminder_consent/).length).toBeGreaterThan(
      0,
    );
  });
});

describe("analytics reports never cohort by initial_concerns", () => {
  // ☠️ #2377, and it is the third instance of one failure. `enabled_modules`
  // (#1672) gates nothing; `notifications_enabled_global` (#2375) defaults to
  // true; and `initial_concerns` was MEASURED (#2365) to have never held a value
  // for a single account, ever - the migration that added it and the commit that
  // removed the code writing it both shipped in tag v0.18.0, so it reached users
  // in the very build that stopped asking.
  //
  // ⚠️ What it cost was worse than an unreadable table. The segment report
  // cohorted W4 retention by this column, every account landed in its `unknown`
  // arm, and the gate - which counts retention across the whole population and
  // knows nothing about arms - could open anyway and declare the cross-tab
  // readable over an empty table. A false green, where an unreachable gate would
  // at least have been honestly silent.
  //
  // The column is deliberately KEPT: dropping it changes nothing observable and
  // would cost an INTENTIONALLY_DROPPED entry in the export gate. So nothing in
  // the schema stops a later reader reaching for it again, and the corrected
  // schema comment is only a comment. This is what stops it.
  for (const file of reportFiles()) {
    it(`${file} does not read initial_concerns`, () => {
      expect(sqlLinesMatching(file, /initial_concerns/)).toEqual([]);
    });
  }

  it("cohorts the segment report by the two axes that do carry values", () => {
    // Guards the guard: the ban above is satisfied just as well by a report with
    // no cross-tab left in it, which is the other way to lose the instrument
    // docs/positioning.md's segment slot is waiting on. Locale and module usage
    // are what replaced the concern arms (#2377).
    const segment = "analytics-segment.sql";
    expect(sqlLinesMatching(segment, /p\.language in/).length).toBeGreaterThan(0);
    expect(sqlLinesMatching(segment, /from module_labels/).length).toBeGreaterThan(0);
  });

  it("checks axis coverage before it prints either ordering", () => {
    // ☠️ The precondition #2377 added, pinned statically as well as behaviourally
    // (test/integration/analytics-reports.integration.test.ts runs the false-green
    // case). Both orderings must be gated: gating one and forgetting the other is
    // the shape this catches, and it is invisible in a report whose other axis
    // happens to be covered.
    const gated = sqlLinesMatching("analytics-segment.sql", /from axis_coverage ac where ac\.axis/);
    expect(gated).toHaveLength(2);
  });
});

describe("k=5 cell suppression is defined once, for all three reports", () => {
  // #2373. The rule used to live in analytics-segment.sql alone, so the other
  // two reports printed raw counts and nothing said so. A second definition
  // anywhere is how they would drift apart again.
  for (const file of reportFiles()) {
    it(`${file} defines k_count and k_pct only inside shared:k_suppression`, () => {
      const shared = blocksByFile.get(file)?.get("k_suppression") ?? "";
      expect(shared).toContain("create function pg_temp.k_count");
      expect(shared).toContain("create function pg_temp.k_pct");

      const outsideTheBlock = fs
        .readFileSync(path.join(SCRIPTS_DIR, file), "utf8")
        .replace(shared, "");
      expect(outsideTheBlock).not.toContain("create function pg_temp.k_");
    });

    it(`${file} puts its slicing cells through the helpers`, () => {
      // Not a count of call sites - that would go stale on every edit - but the
      // claim that every report actually suppresses something. A report with
      // the block and no call site is the failure mode this catches: the
      // helpers present, the cells still raw.
      expect(sqlLinesMatching(file, /pg_temp\.k_(count|pct)\(/).length).toBeGreaterThan(0);
    });
  }
});

describe("every section that claims a partition prints the partition caveat", () => {
  // ☠️ #2556. No `shared:` marker covers the CALL SITES, and that is the
  // plumbing that drifts silently: a file can carry the block, pass every check
  // above, and never print a word of it. The census is deliberately NOT kept
  // here - route 1 is a structural test a section classifies itself against
  // (docs/analytics.md, "What the floor does not guarantee") - so this reads the
  // section's own printed claim instead. A section that tells a reader its arms
  // partition a population has to tell them what that costs.
  //
  // ⚠️ It is a tripwire on the section's printed CLAIM, not a proof: a
  // qualifying section that never tells its reader the arms partition anything
  // is not caught here, and nothing static can catch it - that is what makes
  // route 1 a structural test a human applies. What this does catch is the
  // likely drift, a partition section added or reworded beside the caveat.
  const CAVEAT_ECHO = "\\echo :partition_caveat";

  /** The phrasings the three qualifying sections use today, in their own words. */
  const A_PARTITION_CLAIM = /partition|appears exactly once|is in exactly one/;

  /** The printed sections of one report: each `=== n)` heading with its body. */
  function printedSections(file: string): string[] {
    const lines = fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8").split("\n");
    const sections: string[][] = [];
    for (const line of lines) {
      if (/^\\echo '=== /.test(line)) sections.push([]);
      if (sections.length > 0) sections[sections.length - 1].push(line);
    }
    return sections.map((body) => body.join("\n"));
  }

  /** Printed lines only: a `--` comment saying "partition" claims nothing to a reader. */
  const claimsAPartition = (body: string) =>
    body
      .split("\n")
      .filter((line) => line.startsWith("\\echo") && line !== CAVEAT_ECHO)
      .some((line) => A_PARTITION_CLAIM.test(line));

  for (const file of reportFiles()) {
    it(`${file}: every section claiming a partition echoes the caveat`, () => {
      const offenders = printedSections(file)
        .filter(claimsAPartition)
        .filter((body) => !body.includes(CAVEAT_ECHO))
        .map((body) => body.split("\n")[0]);
      expect(offenders).toEqual([]);
    });

    if (EXPECTED_BLOCKS.partition_caveat.includes(file)) {
      it(`${file} prints the caveat it carries`, () => {
        // The other half: a block defined and never echoed is a caveat nobody
        // reads, and every check above is satisfied by it.
        const printed = printedSections(file).filter((body) => body.includes(CAVEAT_ECHO));
        expect(printed.length).toBeGreaterThan(0);
      });
    } else {
      it(`${file} never echoes a caveat it does not define`, () => {
        // Without the block the variable is unset, and psql prints its name.
        expect(fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8")).not.toContain(CAVEAT_ECHO);
      });
    }
  }
});

describe("the series caveat prints once per report, ahead of every table", () => {
  // ☠️ #2557. The two caveats differ in SHAPE, not just in wording, and the
  // difference is the whole census: route 1 names three qualifying sections, so
  // its caveat is echoed per section; route 2 has nothing to exempt, because
  // every suppressed cell in all three reports can move between publications.
  // A series caveat that drifted into a per-section echo would say, by
  // repetition, that some sections are exposed and others are not.
  const SERIES_NOTE = "THE SERIES IS THE RELEASE, NOT EACH COMMENT";
  const A_SECTION_HEADING = /^\\echo '=== /m;

  /** The line that prints the note, wherever it sits. */
  const printedNote = (source: string) =>
    source.split("\n").filter((line) => line.startsWith("\\echo") && line.includes(SERIES_NOTE));

  for (const file of reportFiles()) {
    const source = () => fs.readFileSync(path.join(SCRIPTS_DIR, file), "utf8");

    it(`${file} prints it exactly once`, () => {
      expect(printedNote(source())).toHaveLength(1);
    });

    it(`${file} prints it before its first section, under no heading of its own`, () => {
      // ⚠️ A note qualifying every table has to arrive before them - the digest
      // comment is read top to bottom. And it must not trail the population
      // block: by the section-slicing every helper here uses, a line after a
      // `=== ` heading BELONGS to that heading, which would attach a note about
      // suppression to the one block exempt from the rule.
      const text = source();
      const firstHeading = text.search(A_SECTION_HEADING);
      expect(firstHeading).toBeGreaterThan(-1);
      const [note] = printedNote(text);
      expect(note).toBeDefined();
      expect(text.indexOf(note)).toBeLessThan(firstHeading);
    });
  }

  it("says the same thing the document says", () => {
    // ☠️ The one pairing the byte-identity gate cannot see. It compares the
    // three SQL copies to each other, so all three can agree and still
    // contradict docs/analytics.md - and the reports exist precisely because
    // the document does not travel with the table. Pinned on the discriminator,
    // which is the sentence a reader acts on.
    const doc = fs.readFileSync(path.resolve(__dirname, "..", "docs", "analytics.md"), "utf8");
    const block = blocksByFile.get("analytics-segment.sql")?.get("series_caveat") ?? "";

    expect(doc).toContain("the series is the release");
    expect(doc).toContain("nothing suppressed in these reports is immutable");
    expect(block).toContain("THE SERIES IS THE RELEASE");
    expect(block).toContain("nothing suppressed in these reports is immutable");
  });
});

describe("an email address never leaves the database", () => {
  // ☠️ #2373 put `email` on the shared `accounts` view so the provenance block
  // can classify an address without a second read of auth.users. Nothing about
  // that view stops a later section selecting the column into a printed row,
  // and every report is aggregate-only by policy: "no per-user rows, no user
  // ids, no emails" (docs/analytics.md, and the header of all three files).
  // So the column is confined to the two blocks that have a reason to hold it.
  const ALLOWED_BLOCKS = ["accounts", "population_provenance"];

  for (const file of reportFiles()) {
    it(`${file} mentions email only inside ${ALLOWED_BLOCKS.join(" and ")}`, () => {
      const blocks = blocksByFile.get(file);
      const allowed = ALLOWED_BLOCKS.map((name) => blocks?.get(name) ?? "").join("\n");
      const allowedLines = new Set(
        allowed
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line !== ""),
      );

      const offenders = sqlLinesMatching(file, /\bemail\b/).filter(
        (line) => !allowedLines.has(line.trim()),
      );
      expect(offenders).toEqual([]);
    });
  }
});

describe("the population-provenance block is exempt from k=5, with both reasons recorded", () => {
  // ☠️ #2373. This block counts the project's OWN accounts and prints an upper
  // bound, so both rationales behind k=5 are void here - one does not apply,
  // the other is inverted. Suppressing it would hide the number precisely as
  // cleanup succeeded and it finally became good news, leaving a reader unable
  // to tell "almost none" from "withheld".
  const block = blocksByFile.get("analytics-engagement.sql")?.get("population_provenance") ?? "";
  const sql = block
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  it("prints raw counts, never suppressed ones", () => {
    expect(sql).toContain("count(*) filter (where p.owner_address)");
    expect(sql).not.toContain("pg_temp.k_");
  });

  it("records both reasons for the exemption beside it", () => {
    expect(block).toContain("EXEMPT FROM THE k=5 RULE");
    expect(block).toContain("PROJECT'S OWN accounts");
    expect(block).toContain("upper bound is already the anti-false-precision form");
  });

  it("labels the wider count as a bound and never as a point estimate", () => {
    expect(block).toContain("AN UPPER BOUND, never a point estimate");
  });

  it("states that the guest arm cannot be identified at all", () => {
    expect(block).toContain("NOT IDENTIFIABLE AT ALL");
    expect(block).toContain("no email");
  });
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

    it(`${file} reads its account source only through the accounts view`, () => {
      // The one permitted mention is inside the shared accounts block.
      expect(sqlLinesMatching(file, /digest_auth_users/)).toEqual([
        "  from public.digest_auth_users;",
      ]);
    });

    it(`${file} never reaches into the auth schema directly`, () => {
      // ☠️ #2393. The reports used to read `auth.users` here, and this guard
      // asserted it appeared on exactly one code line. It still asserts exactly
      // one read, of the view that replaced it - but the ORIGINAL property has
      // to be kept too, or the rename would trade a real control for a cosmetic
      // one.
      //
      // Two reasons the auth schema stays out of these files entirely:
      //
      //   * the digest's role CANNOT read it. The schema is owned by
      //     `supabase_admin` and `postgres` holds USAGE without grant option, so
      //     no grant can give a new role access. A report that reached into auth
      //     would simply fail on the monthly run - and only there, since every
      //     local and CI run is `postgres`, which can.
      //   * the views expose four columns and two columns. `auth.users` also
      //     holds `encrypted_password`, `confirmation_token` and `recovery_token`,
      //     and this report family's whole output is posted into a GitHub comment.
      expect(sqlLinesMatching(file, /\bauth\.\w+/)).toEqual([]);
    });
  }
});
