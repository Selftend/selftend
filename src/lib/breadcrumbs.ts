export interface Breadcrumb {
  label: string;
  href?: string;
  /**
   * Set when the label is the generic fallback - an opaque-id segment no table
   * could name, rendered as "Entry". The crumb still has a correct href; it is
   * only its *name* that is missing.
   *
   * The Escape reads this to choose between "Back to {name}" and a bare "Go
   * back" (#1253). It has to be carried structurally: once the crumb is built,
   * a fallback label is indistinguishable from a real one, and recovering the
   * distinction by comparing against the translated word "Entry" would be right
   * in English and wrong in Bulgarian ("Запис").
   */
  unresolved?: true;
}

// Map of exact static paths to their i18n label keys
const STATIC_ROUTES: Record<string, string> = {
  "/support": "sidebar.support",
  "/progress": "breadcrumb.progress",
  "/routines": "sidebar.routines",
  "/routines/new": "breadcrumb.new",
  "/legal": "breadcrumb.legal",
  "/notifications": "sidebar.notifications",
  "/settings": "sidebar.settings",

  "/modules": "sidebar.modules",
  "/modules/act": "sidebar.act",
  "/modules/act/choice-point": "act:choicePoint.title",
  "/modules/act/committed-action": "breadcrumb.committedAction",
  "/modules/act/committed-action/new": "breadcrumb.new",
  "/modules/act/connection": "breadcrumb.connection",
  "/modules/act/connection/drop-anchor": "act:dropAnchor.title",
  "/modules/act/connection/new": "breadcrumb.new",
  "/modules/act/defusion": "breadcrumb.defusion",
  "/modules/act/defusion/new": "breadcrumb.new",
  "/modules/act/expansion": "breadcrumb.expansion",
  "/modules/act/expansion/new": "breadcrumb.new",
  "/modules/act/expansion/urge-surfing": "breadcrumb.urgeSurfing",
  "/modules/act/observing-self": "breadcrumb.observingSelf",
  "/modules/act/observing-self/new": "breadcrumb.new",
  "/modules/act/values": "breadcrumb.values",
  "/modules/act/values/bulls-eye": "breadcrumb.bullsEye",
  "/modules/cbt": "sidebar.cbt",
  "/modules/cbt/history": "sidebar.cbtHistory",
  "/modules/cbt/new": "breadcrumb.newRecord",
  "/modules/cbt/learn": "sidebar.cbtLearn",
  "/modules/cbt/goals": "breadcrumb.goals",
  "/modules/cbt/goals/new": "breadcrumb.new",
  "/modules/cbt/activities": "breadcrumb.activities",
  "/modules/cbt/activities/new": "breadcrumb.new",
  "/modules/cbt/values": "breadcrumb.values",
  "/modules/cbt/weekly-review": "breadcrumb.weeklyReview",
  "/modules/cbt/beliefs": "breadcrumb.beliefs",
  "/modules/cbt/beliefs/new": "breadcrumb.new",
  "/modules/cbt/exposure": "breadcrumb.exposure",
  "/modules/cbt/exposure/new": "breadcrumb.new",
  "/modules/cbt/tasks": "breadcrumb.tasks",
  "/modules/cbt/tasks/new": "breadcrumb.new",
  "/modules/cbt/anger": "breadcrumb.anger",
  "/modules/cbt/anger/new": "breadcrumb.new",
  "/modules/cbt/worry": "breadcrumb.worry",
  "/modules/cbt/worry/new": "breadcrumb.new",
  "/modules/cbt/self-care": "breadcrumb.selfCare",
  "/modules/cbt/recovery": "breadcrumb.recovery",
  // `cbt:saved.title` is the screen's headline - "You examined a thought." - so
  // it cannot serve as a crumb: the trail would read *Modules · CBT · You
  // examined a thought.* This is the one new label the escape spec adds (#1251).
  "/modules/cbt/saved": "breadcrumb.saved",
  "/modules/dbt": "sidebar.dbt",

  "/tools": "sidebar.tools",
  "/tools/check-in": "sidebar.moodTracker",
  "/tools/check-in/history": "breadcrumb.history",
  "/tools/check-in/new": "breadcrumb.new",
  "/tools/journal": "sidebar.journal",
  "/tools/journal/entries": "breadcrumb.entries",
  "/tools/journal/new": "breadcrumb.new",
  "/tools/breathing": "sidebar.breathing",
  "/tools/breathing/session": "breadcrumb.session",
  "/tools/breathing/new": "breadcrumb.new",
  // `history` must be claimed BEFORE the slug template below (#876): the
  // breathing/grounding dynamic-segment resolvers would otherwise push it
  // through `…techniques.history.title`, and the trail renders the raw
  // uppercased key. Sleep's fell back to the generic "Entry" — wrong label,
  // same family.
  "/tools/breathing/history": "breadcrumb.history",
  "/tools/grounding": "sidebar.grounding",
  "/tools/grounding/history": "breadcrumb.history",
  "/tools/gratitude-log": "sidebar.gratitudeLog",
  "/tools/gratitude-log/entries": "breadcrumb.history",
  "/tools/gratitude-log/favorites": "breadcrumb.favorites",
  "/tools/gratitude-log/new": "breadcrumb.new",
  "/tools/meditation": "sidebar.meditation",
  "/tools/meditation/learn": "breadcrumb.learn",
  "/tools/meditation/daily-life": "breadcrumb.dailyLife",
  "/tools/meditation/session": "breadcrumb.session",
  "/tools/meditation/sessions": "breadcrumb.sessions",
  "/tools/meditation/stages": "breadcrumb.stages",
  "/tools/meditation/practices": "breadcrumb.practices",
  "/tools/sleep": "sidebar.sleep",
  "/tools/sleep/new": "breadcrumb.new",
  "/tools/sleep/history": "breadcrumb.history",
  "/tools/habits": "sidebar.habits",
  "/tools/habits/new": "breadcrumb.new",
  "/tools/habits/history": "breadcrumb.history",
  "/tools/habits/learn": "breadcrumb.learn",

  // The (auth) group. These are leaves off the root, so they are one-crumb
  // screens whose trail hides and NOTHING changes on screen (#1251, T3). The
  // entries exist so the generic "Entry" fallback is not live on them - an
  // Escape that names its destination (#1253) would otherwise say "Entry".
  // Inventing a *Home / Sign in* trail would describe a hierarchy that does not
  // exist, which is why they get a crumb but never a trail.
  //
  // ⚠️ The route names and the form names are crossed, so check the screen
  // before "correcting" either label: `/reset-password` renders
  // `ForgotPasswordForm` (ask for a reset link) and `/update-password` renders
  // `ResetPasswordForm` (set the new password). Each label names the STEP the
  // user is on, which is why they happen to read straight even though the
  // components behind them do not.
  "/sign-in": "breadcrumb.signIn",
  "/sign-up": "breadcrumb.signUp",
  "/reset-password": "breadcrumb.resetPassword",
  "/update-password": "breadcrumb.updatePassword",
  "/verify-email": "breadcrumb.verifyEmail",
  // A transient OAuth-resolution screen: it IS the sign-in completing, so it
  // reuses that label rather than earning a string of its own.
  "/auth-callback": "breadcrumb.signIn",
};

