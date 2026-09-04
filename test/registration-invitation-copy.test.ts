import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LOCALE_STRINGS, type Locale, type LocaleString } from "@/test/locale-strings";
import { sourceFiles, stripComments } from "@/test/source-scan";

/**
 * **Registration invitations live on exactly two surfaces** (#1870, commissioned
 * by #1809, spec'd on #1812 §3/§5): the settings card
 * (`create-account-card.tsx`) and one line on the onboarding wizard's final
 * panel (`app-onboarding-wizard.tsx`). A third is not added by finding a calmer
 * place for it — every surface is a step, and `docs/product-principles.md` §12
 * *Fulfilling, And Done* derives this from its **Action** bullet: *remove steps
 * toward the practice, never toward the account.*
 *
 * Until #1870 that rule was asserted in three code comments, stated in no doc,
 * and enforced by nothing. This is the enforcement half; the doc half is the
 * sub-rule under §12's Action bullet. The three comments are unchanged - what
 * changed is not their truth but their status: they stop being the only
 * statement of the rule.
 *
 * ☠️ **THE RULE GOVERNS INVITATIONS TO *REGISTER*, NOT ACCESS TO AN ACCOUNT.**
 * The guest header's `Sign in` door (#1869) is not a third surface: it invites
 * nothing, it is navigation for someone who already has an account. That
 * distinction is `CONTEXT.md` § *Accounts ("optional registration")*, not this
 * file, and it is why no `signIn.*` key beyond the one link below is listed
 * here.
 *
 * ## Corpus: i18n only, and never `docs/`
 *
 * Both locales, values only, over the shared `test/locale-strings.ts`
 * enumerator - the fourth app-wide ring beside `restraint-copy`,
 * `positioning-copy` and `practice-copy`.
 *
 * ☠️ **`docs/` IS DELIBERATELY OUT OF SCOPE.** A docs-scanning version of this
 * guard reads §12's own sub-rule - the sentence "Registration invitations live
 * on exactly two surfaces" - and goes red on its own charter. The only fix
 * available then is an allowlist entry for the rule's own statement, and
 * `restraint-copy`'s docstring is explicit that an allowlist entry must be a
 * live offence awaiting a fix, never a permanent carve-out. So the corpus stops
 * at shipped copy, which is the only place a third *surface* can appear anyway.
 *
 * ## ☠️☠️ `policies` IS EXCLUDED WHOLESALE, AND HERE IS THE REASON
 *
 * The patterns below hit **seventeen `policies` passages** as shipped - nine in
 * `en`, eight in `bg`, across `privacy`, `terms`, `accountDeletion` and `faq`.
 * (#1812's sweep counted nine because it ran narrower patterns over both
 * locales together; the ruling is the same either way, and the number is quoted
 * here only so a later reader can tell whether it still holds.) **Owner-decided
 * while slicing: exclude the namespace, do not enumerate them.**
 *
 * Policy prose describing what an account *is* - "By creating an account or
 * using Selftend, you agree to these Terms" - is descriptive, not a step toward
 * one. Seventeen carve-outs would each read like a live offence awaiting a fix,
 * which is exactly what an allowlist entry is supposed to mean. And that copy
 * is already gated from a different direction: policy `.sections` edits trip
 * the pinned consent digest in `verify`.
 *
 * **Do not "complete" the corpus by enumerating them.** The exclusion is the
 * ruling, not an omission.
 */
const EXCLUDED_NAMESPACES = ["policies"];

/**
 * The two files that name the invitation copy, and half of Layer 1.
 *
 * Layer 1 catches a third invitation built by **reusing** what already exists -
 * cheaper than writing one, and invisible to every phrase pattern below,
 * because the phrase is already allowlisted at its key.
 *
 * ☠️ Reuse has TWO shapes and this list only sees one of them. Naming the keys
 * somewhere new is caught here; **mounting the finished card somewhere new is
 * not** - `settings-screen.tsx` renders `<CreateAccountCard />` without
 * containing the string `guestInvite` anywhere, so a fourth screen doing the
 * same would walk straight past this list. `INVITATION_MOUNTS` below is the
 * other half, and neither half is sufficient alone.
 */
const INVITATION_SOURCES = [
  "src/components/app/app-onboarding-wizard.tsx",
  "src/features/settings/components/create-account-card.tsx",
];

