import fs from "fs";
import path from "path";

/**
 * `README.md` describes the DBT module by what ships (#2210).
 *
 * The repository front page said the module "adds an overview of that approach,
 * not a set of exercises" while the same delta shipped 22 DBT routes, seven
 * owner-scoped tables, six record types with create and edit screens, a guided
 * muscle-relaxation session and a four-phase programme reachable from Home. The
 * sentence was true when written and falsified later inside the same delta;
 * nothing walked it back, and `positioning-copy` — the only gate that reads the
 * README — is a banned-phrase scanner that cannot see a sentence contradicting
 * the code.
 *
 * ☠️ The ground truth is the code, not a number in prose: the module has
 * persisted records if `src/features/dbt/queries/` holds query modules. While
 * it does, the README may not describe DBT as an overview, a roadmap item or a
 * module without exercises, and its DBT sentence has to name at least the
 * coping plan and the programme.
 */
const ROOT = path.resolve(__dirname, "..");
const README = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");

const QUERY_MODULES = fs
  .readdirSync(path.join(ROOT, "src", "features", "dbt", "queries"))
  .filter((file) => /^[a-z-]+\.ts$/.test(file) && !["index.ts", "keys.ts"].includes(file));

/** The README sentence that mentions the DBT module. */
function dbtSentence(): string {
  const paragraph = README.split("\n").find((line) => /\bDBT module\b/.test(line)) ?? "";
  const sentence = paragraph.split(/(?<=\.)\s+/).find((s) => /\bDBT module\b/.test(s));
  return sentence ?? "";
}

describe("README.md and the DBT module (#2210)", () => {
  it("the module has persisted records, so the assertions below are not vacuous", () => {
    expect(QUERY_MODULES).toEqual(
      expect.arrayContaining(["coping-plan.ts", "emotion-records.ts", "sessions.ts"]),
    );
  });

  it("mentions the DBT module in the frame paragraph", () => {
    expect(dbtSentence()).not.toBe("");
  });

  it("does not call a module with records an overview, a roadmap item, or exercise-free", () => {
    expect(dbtSentence()).not.toMatch(/overview|roadmap|coming soon|not a set of exercises/i);
  });

  it("names what the module ships", () => {
    const sentence = dbtSentence();
    expect(sentence).toMatch(/coping plan/i);
    expect(sentence).toMatch(/programme/);
  });
});
