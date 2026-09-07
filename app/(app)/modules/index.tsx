import { Redirect } from "expo-router";

/**
 * `/modules` stops being a page (#2114), for the same reason `/tools` does: Home
 * already renders the three module cards through the one card component (#1955), so
 * the index listed a strict subset of what Home shows. Its "where to start" guidance
 * was not lost with it — that copy folded into the first-run panel (#2111,
 * `settings:onboarding.appBody1`), which is where a person meets it once rather than
 * on a page they have to find.
 *
 * The file survives its screen because `modules` is still a real route DIRECTORY
 * holding CBT, ACT and DBT; a `/modules` that matched nothing would render
 * `+not-found` for a bookmark or a typed URL. Every deeper URL is unchanged.
 *
 * The segment is transparent in the trail (`src/lib/breadcrumbs.ts`, #2096), so no
 * crumb names this stub as an ancestor and no Escape hops into it.
 */
export default function ModulesIndexRedirect() {
  return <Redirect href="/" />;
}