/**
 * Where the settings card is allowed to be mounted - the other half of Layer 1.
 *
 * `CreateAccountCard` *is* invitation surface 1, whole. Rendering it on a
 * second screen adds a second settings-card invitation without touching a
 * single i18n key or either file above, which is the cheapest third surface
 * available to anyone.
 *
 * ☠️ **THE WIZARD'S MOUNT SITES ARE DELIBERATELY NOT GUARDED.**
 * `AppOnboardingWizard` already renders from two shells (`protected-layout.tsx`
 * and `today-screen.tsx`), and that is one onboarding flow reachable two ways,
 * not two invitations - the rule counts surfaces, and the wizard's final panel
 * is one surface however many shells can open it. The card is different: it is
 * the invitation itself rather than a flow that contains one, so each mount is
 * another surface.
 */
const INVITATION_MOUNTS = ["src/features/settings/settings-screen.tsx"];

interface Phrase {
  locale: Locale;
  name: string;
  pattern: RegExp;
  /**
   * Strings this pattern MUST match. ☠️ Not decoration - see the probe test at
   * the bottom, and the three defects below that are the reason it is a list
   * rather than the single `probe` `positioning-copy` carries. Each shape the
   * spec's own patterns got wrong needs its own probe; one string can only pin
   * one of them.
   */
  probes: string[];
}

/**
 * Layer 2: registration-invitation phrasing, wherever it appears.
 *
 * A third surface written with *new* keys walks straight past Layer 1 - the
 * exact hole `restraint-copy` predicted for itself and then fell into twice
 * (#805, #963). So the phrasing is guarded too, and every hit must resolve to
 * an allowlisted namespace + key.
 *
 * ☠️☠️ **THE SPEC'S OWN TWO PATTERNS WERE BOTH BROKEN, AND A THIRD DEFECT WAS
 * FOUND MEASURING THEM.** All three are why `probes` exists:
 *
 * 1. `/създа\w*\s+акаунт/i` - the bg pattern as written on #1812 - **matches
 *    nothing at all.** JS `\w` is ASCII-only, so `\w*` matches zero characters
 *    and `\s+` is then asked to match `й`. It would have gone green on the very
 *    strings it was written for. The spec warned about a *trailing* `\b`; the
 *    identical defect sat mid-pattern. Hence `\p{L}` with the `u` flag.
 * 2. `/creat(e|ing)\s+an\s+account/i` **misses the article-less form** - and
 *    "Create account" is exactly what `settings:guestInvite.cta` and
 *    `auth:conversion.submit` say today. A third surface labelled *Create
 *    account* walks past a pattern that requires the article.
 * 3. Both spec patterns **miss the possessive form.** `auth:conversion.title`
 *    reads "Create your account" / "Създай своя акаунт" - neither the spec's
 *    sweep table nor #1809 named it. One optional intervening word covers
 *    *an*, *your*, *a* and *my* in one shape; it is the same slot
 *    `restraint-copy` uses for `without any pressure`.
 *
 * ⚠️ Re-running any of this by hand: **shell `grep -i` does not case-fold
 * Cyrillic under the C locale**, so `Създай` is missed and the sweep
 * under-reports. JS `/i` does fold it.
 *
 * ☠️ **THE PATTERNS ARE THE INVITATION, NEVER THE NOUN.** `registered account`
 * and `регистриран акаунт` are the approved vocabulary in `CONTEXT.md`
 * § *Accounts* for a state a user is in, and they must stay legal - a UI label
 * naming that state is not a step toward it. So the verb forms are guarded
 * (`register`, `registering`, `регистрация`, `регистрирай`) and the adjective
 * is not. This is the line `restraint-copy` draws between `no pressure` and
 * bare `pressure`, and `practice-copy` draws again.
 */
const INVITATION_PHRASES: Phrase[] = [
  {
    locale: "en",
    name: "en: create an account",
    pattern: /creat(?:e|ing)\s+(?:\w+\s+)?account/i,
    // Article-less, articled and possessive - defects 2 and 3 above.
    probes: ["Create account", "Create an account to protect your data", "Create your account"],
  },
  {
    locale: "en",
    name: "en: sign up",
    pattern: /\bsign[-\s]?up\b/i,
    probes: ["Sign up", "Sign-up to keep your data."],
  },
  {
    locale: "en",
    name: "en: register",
    // ☠️ `registered` must NOT match: `\b` after the optional `ing` refuses the
    // `ed`. The probes below are the only thing proving that still holds.
    pattern: /\bregister(?:ing)?\b/i,
    probes: ["Register to save your progress.", "Registering keeps your data."],
  },
  {
    locale: "bg",
    name: "bg: създай акаунт",
    // ☠️ `\p{L}` + `u`, never `\w` - defect 1 above. The optional word covers
    // "своя"; the stem covers създай / създадеш / създаване / създавайки.
    pattern: /създа\p{L}*\s+(?:\p{L}+\s+)?акаунт/iu,
    probes: [
      "Създай акаунт, за да запазиш данните си.",
      "Създай своя акаунт",
      "докато не създадеш акаунт",
    ],
  },
  {
    locale: "bg",
    name: "bg: регистрация",
    pattern: /регистраци\p{L}*/iu,
    probes: ["Регистрация", "Пропусни регистрацията"],
  },
  {
    locale: "bg",
    name: "bg: регистрирай се",
    pattern: /регистрирай\p{L}*/iu,
    probes: ["Регистрирай се, за да запазиш напредъка си."],
  },
];

