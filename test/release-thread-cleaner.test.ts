/**
 * The release-thread cleaner (#1949) — the second step of the r/Selftend
 * drafter mapped on #1873, built to #1880 §3, which amends #1876 decision 7.
 *
 * Every line the drafter picks must be safe to paste into r/Selftend unchanged.
 * #1880 measured decision 7's "strip scope + issue links + SHA" as broken on 11
 * of the 23 releases that would have posted: links that are not the trailing
 * parenthetical, HTML entities straight from the release body, em dashes and
 * arrows against the sub's hyphens-only convention, and underscores that Reddit
 * reads as italics. The cleaner is eight ordered steps; the first seven rewrite
 * the text, the eighth sends a line a machine must not touch to a human.
 *
 * ☠️ WHY THE CORPUS ASSERTION COMES FIRST. Each step below has a unit test, but
 * the test that matters is the whole-corpus one: over all 26 real releases, no
 * picked line carries a residual hazard. A step that holds on its example and
 * misses a shape the corpus has (a link as a word mid-sentence, a `closes`
 * clause naming two issues) goes red here rather than on the owner's screen.
 */
import corpus from "./fixtures/github-releases.json";
import {
  clean,
  cleanText,
  decodeEntities,
  hazardOf,
  SCOPE_PREFIX,
} from "../scripts/release-thread/cleaner.mjs";
import { CAP, draft, parseChangelog, pick } from "../scripts/release-thread/picker.mjs";

const releases = corpus.releases;
const byTag = (tag: string) => {
  const release = releases.find((r) => r.tag_name === tag);
  if (!release) throw new Error(`no release ${tag} in the fixture`);
  return release;
};

/**
 * The hazards #1880 measured, each as the regex the corpus assertion runs. The
 * spelling regex is deliberately NOT the module's own list: the words #1949
 * names, written here independently, so a hole in the list is visible.
 *
 * ☠️ THE INDEPENDENCE IS THE WHOLE POINT, AND IT ONLY WORKS IF THIS GROWS TOO
 * (#1970). `defense` sat in this corpus, uncaught by the module, and this
 * regex did not name it either — so the corpus assertion was green over a line
 * that was **picked** and heading for r/Selftend. A word added to
 * `AMERICAN_SPELLINGS` must be added here in its own words, or the second pair
 * of eyes is the first pair wearing a hat.
 */
const HAZARDS = {
  entity: /&(?:[a-z]+|#x?[0-9a-f]+);/i,
  link: /\[[^\]]*\]\([^)]*\)/,
  scopePrefix: SCOPE_PREFIX,
  dashOrArrow: /[—–→←⇒]/,
  underscore: /_/,
  spelling:
    /\b(?:favorites?|colors?|behaviou?rs?al?|defenses?|programs?|organiz\w*|recogniz\w*|localiz\w*|practicing)\b/i,
  empty: /^$/,
};

