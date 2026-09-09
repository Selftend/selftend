/**
 * The release-thread cleaner — step two of the r/Selftend drafter (#1949).
 *
 * Every line the drafter picks must be safe to paste into r/Selftend unchanged.
 * The picker (#1948) hands entries over raw — scope prefix, issue links and SHA
 * included — and this module is the pure `Entry → Entry` map between parse and
 * pick that makes each of them postable. It is #1880 §3, which **amends #1876
 * decision 7**: build §3, not decision 7.
 *
 * **This module decides nothing.** Every step cites the ticket that fixed it;
 * if a value looks wrong, the argument belongs on that ticket. The numbers in
 * the comments were measured on #1880 over the 26-release corpus committed at
 * `test/fixtures/github-releases.json`, and `test/release-thread-cleaner.test.ts`
 * asserts them over the whole corpus.
 *
 * ☠️ WHY "STRIP THE TRAILING PARENTHETICAL" WAS NOT ENOUGH (#1880). Read as a
 * trailing strip, decision 7 was broken on 11 of the 23 releases that would
 * have posted: 32 of 379 eligible entries carry a link that is not the trailing
 * parenthetical (`closes [#974](…)` as a trailing clause, multi-link
 * `([#1064](…), [#1060](…))`, and one where the link is a WORD in the sentence:
 * *"drift onto the [#1096](…) glossary"*); 3 carry HTML entities straight out of
 * `github.event.release.body` (`&quot;` ×4, `&gt;` ×2 — v0.14.0 would have
 * posted `&quot;no pressure&quot;`); 8 carry an em dash, en dash or arrow
 * against the sub's hyphens-only convention; 7 carry an underscore, and two in
 * one line is Reddit italics. One v0.13.0 entry is 383 characters of raw
 * markdown. After the eight steps: 0 residual entities, links, dashes or
 * underscores in any picked line, and the longest picked line is 91 characters.
 *
 * The eight steps, in this order (#1880 §3):
 *   1. Decode HTML entities (`&quot; &gt; &lt; &#39;`, then `&amp;` LAST — an
 *      `&amp;quot;` in the source is a literal `&quot;`, not a quotation mark).
 *   2. Drop the bold `**scope:**` prefix.
 *   3. Remove EVERY markdown link wherever it sits, not only the trailing one.
 *   4. Remove the now-orphaned `closes` clause and any emptied parentheses.
 *   5. Normalise em dash and en dash to a hyphen, arrows to " to ". The ASCII
 *      `->` (v0.4.0: *"list -> detail -> editor"*) is not an arrow for this
 *      purpose: it is plain ASCII, Reddit renders it as typed, and "list to
 *      detail to editor" would be authoring.
 *   6. Collapse whitespace; strip a trailing comma or semicolon.
 *   7. Capitalise the first character — safe, because only one entry in 379
 *      starts with a token that must stay lowercase (`last-7-days`), and a
 *      first token that is an identifier rather than a word (it carries a digit
 *      or an inner capital) keeps its case.
 *   8. A line containing a NON-BRITISH SPELLING or ANY UNDERSCORE becomes a
 *      spare with that reason — never picked, never auto-corrected. A line the
 *      first seven steps emptied (a bullet that was only a link) is a spare
 *      too, as `empty`: nothing is safe to paste from it.
 *
 * ☠️ STEP 8 IS A TRIPWIRE FOR A HUMAN, NOT A DICTIONARY (#1877 rule 4).
 * `favorites` and `colors` name identifiers — the `/tools/gratitude-log/favorites`
 * route, the `habit_colors` alias layer — correct in code and wrong in a post,
 * and `positioning.md` exempts identifiers from the house style precisely
 * because a respelling can break a bookmark. The `verify` guard (#1639) covers
 * translated strings only, so no gate covers a changelog line on its way to
 * Reddit. A human in front of the line beats a mechanical fix that might
 * corrupt a real identifier; the same goes for an underscore, which is either
 * an identifier or an italics trigger and never a word. The spelling list is
 * the American forms the corpus carries, whole words only — the house style's
 * named words are its floor, not its bound (#1970, at `AMERICAN_SPELLINGS`); a
 * false positive costs one line a slot, a miss costs the sub a misspelling.
 *
 * ☠️ NOTHING IS AUTHORED HERE (#1876 decisions 1 and 2). Every step removes
 * markup, decodes what the API encoded, or swaps one punctuation mark for the
 * sub's equivalent. No word is added, changed or reordered; the owner rewrites
 * in Reddit's composer or does not post.
 */

/**
 * @typedef {import("./picker.mjs").Entry} Entry
 * @typedef {"spelling" | "underscore" | "empty"} Hazard
 */

/**
 * The bold scope prefix release-please writes (`**auth:** …`), with the scope
 * captured. The parser reads it and step 2 drops it, so it lives here once.
 */
export const SCOPE_PREFIX = /^\*\*([^*]+?):\*\*\s/;