/**
 * Where registration-invitation phrasing is allowed to appear.
 *
 * ☠️☠️ **THIS LIST IS PERMANENT BY DESIGN, WHICH IS THE OPPOSITE OF ITS
 * SIBLINGS' - HENCE THE NAME.** `restraint-copy`'s `ALLOWED` and
 * `positioning-copy`'s exemptions hold live offences awaiting a copy call, and
 * both files argue that emptying them is the finished state. Not here: these
 * are the surfaces the rule *permits*, so an empty list would mean the app has
 * no way to register at all. **Do not "finish" it by driving it to zero.**
 * Removing an entry is a product decision about a surface, never a tidy-up.
 *
 * ☠️ **EVERY ENTRY NAMES ITS NAMESPACE AS WELL AS ITS KEY.** A key-only entry
 * exempts the same dotted path in every other namespace - a blind spot inside
 * the guard built to remove one. `restraint-copy` carries the same warning.
 *
 * Entries are not locale-scoped, because these surfaces are locale-symmetric by
 * construction: `locale-parity.test.ts` fails on a key present in one locale
 * and missing in the other, so an entry that covers `en` covers `bg` or the
 * parity test is already red.
 *
 * The prefix entries are deliberately per-**surface** rather than per-string,
 * because a surface is what this rule counts. `auth:signUp.*` is the
 * registration screen; every string on it is on the destination, not a step
 * toward it.
 *
 * ☠️ **NO `onboarding` NAMESPACE EXISTS.** #1812 assumed one.
 * `app-onboarding-wizard.tsx` calls `useTranslation("settings")`, so the
 * wizard's line is `settings:onboarding.guestInviteLine`. Both allowlisted
 * invitation surfaces live in `settings`.
 */
const ALLOWED_SURFACES: { namespace: string; keyPattern: RegExp; why: string }[] = [
  {
    namespace: "settings",
    keyPattern: /^guestInvite\./,
    why: "Invitation surface 1 - the settings card (#1446).",
  },
  {
    namespace: "settings",
    keyPattern: /^onboarding\.guestInviteLine$/,
    why: "Invitation surface 2 - one line on the onboarding wizard's final panel.",
  },
  {
    namespace: "auth",
    keyPattern: /^signUp\./,
    why: "The registration screen itself. It IS the destination, not an invitation to it.",
  },
  {
    namespace: "auth",
    keyPattern: /^conversion\./,
    why:
      "The guest -> registered conversion form, which is where both invitation surfaces " +
      "navigate to. ☠️ Named by neither #1809 nor #1812's sweep; found by measuring.",
  },
  {
    namespace: "auth",
    keyPattern: /^landingPage\.(?:createAccountCta|guestDurability)$/,
    why:
      "☠️ Born-red traps. The public web landing is pre-entry - a returning visitor's front " +
      "door rather than a surface inside the practice - and #1439 keeps its links on purpose. " +
      "#1809 named the CTA; it never named `guestDurability`, which says '…until you create " +
      "an account - browsers can clear it.'",
  },
  {
    namespace: "auth",
    keyPattern: /^signIn\.signUpLink$/,
    why:
      "The sign-in screen's link to its sibling screen - auth chrome, not a product surface. " +
      "⚠️ This one is a RULING NEITHER #1809 NOR #1870 MADE: both spoke about create-account " +
      "phrasing, and 'Sign up' on the sign-in screen only came into scope when this guard " +
      "widened to the sign-up family. Read as pre-entry on the same grounds as landingPage. " +
      "If an owner disagrees, the fix is the copy or the entry, not the pattern.",
  },
  {
    namespace: "navigation",
    keyPattern: /^breadcrumb\.signUp$/,
    why: "Breadcrumb chrome naming the /sign-up route. It labels a destination already reached.",
  },
];

const ROOT = join(__dirname, "..");
const STRINGS = LOCALE_STRINGS;

