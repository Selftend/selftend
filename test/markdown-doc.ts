/**
 * Reading a markdown document by section, for the guards that hold prose docs
 * to their structure.
 *
 * Two suites parse the same documents this way - `child-safety-cadence` over
 * the ops runbook and the PR template, `dpia-assessment` over the assessment
 * and the four files that point at it - and they had a near-identical copy of
 * this each. One definition, because "the body of a section" is one idea, and
 * two of them drift in exactly the way the documents they read do.
 */

/**
 * The body of one section: everything under the first heading matching
 * `headingPattern`, up to the next heading at the same level or above.
 *
 * Sections are the unit because "the file mentions X somewhere" is rarely the
 * claim worth asserting - the claim is that the section responsible for X names
 * it. Returns `""` when no heading matches, so a caller can assert the section
 * exists rather than silently testing nothing.
 *
 * Level-aware, so a `##` section keeps its `###` subsections and a `###`
 * section stops at its sibling. `##` and `###` are the only levels these
 * documents use.
 */
export function section(markdown: string, headingPattern: RegExp): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^#{2,3} /.test(line) && headingPattern.test(line));

  if (start === -1) {
    return "";
  }

  const level = (lines[start].match(/^#+/) ?? ["##"])[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const heading = line.match(/^#+(?= )/);
    return heading !== null && heading[0].length <= level;
  });

  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}