// Path segments that group sub-routes but have no own breadcrumb
const TRANSPARENT_SEGMENTS = new Set(["session"]);

// Known named sub-segments that appear after dynamic segments
const KNOWN_SUB_SEGMENTS: Record<string, string> = {
  edit: "breadcrumb.edit",
  log: "breadcrumb.log",
  // LOAD-BEARING, do not delete as redundant. Most `…/new` routes have their
  // own STATIC_ROUTES row above, which wins first - but `/modules/act/choice-
  // point/new` does not, and it is the ticket's own headline example: without
  // this entry it renders "… / Choice point / Entry" (#1251). It also gives any
  // future `new` under an unmapped parent a real label instead of a second
  // "Entry" once the swallow fix stops dropping it.
  new: "breadcrumb.new",
};

// Detail routes whose dynamic segment is a known slug (not an opaque id): map the
// slug to its real title key (resolved cross-namespace from `cbt`). Opaque-id
// routes (e.g. UUID records) aren't here and fall back to the generic label.
const SLUG_LABEL_KEYS: Record<string, (slug: string) => string> = {
  "/tools/breathing": (slug) => `cbt:breathing.exercises.${slug}.title`,
  "/tools/grounding": (slug) => `cbt:grounding.techniques.${slug}.title`,
  "/tools/habits/learn": (slug) => `habits:learn.cards.${slug}.title`,
};

