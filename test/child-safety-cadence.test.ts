import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ABSOLUTE_MINIMUM_AGE_FLOOR } from "@/src/features/auth/age-floor";

/**
 * The recurring half of the teen-safety posture (#1769, spec #227 §4).
 *
 * #1770 landed the child-safety content review as a one-time pass, and
 * `test/child-safety-copy.test.ts` holds the copy rules it established. What
 * that leaves is the part that has to keep happening after launch: a re-run
 * when a new module ships, an annual read of the legal landscape, and a
 * procedure for the day someone tells us an account belongs to a person under
 * their country's floor.
 *
 * All three live in prose - a checklist line in the PR template and two
 * sections of the ops runbook - and prose is exactly the kind of commitment
 * that evaporates in a tidy-up. Nobody runs a runbook, so nothing goes red when
 * a section loses the one identifier that made it followable. This file is the
 * part of those three a machine can hold.
 *
 * ☠️ **KEYED ON IDENTIFIERS AND STRUCTURE, NEVER ON SENTENCES.** A guard that
 * pins prose fails on every honest rewrite and gets deleted rather than fixed
 * (`positioning-copy` § the AI block, #1606 §9). So what is asserted here is:
 * the sections exist; each names the function, column, file or statute that
 * makes it actionable; every legal-landscape item carries a source link and a
 * date checked; and the one number in the delete procedure is read back out of
 * the prose and compared to the constant it must equal, rather than spelled out
 * twice.
 */

const ROOT = resolve(__dirname, "..");

const runbook = readFileSync(resolve(ROOT, "docs/operations-runbook.md"), "utf8");
const prTemplate = readFileSync(resolve(ROOT, ".github/pull_request_template.md"), "utf8");

/**
 * The body of one `##` section, up to the next `##` heading. Sections are the
 * unit here because "the runbook mentions purge_user_account somewhere" is not
 * the claim - the claim is that the delete procedure names it.
 */
function section(markdown: string, headingPattern: RegExp): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^## /.test(line) && headingPattern.test(line));

  if (start === -1) {
    return "";
  }

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^## /.test(line));

  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * Top-level `- ` bullets of a markdown block, each carrying its continuation
 * and nested lines. Used for the legal-landscape list, where "one bullet per
 * area" is the structure being asserted.
 */
function bullets(body: string): string[] {
  const found: string[] = [];

  for (const line of body.split("\n")) {
    if (/^- /.test(line)) {
      found.push(line);
    } else if (found.length > 0 && /^\s+\S/.test(line)) {
      found[found.length - 1] += `\n${line}`;
    }
  }

  return found;
}