/**
 * The American forms of the words `docs/positioning.md` § house style spells
 * British (#1639, #1651, #1627), plus the ones #1949 names. Whole words only:
 * `programming` and `practice` are identical in both and never match; an
 * identifier like `colorScheme` has no word boundary inside it. Two are
 * deliberate over-inclusions: `judgment` in its legal sense and `program` in
 * the software sense are correct in either style, and the list flags them
 * anyway — the cost is a slot, the human decides, nothing is respelled.
 *
 * ☠️ THE HOUSE STYLE'S NAMED WORDS ARE A FLOOR, NOT THE LIST (#1970). § *Words
 * to use* is British *throughout*; the nine words it spells out are the ones
 * the `verify` guard had cause to name, and `verify` covers translated strings
 * only, so a changelog line is not in its sample at all. `defense` proves it:
 * v0.5.0's *"Post-launch advisor + defense-in-depth hardening"* was **picked**
 * — an American form on its way to r/Selftend with no gate on the path, found
 * by the review on #1967. So the list takes any American form the corpus
 * actually carries, named by § *Words to use* or not. Sweeping the 369
 * postable lines for the whole -our/-er/-ise/-se/-og families found two:
 * `defense` and `localized` (the -ise family the house style already governs
 * through `organise` and `recognise`).
 *
 * ☠️ `dialog` WAS FOUND AND DELIBERATELY LEFT OUT — pinned in the test so a
 * later sweep meets the decision instead of rediscovering it as an oversight,
 * exactly as positioning.md pins `licence`. All three corpus occurrences are
 * the UI component (*"becomes a dialog on desktop web, a drawer on mobile
 * web"*), which is the term of art British technical writing uses too —
 * `role="dialog"`, the `<dialog>` element. Flagging it would spare three
 * correct lines to catch no misspelling, which is the one trade the tripwire
 * does not make: a false positive costs a slot, and here it buys nothing.
 */
export const AMERICAN_SPELLINGS =
  /\b(?:favorites?|colors?|colored|colorful|behaviors?|behavioral|defenses?|programs?|organiz(?:e|es|ed|ing|er|ers|ation|ations)|recogniz(?:e|es|ed|ing|able)|localiz(?:e|es|ed|ing|ation|ations)|practicing|fulfill(?:s|ed|ing|ment)?|fueled|judgments?)\b/i;

/** The named entities the release body has carried, decoded in this order; `&amp;` goes last. */
const NAMED_ENTITIES = [
  ["&quot;", '"'],
  ["&gt;", ">"],
  ["&lt;", "<"],
  ["&#39;", "'"],
];

/**
 * Step 1. Decode the HTML entities `github.event.release.body` carries. Named
 * ones first, numeric references (`&#8217;`, `&#x27;`) next, `&amp;` last so a
 * doubly-encoded `&amp;quot;` decodes to the literal `&quot;` it stands for.
 * @param {string} text
 */
export function decodeEntities(text) {
  let out = text;
  for (const [entity, character] of NAMED_ENTITIES) out = out.replaceAll(entity, character);
  out = out.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
  out = out.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
  return out.replaceAll("&amp;", "&");
}

/**
 * Steps 2 to 7: the raw entry text to the postable line. Pure; the hazard check
 * (step 8) is {@link hazardOf}, and {@link clean} runs both on an entry.
 * @param {string} text
 */
export function cleanText(text) {
  let out = decodeEntities(text);
  // 2. The scope prefix, exactly as parseChangelog recognised it.
  out = out.replace(SCOPE_PREFIX, "");
  // 3. Every link, wherever it sits.
  out = out.replace(/\[[^\]]*\]\([^)]*\)/g, "");
  // 4. The `closes` clause is orphaned once its links are gone (`, closes` at
  //    the end, possibly with the commas that separated its issues); "closes"
  //    as a word in the sentence is not the clause. Then the parentheses the
  //    links left empty — `()`, `( )`, `(, )`.
  out = out.replace(/,?\s*\bcloses\b[\s,]*$/, "");
  out = out.replace(/\s*\(\s*(?:,\s*)*\)/g, "");
  // 5. The sub is hyphens-only. An en dash between digits is a range and keeps
  //    the hyphen tight; any other em or en dash becomes a spaced hyphen. An
  //    arrow reads as "to".
  out = out.replace(/(\d)–(\d)/g, "$1-$2");
  out = out.replace(/\s*[—–]\s*/g, " - ");
  out = out.replace(/\s*[→←⇒]\s*/g, " to ");
  // 6. Whitespace, and the comma or semicolon a removed clause left behind.
  out = out.replace(/\s+/g, " ").trim();
  out = out.replace(/[,;]\s*$/, "").trim();
  // 7. The first character — unless the first token is a name rather than a
  //    word (`last-7-days`, `useSession`), which keeps its case.
  const firstToken = out.split(" ")[0] ?? "";
  if (!/\d/.test(firstToken) && !/^[a-z]+[A-Z]/.test(firstToken)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/**
 * Step 8. The reason a cleaned line must go to a human instead of a slot, or
 * undefined when it may be picked. A spelling outranks an underscore when a
 * line carries both: the spelling is the judgement call.
 * @param {string} text
 * @returns {Hazard | undefined}
 */
export function hazardOf(text) {
  if (text === "") return "empty";
  if (AMERICAN_SPELLINGS.test(text)) return "spelling";
  if (text.includes("_")) return "underscore";
  return undefined;
}

/**
 * The whole step: a raw entry to a cleaned one. An entry that never reaches the
 * menu (an ineligible section, a denied scope) passes through untouched — there
 * is nothing to make postable.
 *
 * @param {Entry} entry
 * @returns {Entry}
 */
export function clean(entry) {
  if (entry.kind === null || entry.denied) return entry;
  const text = cleanText(entry.text);
  const reason = hazardOf(text);
  return reason === undefined ? { ...entry, text } : { ...entry, text, reason };
}