/**
 * The trail for a pathname, and the data the Escape's destination is read from.
 *
 * **Invariant: the trail always terminates in an href-less crumb** (#1251, T1a).
 * That absent href IS this module's marker for "you are here", and `ScreenEscape`
 * hops to the deepest crumb that still has one. A trailing href therefore makes
 * the Escape read one crumb too shallow - the current screen would be mistaken
 * for its own parent.
 *
 * The bug this replaced: an unmapped segment set `prevWasKnown` false and the
 * final branch then silently SKIPPED the segment after it, so
 * `/modules/act/choice-point/new` produced *Modules · ACT · Entry* with no crumb
 * for `new` and an href on the last crumb. Naming `choice-point` alone would
 * have hidden that until the next unmapped segment, so the rule is structural:
 * **a terminal segment always gets a crumb**, whatever the tables know about it.
 */
export function computeBreadcrumbs(pathname: string, t: (key: string) => string): Breadcrumb[] {
  if (pathname === "/" || pathname === "") return [];

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Breadcrumb[] = [];
  let prevWasKnown = true;

  for (let i = 0; i < segments.length; i++) {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (STATIC_ROUTES[path] !== undefined) {
      crumbs.push({ label: t(STATIC_ROUTES[path]), href: isLast ? undefined : path });
      prevWasKnown = true;
    } else if (TRANSPARENT_SEGMENTS.has(segment) && !isLast) {
      // transparent group - skip but keep prevWasKnown. Never when it lands
      // last: skipping the final segment would leave the PARENT as the terminal
      // crumb, still carrying its href, and break the invariant below.
    } else if (KNOWN_SUB_SEGMENTS[segment] !== undefined) {
      crumbs.push({ label: t(KNOWN_SUB_SEGMENTS[segment]), href: isLast ? undefined : path });
      prevWasKnown = true;
    } else if (prevWasKnown || isLast) {
      // Dynamic segment following a known path. A slug-based route resolves to a
      // real title; an opaque id falls back to the generic label.
      const parentPath = "/" + segments.slice(0, i).join("/");
      const resolveKey = SLUG_LABEL_KEYS[parentPath];
      crumbs.push(
        resolveKey
          ? { label: t(resolveKey(segment)), href: isLast ? undefined : path }
          : { label: t("breadcrumb.entry"), href: isLast ? undefined : path, unresolved: true },
      );
      prevWasKnown = false;
    }
    // An unmapped segment in the MIDDLE of a path still collapses into its
    // predecessor's crumb, which keeps a long unmapped path from reading as a
    // run of "Entry"s. A terminal one is always kept, so a wholly unmapped
    // two-segment tail can still read "Entry · Entry" - that is the invariant
    // being paid for, and today it only happens on `<Redirect>` stubs.
  }

  return crumbs;
}

/**
 * Up, read off the trail: **the deepest crumb that still carries an href**.
 *
 * That is the parent, because the terminal crumb is the current screen and
 * carries no href - the invariant `computeBreadcrumbs` guarantees above. Before
 * #1251 an unmapped segment could strand an href on the last crumb, and this
 * lookup then read one crumb too shallow, mistaking the current screen for its
 * own parent.
 *
 * `undefined` means the screen has no ancestor crumb at all - a one-crumb screen,
 * whose Up is the root. Callers own that fallback; the trail never emits a crumb
 * for the root.
 *
 * Lives here rather than inside `ScreenEscape` so the rule has ONE definition:
 * a test that re-derived it would silently follow the implementation wherever it
 * went, and the enforcement gate (#1263) needs a single symbol to assert on.
 */
export function findUpCrumb(crumbs: Breadcrumb[]): Breadcrumb | undefined {
  return [...crumbs].reverse().find((crumb) => crumb.href);
}
