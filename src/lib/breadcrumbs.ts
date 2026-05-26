export interface Breadcrumb {
  label: string;
  href?: string;
}

// Map of exact static paths to their i18n label keys
const STATIC_ROUTES: Record<string, string> = {
  "/history": "breadcrumb.history",
  "/support": "sidebar.support",
  "/progress": "breadcrumb.progress",
  "/legal": "breadcrumb.legal",
  "/notifications": "sidebar.notifications",
  "/settings": "sidebar.settings",

  "/modules": "sidebar.modules",
  "/modules/act": "sidebar.act",
  "/modules/act/committed-action": "breadcrumb.committedAction",
  "/modules/act/committed-action/new": "breadcrumb.new",
  "/modules/act/connection": "breadcrumb.connection",
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
  "/modules/dbt": "sidebar.dbt",

  "/tools": "sidebar.tools",
  "/tools/mood-tracker": "sidebar.moodTracker",
  "/tools/mood-tracker/new": "breadcrumb.new",
  "/tools/journal": "sidebar.journal",
  "/tools/journal/new": "breadcrumb.new",
  "/tools/breathing": "sidebar.breathing",
  "/tools/mindfulness": "sidebar.mindfulness",
  "/tools/grounding": "sidebar.grounding",
  "/tools/gratitude-log": "sidebar.gratitudeLog",
  "/tools/gratitude-log/new": "breadcrumb.new",
  "/tools/meditation": "sidebar.meditation",
  "/tools/meditation/learn": "breadcrumb.learn",
  "/tools/meditation/daily-life": "breadcrumb.dailyLife",
  "/tools/meditation/session/log": "breadcrumb.logSession",
  "/tools/meditation/sessions": "breadcrumb.sessions",
  "/tools/meditation/stages": "breadcrumb.stages",
  "/tools/sleep": "sidebar.sleep",
  "/tools/sleep/new": "breadcrumb.new",
  "/tools/habits": "sidebar.habits",
  "/tools/habits/new": "breadcrumb.new",
  "/tools/habits/history": "breadcrumb.history",
  "/tools/habits/learn": "breadcrumb.learn",
  "/tools/habits/onboarding": "breadcrumb.onboarding",
};

// Path segments that group sub-routes but have no own breadcrumb
const TRANSPARENT_SEGMENTS = new Set(["session"]);

// Known named sub-segments that appear after dynamic segments
const KNOWN_SUB_SEGMENTS: Record<string, string> = {
  edit: "breadcrumb.edit",
  log: "breadcrumb.log",
};

// Detail routes whose dynamic segment is a known slug (not an opaque id): map the
// slug to its real title key (resolved cross-namespace from `cbt`). Opaque-id
// routes (e.g. UUID records) aren't here and fall back to the generic label.
const SLUG_LABEL_KEYS: Record<string, (slug: string) => string> = {
  "/tools/mindfulness": (slug) => `cbt:mindfulness.exercises.${slug}.title`,
  "/tools/breathing": (slug) => `cbt:breathing.exercises.${slug}.title`,
  "/tools/grounding": (slug) => `cbt:grounding.techniques.${slug}.title`,
};

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
    } else if (TRANSPARENT_SEGMENTS.has(segment)) {
      // transparent group - skip but keep prevWasKnown
    } else if (KNOWN_SUB_SEGMENTS[segment] !== undefined) {
      crumbs.push({ label: t(KNOWN_SUB_SEGMENTS[segment]), href: isLast ? undefined : path });
      prevWasKnown = true;
    } else if (prevWasKnown) {
      // Dynamic segment following a known path. A slug-based route resolves to a
      // real title; an opaque id falls back to the generic label.
      const parentPath = "/" + segments.slice(0, i).join("/");
      const resolveKey = SLUG_LABEL_KEYS[parentPath];
      const label = resolveKey ? t(resolveKey(segment)) : t("breadcrumb.entry");
      crumbs.push({ label, href: isLast ? undefined : path });
      prevWasKnown = false;
    }
    // unknown segment after already-unknown parent → skip
  }

  return crumbs;
}