const isAllowed = (namespace: string, key: string) =>
  ALLOWED_SURFACES.some(
    (allowed) => allowed.namespace === namespace && allowed.keyPattern.test(key),
  );

/** Every string in `locale` this guard is willing to look at. */
const corpus = (locale: Locale) =>
  STRINGS[locale].filter(({ namespace }) => !EXCLUDED_NAMESPACES.includes(namespace));

/** Renders offenders for a failure message: which key said it, and what it said. */
const describeEntries = (entries: LocaleString[]) =>
  entries.map(({ namespace, key, text }) => `${namespace}:${key} - ${text}`);

describe("registration invitations live on exactly two surfaces", () => {
  it("reads both locales and every namespace but the excluded one", () => {
    const namespaces = new Set(STRINGS.en.map((entry) => entry.namespace));

    // Positive control: `loadLocale` reading an empty or moved directory would
    // make every scan below vacuously green.
    expect(namespaces.size).toBeGreaterThanOrEqual(20);
    expect(namespaces).toContain("auth");
    expect(namespaces).toContain("settings");
    expect(namespaces).toContain("navigation");

    // And the exclusion is load-bearing rather than a leftover: `policies` is
    // really in the enumerator, and really does still say the phrase.
    //
    // ☠️ The patterns are READ FROM `INVITATION_PHRASES`, never retyped here. A
    // retyped copy keeps passing after the real pattern is narrowed, and a
    // positive control that cannot go stale-green is the whole point of one.
    expect(namespaces).toContain("policies");
    const enPhrases = INVITATION_PHRASES.filter((phrase) => phrase.locale === "en");
    const policyHits = STRINGS.en.filter(
      ({ namespace, text }) =>
        namespace === "policies" && enPhrases.some(({ pattern }) => pattern.test(text)),
    );
    expect(policyHits.length).toBeGreaterThanOrEqual(4);

    expect(corpus("en").every(({ namespace }) => namespace !== "policies")).toBe(true);
    expect(corpus("bg").length).toBeGreaterThan(0);
  });

  /**
   * ☠️☠️ **THE TEST THAT KEEPS THE PATTERNS HONEST**, and the reason the bg one
   * can be trusted at all. JavaScript's `\b` and `\w` are defined against
   * ASCII, so a Cyrillic pattern built from either matches NOTHING and passes
   * forever - which is precisely what #1812's bg pattern did. Two of the
   * patterns here have no live copy to catch outside the allowlist, and these
   * probes are their only evidence they work.
   */
  it.each(
    INVITATION_PHRASES.flatMap(({ name, pattern, probes }) =>
      probes.map((probe) => ({ name, pattern, probe })),
    ),
  )("$name matches its probe: $probe", ({ pattern, probe }) => {
    expect(pattern.test(probe)).toBe(true);
  });

  /**
   * The mirror of the probes, and the reason these patterns can be widened
   * without fear. The vocabulary `CONTEXT.md` § *Accounts* fixes for the state
   * a user is in must stay sayable: a label reading "Registered account" is not
   * a step toward one, and a guard that forbids it would be forbidding the
   * glossary.
   */
  it("leaves the account-state vocabulary alone, in both locales", () => {
    const legal = [
      { locale: "en" as const, text: "Registered account" },
      { locale: "en" as const, text: "You are signed in to a registered account." },
      { locale: "bg" as const, text: "Регистриран акаунт" },
      { locale: "bg" as const, text: "при регистриран акаунт, да излезеш" },
    ];

    for (const { locale, text } of legal) {
      for (const phrase of INVITATION_PHRASES.filter((entry) => entry.locale === locale)) {
        expect({ phrase: phrase.name, text, matched: phrase.pattern.test(text) }).toEqual({
          phrase: phrase.name,
          text,
          matched: false,
        });
      }
    }
  });

  /**
   * Layer 1. Reusing the existing copy is the cheapest way to build a third
   * invitation, and no phrase pattern can see it - the phrase is already
   * allowlisted at its key.
   *
   * ☠️ Scanned with `stripComments`, which blanks prose and keeps string
   * literals. Both halves matter: the keys live inside string literals, so
   * blanking strings would erase everything this test can see, and a comment
   * merely *naming* `guestInvite` (this rule is explained in comments on both
   * files) would otherwise read as a third call site.
   */
  it("exactly two source files reference the guestInvite copy", () => {
    const referencing = sourceFiles(ROOT, { dirs: ["src", "app"] }).filter((file) =>
      /guestInvite/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );

    expect(referencing.sort()).toEqual([...INVITATION_SOURCES].sort());
  });

  /**
   * The other half of Layer 1, and the half the key scan cannot do.
   *
   * ☠️ `settings-screen.tsx` mounts the whole invitation without naming one of
   * its keys, so the scan above is green on a file that renders the card. A
   * second mount is a second settings-card invitation for free.
   *
   * ☠️ **THE PATTERN IS THE JSX TAG, NOT THE IDENTIFIER** - the same shape
   * `source-scan.ts` uses for `<Modal`, and for the same reason. A bare
   * `/\bCreateAccountCard\b/` matches the *import* line, so deleting the render
   * and leaving the import behind kept this test green: it asserted "files that
   * mention the card", which is not the thing the rule counts. Mutation-tested
   * both ways - a new mount turns it red, and so does removing the only one.
   *
   * The card's own definition file needs no exclusion under this pattern:
   * `export function CreateAccountCard()` is not a JSX tag, and defining a
   * component was never mounting it.
   */
  it("the settings card is mounted on exactly one screen", () => {
    const mounting = sourceFiles(ROOT, { dirs: ["src", "app"] }).filter((file) =>
      /<CreateAccountCard[\s/>]/.test(stripComments(readFileSync(join(ROOT, file), "utf8"))),
    );

    expect(mounting.sort()).toEqual([...INVITATION_MOUNTS].sort());
  });

  /** Layer 2. Every registration-invitation phrase resolves to an allowlisted surface. */
  it.each(INVITATION_PHRASES)(
    "$name appears only on allowlisted surfaces",
    ({ locale, pattern }) => {
      const offenders = corpus(locale)
        .filter(({ text }) => pattern.test(text))
        .filter(({ namespace, key }) => !isAllowed(namespace, key));

      expect(describeEntries(offenders)).toEqual([]);
    },
  );

  /**
   * Neither layer can go quietly vacuous.
   *
   * An allowlist entry that matches no live key is not harmless: it stops
   * documenting a real surface and sits there ready to cover whatever copy
   * lands at that path next. Requiring each entry to still name live strings
   * that still match a pattern means a renamed key or a rewritten string forces
   * the entry to be revisited in the same change.
   */
  it.each(ALLOWED_SURFACES)(
    "the allowlist entry for $namespace $keyPattern still names live copy",
    ({ namespace, keyPattern }) => {
      const matches = STRINGS.en.filter(
        (entry) => entry.namespace === namespace && keyPattern.test(entry.key),
      );
      expect(matches.length).toBeGreaterThan(0);

      const patterns = INVITATION_PHRASES.filter((phrase) => phrase.locale === "en");
      const stillInviting = matches.filter(({ text }) =>
        patterns.some(({ pattern }) => pattern.test(text)),
      );
      expect(stillInviting.length).toBeGreaterThan(0);
    },
  );

  /**
   * The positive half, and the pattern `anti-streak-copy.test.ts` keeps as its
   * remaining reason to exist: **a guard that only forbids goes quietly vacuous
   * the moment the copy it protects is deleted.** Delete the settings card's
   * strings and every ban above passes on an app with no invitation at all.
   *
   * So the two allowed surfaces are pinned to still say something, in both
   * locales. Pinned by shape rather than by exact wording - the copy is the
   * owner's to change, the existence of exactly these two surfaces is not.
   */
  it.each(["en", "bg"] as const)(
    "%s still says both allowed invitations, so the bans above are not guarding an empty app",
    (locale) => {
      const at = (namespace: string, key: string) =>
        STRINGS[locale].find((entry) => entry.namespace === namespace && entry.key === key);

      // Surface 1 - the settings card: a title, a body per platform, and a CTA.
      for (const key of [
        "guestInvite.title",
        "guestInvite.body",
        "guestInvite.bodyWeb",
        "guestInvite.cta",
      ]) {
        expect({ key, text: at("settings", key)?.text ?? "" }).toEqual({
          key,
          text: expect.stringMatching(/\S/),
        });
      }

      const card = INVITATION_PHRASES.filter((phrase) => phrase.locale === locale);
      for (const key of ["guestInvite.title", "guestInvite.cta"]) {
        const text = at("settings", key)?.text ?? "";
        expect({ key, invites: card.some(({ pattern }) => pattern.test(text)) }).toEqual({
          key,
          invites: true,
        });
      }

      // Surface 2 - one line on the wizard's final panel, and it stays ONE line.
      const line = at("settings", "onboarding.guestInviteLine")?.text ?? "";
      expect(line).toMatch(/\S/);
      expect(card.some(({ pattern }) => pattern.test(line))).toBe(true);
      expect(line).not.toContain("\n");
    },
  );
});