describe("the whole corpus", () => {
  test("no picked line carries an entity, a link, a dash, an underscore or an American spelling", () => {
    let pickedLines = 0;
    let spareLines = 0;
    for (const release of releases) {
      const { picked, spares } = draft(release);
      expect(picked.length).toBeLessThanOrEqual(CAP);
      // The spares the picker itself made (unscoped, overflow) are cleaned too:
      // the owner may promote one in the composer, so it must be as postable as
      // a pick. Only a forced spare is allowed to keep its hazard - that is the
      // point of it.
      const postable = [
        ...picked,
        ...spares.filter((s) => !["spelling", "underscore", "empty"].includes(s.reason)),
      ];
      pickedLines += picked.length;
      spareLines += postable.length - picked.length;
      for (const { text } of postable) {
        for (const [name, pattern] of Object.entries(HAZARDS)) {
          expect({ release: release.tag_name, text, hazard: name }).toEqual(
            expect.objectContaining({ text: expect.not.stringMatching(pattern) }),
          );
        }
        expect(text).toBe(text.trim());
        expect(text).not.toMatch(/\s{2}/);
        expect(text).not.toMatch(/[,;]$/);
      }
      for (const { text } of picked) expect(text.length).toBeLessThanOrEqual(120);
    }
    // Vacuous unless the corpus really yields picks and spares.
    expect(pickedLines).toBeGreaterThan(100);
    expect(spareLines).toBeGreaterThan(100);
  });

  test("the longest picked line is 91 characters, and v0.13.0's longest entry is cut to size", () => {
    const lengths = releases.flatMap((r) => draft(r).picked.map((p) => p.text.length));
    expect(Math.max(...lengths)).toBe(91);

    // #1880 measured a v0.13.0 entry at 383 characters of raw markdown; on the
    // frozen corpus the longest scoped one there is 353 (two `closes` links on
    // the settings reset line) and the longest unscoped 539. Either way the
    // rule is the same: it competes cleaned, at 63 characters, not dropped.
    const contenders = parseChangelog(byTag("v0.13.0").body).filter(
      (e) => e.kind !== null && !e.denied && e.scope !== null,
    );
    const raw = contenders.reduce((a, b) => (b.text.length > a.text.length ? b : a));
    expect(raw.text.length).toBe(353);
    const cleaned = clean(raw);
    expect(cleaned).toMatchObject({
      text: "Reset onboarding clears every flag, and the guard can see drift",
    });
    expect(cleaned.reason).toBeUndefined();
    const { picked, spares } = draft(byTag("v0.13.0"));
    expect([...picked, ...spares].map((p) => p.text)).toContain(cleaned.text);
  });

  test("22 of 26 releases are postable; the four silent ones are unchanged by cleaning", () => {
    // ☠️ #1949's ticket says v0.4.1 goes silent BECAUSE its only line is a
    // forced spare. It was already silent: that line is unscoped, so the picker
    // would have spared it anyway (noted on the ticket). The count and the set
    // hold either way; the cleaner adds no silence and removes none.
    const silent = releases.filter((r) => !draft(r).postable).map((r) => r.tag_name);
    expect(silent).toEqual(["v0.2.1", "v0.3.2", "v0.4.1", "v0.4.2"]);
    // The cleaner runs before the picker, so the line carries the cleaner's
    // reason - the one the ticket's criterion names - with its underscore
    // intact for the human to see.
    expect(draft(byTag("v0.4.1")).spares).toEqual([
      expect.objectContaining({
        text: "Run wrangler on Node 22 so _headers applies",
        reason: "underscore",
      }),
    ]);
  });

  test("forced spares carry their reason beside the picker's own", () => {
    const reasons = new Map<string, number>();
    for (const release of releases) {
      for (const spare of draft(release).spares) {
        reasons.set(spare.reason, (reasons.get(spare.reason) ?? 0) + 1);
      }
    }
    expect([...reasons.keys()].sort()).toEqual(["overflow", "spelling", "underscore", "unscoped"]);
    // #1876 counted three American spellings (`favorites` x2, `colors`); #1880
    // counted seven underscores. #1970 found two more spellings the list had
    // missed — `defense` (v0.5.0, which was being PICKED) and `localized`
    // (v0.16.0, which was already an overflow spare) — so three becomes five
    // while the underscores are untouched.
    expect(reasons.get("spelling")).toBe(5);
    expect(reasons.get("underscore")).toBe(7);
  });

  test("#1970's two: `defense` stops being picked, `localized` changes its reason", () => {
    const spellings = releases.flatMap((r) =>
      draft(r)
        .spares.filter((s) => s.reason === "spelling")
        .map((s) => `${r.tag_name}: ${s.text}`),
    );
    expect(spellings).toEqual([
      "v0.5.0: Post-launch advisor + defense-in-depth hardening",
      "v0.7.0: List, favorites, and detail join the think room",
      "v0.7.0: Habit colors become a token alias layer with certified chips",
      "v0.8.0: Human labels for the gratitude favorites breadcrumb and habit tick days",
      "v0.16.0: Check-in picker on the shared sheet, localized, draft-until-Done",
    ]);
    // v0.5.0 is the one that was leaking: the line was slot seven of eight, and
    // the release still posts a full eight because the freed slot promotes the
    // overflow spare behind it rather than leaving a hole.
    const v5 = draft(byTag("v0.5.0"));
    expect(v5.picked).toHaveLength(CAP);
    expect(v5.picked.map((p) => p.text)).not.toContain(
      "Post-launch advisor + defense-in-depth hardening",
    );
    expect(v5.picked.map((p) => p.text)).toContain(
      "Upgrade Expo SDK 56 to 57 - land the spine target",
    );
    expect(v5.spares).toEqual([
      expect.objectContaining({
        text: "Post-launch advisor + defense-in-depth hardening",
        reason: "spelling",
      }),
    ]);
  });

  test("`dialog` was swept for and deliberately left out, so it stays postable", () => {
    // ☠️ Pinned the way positioning.md pins `licence`: a later completeness
    // sweep must meet this decision, not rediscover it as an oversight. All
    // three occurrences are the UI component — the term of art British
    // technical writing uses too (`role="dialog"`, the `<dialog>` element) —
    // so flagging it would spare three correct lines to catch no misspelling.
    const dialogs = releases.flatMap((r) => {
      const { picked, spares } = draft(r);
      return [...picked, ...spares].filter((e) => /\bdialogs?\b/i.test(e.text));
    });
    expect(dialogs).toHaveLength(3);
    for (const entry of dialogs) expect(entry.reason).not.toBe("spelling");
    expect(hazardOf("Manage emotions becomes a dialog on desktop web")).toBeUndefined();
  });

  test("a forced spare frees its slot rather than leaving a hole", () => {
    // v0.7.0 hits the cap with two American spellings among its contenders
    // (`favorites` under gratitude, `colors` under habits). Both are spares, and
    // the picks are still a full eight.
    const { picked, spares } = draft(byTag("v0.7.0"));
    expect(picked).toHaveLength(CAP);
    expect(spares.filter((s) => s.reason === "spelling").map((s) => s.text)).toEqual([
      "List, favorites, and detail join the think room",
      "Habit colors become a token alias layer with certified chips",
    ]);
  });

  test("the lines #1880 called out come out exactly as it said", () => {
    const pickedText = (tag: string) => draft(byTag(tag)).picked.map((p) => p.text);
    // `last-7-days` survives step 7 in lowercase. The line is one of v0.4.0's
    // many `routines` entries, so the round-robin overflows it to spares.
    const last7 = parseChangelog(byTag("v0.4.0").body).find((e) => /last-7-days/.test(e.text));
    expect(clean(last7!)).toMatchObject({
      text: "last-7-days no-streak dot strip on cards & detail",
      scope: "routines",
    });
    expect(clean(last7!).reason).toBeUndefined();
    expect(draft(byTag("v0.4.0")).spares).toContainEqual(
      expect.objectContaining({ text: clean(last7!).text, reason: "overflow" }),
    );
    // v0.14.0's `&quot;no pressure&quot;` comes out with real quotation marks.
    expect(pickedText("v0.14.0")).toContain(
      '"no pressure" stops advertising the product\'s restraint',
    );
    // The link that is a word mid-sentence (v0.16.0) is removed and the sentence
    // closes back up around it.
    const i18n = parseChangelog(byTag("v0.16.0").body).find((e) => /\[#1096\]/.test(e.text));
    expect(clean(i18n!).text).toBe(
      "Sweep Bulgarian terminology drift onto the glossary and conventions",
    );
    // v0.5.0's arrows read as "to".
    expect(pickedText("v0.5.0")).toContain(
      "Upgrade Expo SDK 54 to 55 (RN 0.83, React 19.2), expo-av to expo-audio",
    );
    // v0.12.0 shipped five of six highlights with a `closes` clause dangling.
    for (const text of pickedText("v0.12.0")) expect(text).not.toMatch(/closes/);
    expect(pickedText("v0.12.0")).toContain(
      "Invisible header on signed-out surfaces, old top bar retired",
    );
  });
});

describe("decodeEntities (step 1)", () => {
  test("decodes the named entities the release body carries, and &amp; last", () => {
    expect(decodeEntities("&quot;no pressure&quot;")).toBe('"no pressure"');
    expect(decodeEntities("list -&gt; detail -&gt; editor")).toBe("list -> detail -> editor");
    expect(decodeEntities("a &lt;b&gt; c &#39;d&#39;")).toBe("a <b> c 'd'");
    // `&amp;quot;` is a literal `&quot;` in the source, not a quotation mark:
    // decoding `&amp;` last keeps it that way.
    expect(decodeEntities("&amp;quot; and &amp;")).toBe("&quot; and &");
  });

  test("decodes numeric references too", () => {
    expect(decodeEntities("it&#8217;s &#x27;quoted&#x27;")).toBe("it’s 'quoted'");
  });
});

describe("cleanText (steps 2 to 7)", () => {
  const u = "https://github.com/Selftend/selftend/issues/1";
  const sha = "https://github.com/Selftend/selftend/commit/abcdef0123456789";

  test("drops the bold scope prefix and the trailing issue and commit links", () => {
    expect(cleanText(`**auth:** Sign in with Apple ([#544](${u})) ([7e2586b](${sha}))`)).toBe(
      "Sign in with Apple",
    );
  });

  test("removes every link wherever it sits, then the parentheses it emptied", () => {
    expect(
      cleanText(`**app:** keep the FAB off form screens ([#90](${u}), [#92](${u})) ([#94](${u}))`),
    ).toBe("Keep the FAB off form screens");
    expect(
      cleanText(`bring check-in to the amended design ([#869](${u}) [#870](${u}) [#871](${u}))`),
    ).toBe("Bring check-in to the amended design");
    expect(cleanText(`sweep drift onto the [#1096](${u}) glossary and conventions`)).toBe(
      "Sweep drift onto the glossary and conventions",
    );
  });

  test("removes the orphaned closes clause, whether it names one issue or two", () => {
    expect(
      cleanText(
        `**nav:** old top bar retired ([#678](${u})) ([2e5d1f2](${sha})), closes [#669](${u})`,
      ),
    ).toBe("Old top bar retired");
    expect(
      cleanText(
        `**settings:** reset clears every flag ([#833](${u})), closes [#821](${u}) [#822](${u})`,
      ),
    ).toBe("Reset clears every flag");
    // Comma-separated issues in the clause leave commas behind the word.
    expect(cleanText(`reset clears every flag, closes [#821](${u}), [#822](${u})`)).toBe(
      "Reset clears every flag",
    );
    // "closes" as an ordinary word in the sentence is not the clause.
    expect(cleanText("**cbt:** chips open the tool, not a guide that closes back")).toBe(
      "Chips open the tool, not a guide that closes back",
    );
  });

  test("normalises em and en dashes to a hyphen and arrows to 'to'", () => {
    expect(cleanText("**routines:** starter-routine panel — offer, never auto-create")).toBe(
      "Starter-routine panel - offer, never auto-create",
    );
    expect(cleanText("a spaced – en dash and a 1–2 range")).toBe(
      "A spaced - en dash and a 1-2 range",
    );
    expect(cleanText("**platform:** upgrade Expo SDK 54→55, expo-av→expo-audio")).toBe(
      "Upgrade Expo SDK 54 to 55, expo-av to expo-audio",
    );
    expect(cleanText("a ⇒ b ← c")).toBe("A to b to c");
    // The ASCII `->` is plain ASCII, rendered as typed, and "list to detail to
    // editor" would be authoring: it stays. (v0.4.0, after entity decoding.)
    expect(cleanText("**routines:** management screens (list -&gt; detail -&gt; editor)")).toBe(
      "Management screens (list -> detail -> editor)",
    );
  });

  test("collapses whitespace and strips a trailing comma or semicolon", () => {
    expect(cleanText("  too   many  spaces ,")).toBe("Too many spaces");
    expect(cleanText("ends with a semicolon;")).toBe("Ends with a semicolon");
    expect(cleanText("keeps a full stop.")).toBe("Keeps a full stop.");
  });

  test("capitalises the first character, except on a token that is an identifier", () => {
    expect(cleanText("match arbitrary destructive opacity")).toBe(
      "Match arbitrary destructive opacity",
    );
    expect(cleanText("check-in gets a header")).toBe("Check-in gets a header");
    // A first token that carries a digit or an inner capital is a name, not a
    // word — `last-7-days` is a range key, `useThing` a hook.
    expect(cleanText("last-7-days habit strip")).toBe("last-7-days habit strip");
    expect(cleanText("useSession stops re-rendering")).toBe("useSession stops re-rendering");
    expect(cleanText("RoutineFab rides above banners")).toBe("RoutineFab rides above banners");
    // An entity that decodes to a quotation mark is not a letter to capitalise.
    expect(cleanText('"no pressure" stops advertising')).toBe('"no pressure" stops advertising');
  });

  test("leaves a line that needs nothing alone, and copes with an empty one", () => {
    expect(cleanText("Already clean.")).toBe("Already clean.");
    expect(cleanText("")).toBe("");
  });
});

describe("hazardOf (step 8)", () => {
  test("names the American spellings the house style lists, whole words only", () => {
    expect(hazardOf("list, favorites, and detail join the think room")).toBe("spelling");
    expect(hazardOf("habit colors become a token alias layer")).toBe("spelling");
    expect(hazardOf("schedule meaningful behavior")).toBe("spelling");
    expect(hazardOf("a guided CBT program")).toBe("spelling");
    expect(hazardOf("organize, recognize, practicing, fulfill, fueled, judgment")).toBe("spelling");
    // Identical-in-both words are not American (positioning.md § house style).
    expect(hazardOf("practice the noun, programming the verb, humorous")).toBeUndefined();
    expect(hazardOf("favourites, colours, behaviour, programme, judgement")).toBeUndefined();
    // #1970's two, and the British forms they must not touch. `defensive` is
    // identical in both styles, so it is not on the list and must not match.
    expect(hazardOf("post-launch advisor + defense-in-depth hardening")).toBe("spelling");
    expect(hazardOf("defenses hold")).toBe("spelling");
    expect(hazardOf("the picker on the shared sheet, localized")).toBe("spelling");
    expect(hazardOf("localize, localizes, localizing, localization")).toBe("spelling");
    expect(hazardOf("defence in depth, localised strings, a defensive read")).toBeUndefined();
    // Whole words: `colorScheme` is an identifier and matched by nothing here.
    expect(hazardOf("prefers-colorScheme")).toBeUndefined();
  });

  test("flags any underscore", () => {
    expect(hazardOf("via add_widget_preference and set_widget_order")).toBe("underscore");
    expect(hazardOf("rename act's bare-plural keys to canonical _one")).toBe("underscore");
    expect(hazardOf("nothing to see")).toBeUndefined();
  });

  test("a spelling outranks an underscore when a line has both", () => {
    expect(hazardOf("the favorites route and _one")).toBe("spelling");
  });

  test("an underscore glued to the word hides the word, so the underscore is the reason", () => {
    // `_` is a word character: `favorites_one` has no boundary after `favorites`.
    expect(hazardOf("favorites_one key")).toBe("underscore");
  });

  test("a line the first seven steps emptied is a hazard of its own", () => {
    expect(hazardOf("")).toBe("empty");
    expect(cleanText("**a:** ([#1](https://x/1))")).toBe("");
  });
});

describe("clean (the whole step)", () => {
  const entry = (text: string) => ({ text, scope: "a", kind: "feat" as const, denied: false });

  test("is a pure Entry to Entry map: cleaned text, everything else untouched", () => {
    const raw = entry("**a:** the thing ([#1](https://x/1))");
    const out = clean(raw);
    expect(out).toEqual({ text: "The thing", scope: "a", kind: "feat", denied: false });
    expect(raw.text).toBe("**a:** the thing ([#1](https://x/1))");
  });

  test("sets the reason on a line step 8 refuses, after the text is cleaned", () => {
    expect(
      clean(entry("**a:** the gratitude favorites breadcrumb ([#485](https://x/485))")),
    ).toEqual({
      text: "The gratitude favorites breadcrumb",
      scope: "a",
      kind: "feat",
      denied: false,
      reason: "spelling",
    });
    expect(clean(entry("**a:** read the base table in sleep_stats"))).toMatchObject({
      text: "Read the base table in sleep_stats",
      reason: "underscore",
    });
  });

  test("a bullet that was only a link is a spare, never an empty pick", () => {
    expect(clean(entry("[#1](https://x/1)"))).toMatchObject({ text: "", reason: "empty" });
    const { picked, spares } = pick([clean(entry("**a:** ([#1](https://x/1))"))]);
    expect(picked).toEqual([]);
    expect(spares).toEqual([expect.objectContaining({ text: "", reason: "empty" })]);
  });

  test("does not touch an entry that never reaches the menu", () => {
    const chore = { text: "**ci:** the_pin", scope: "ci", kind: null, denied: true };
    expect(clean(chore)).toEqual(chore);
    const note = {
      text: "**widgets:** orphaned_widgets",
      scope: "widgets",
      kind: null,
      denied: false,
    };
    expect(clean(note)).toEqual(note);
  });
});