describe("delete-on-knowledge runbook", () => {
  const body = section(runbook, /delete on knowledge/i);

  it("has a section of its own", () => {
    expect(body).not.toBe("");
  });

  /**
   * The load-bearing fact of the whole procedure. `recordAgeAttestation` only
   * ever writes `age_floor_met: true`; an under-floor verdict writes nothing at
   * all, because the account it would be written against is deleted at the gate
   * (#1765). So the column is `true` or `null` and never `false`, and no query
   * can find an under-floor account. Knowledge arrives from outside or not at
   * all. A procedure that does not say so invites someone to go looking for a
   * report that cannot exist - or worse, to add the flag that would make one
   * possible, which is the posture #1768's assessment argues from.
   */
  it("names the column that carries no under-floor signal", () => {
    expect(body).toMatch(/age_floor_met/);
  });

  /**
   * The deletion capability, and the half most likely to be "simplified" by
   * someone who has not read `20260826000000_account_purge_helper.sql`.
   * `delete_user_account()` derives its target from `auth.uid()` and cannot
   * name someone else's account, so it is not usable here; a raw
   * `delete from auth.users` strands the person's objects in the private
   * profile-pics bucket and skips every explicit per-table delete.
   *
   * ⚠️ Deliberately not written as a `.not.toMatch` over that raw statement.
   * The section warns against it by quoting it, so the negative assertion would
   * go red on the very sentence that prevents the mistake - the same trap a
   * source-scanning guard hits on a comment explaining why the banned thing was
   * not used.
   */
  it("names the purge helper and the role that can call it", () => {
    expect(body).toMatch(/purge_user_account/);
    expect(body).toMatch(/service_role/);
  });

  /** The floor table has one home; a procedure that restates it grows a second. */
  it("sends the reader to the floor table rather than restating it", () => {
    expect(body).toMatch(/age-floor\.md/);
  });

  /**
   * ☠️ **POSITIVE AND DERIVED, because a negative assertion over prose is
   * vacuous in whichever phrasing it did not anticipate** (#1767: a
   * never-below-13 guard keyed on the word "years" was live in Bulgarian only,
   * and would have passed "the minimum age is 11"). The fallback floor is
   * captured out of the sentence and compared to the constant, so the two
   * cannot drift and the assertion cannot pass by not matching.
   */
  it("falls back to the absolute minimum floor, and says the same number the code does", () => {
    const stated = /absolute minimum floor of \*\*(\d+)\*\*/.exec(body);

    expect(stated).not.toBeNull();
    expect(Number(stated?.[1])).toBe(ABSOLUTE_MINIMUM_AGE_FLOOR);
  });

  /**
   * The guest is the primary entry path (#1441/#1466) and the one a report can
   * never identify: no email, nothing outside the device that names the row.
   * A procedure written only for registered accounts sends someone hunting
   * through records content for a match, which is the one search this posture
   * must never perform.
   */
  it("says what to do when the account is a guest", () => {
    expect(body).toMatch(/guest/i);
  });

  /**
   * The two copies self-service deletion never reaches, already named in
   * § Privacy And GDPR Requests. They are just as untouched here.
   */
  it("sweeps the copies deletion does not reach", () => {
    expect(body).toMatch(/#feedback-inbox/);
    expect(body).toMatch(/mailbox/i);
  });
});

/**
 * §4's cadence rule, second half. Each area is one bullet, and each bullet has
 * to carry a source and a date - AGENTS.md § Documentation rules, and the
 * practical reason that an item with no link is an item the next check has to
 * research from scratch.
 *
 * The federal row is deliberately three names: KOSA and COPPA 2.0 are what the
 * spec asked for, and the KIDS Act is where both went. Dropping either half
 * loses the thread between the bills the spec named and the bill that carries
 * them.
 */
const LEGAL_LANDSCAPE_AREAS: { name: string; pattern: RegExp }[] = [
  { name: "Colorado", pattern: /Colorado/ },
  { name: "US federal minors bills", pattern: /\bKOSA\b/ },
  { name: "Vermont AADC", pattern: /Vermont/ },
  { name: "Play Age Signals", pattern: /Age Signals/ },
  { name: "EU DSA", pattern: /\bDSA\b/ },
  { name: "UK Online Safety Act", pattern: /Online Safety Act/ },
];

describe("annual legal-landscape check", () => {
  const body = section(runbook, /annual legal-landscape check/i);
  const items = bullets(body);

  it("has a section of its own", () => {
    expect(body).not.toBe("");
  });

  it.each(LEGAL_LANDSCAPE_AREAS)("reviews $name, in one bullet", ({ pattern }) => {
    expect(items.filter((item) => pattern.test(item))).toHaveLength(1);
  });

  it.each(LEGAL_LANDSCAPE_AREAS)("cites a source for $name", ({ pattern }) => {
    const item = items.find((entry) => pattern.test(entry)) ?? "";

    expect(item).toMatch(/https:\/\//);
  });

  it.each(LEGAL_LANDSCAPE_AREAS)("records when $name was last checked", ({ pattern }) => {
    const item = items.find((entry) => pattern.test(entry)) ?? "";

    expect(item).toMatch(/checked \d{4}-\d{2}-\d{2}/);
  });

  it("keeps the thread from the bills the spec named to the bill that carries them", () => {
    const federal = items.find((item) => /\bKOSA\b/.test(item)) ?? "";

    expect(federal).toMatch(/COPPA\s*2\.0/);
    expect(federal).toMatch(/KIDS Act/);
  });

  it("names what the check updates", () => {
    expect(body).toMatch(/DPIA/);
    expect(body).toMatch(/1768/);
  });
});

describe("PR-template gate line", () => {
  const guardrails = section(prTemplate, /product guardrails/i);

  it("sits in the Product guardrails checklist, not the notes", () => {
    expect(guardrails).toMatch(/child-safety/i);
  });

  /**
   * A checkbox, because the block it joins is a checklist and an unticked line
   * is the whole mechanism. A prose reminder in the same place reads the same
   * and gates nothing.
   */
  it("is a checkbox naming both triggers and the document to update", () => {
    const line = guardrails
      .split("\n")
      .find((entry) => /^- \[ \]/.test(entry) && /child-safety/i.test(entry));

    expect(line).toBeDefined();
    expect(line).toMatch(/module/i);
    expect(line).toMatch(/engagement-adjacent/i);
    expect(line).toMatch(/docs\/child-safety-review\.md/);
  });
});
