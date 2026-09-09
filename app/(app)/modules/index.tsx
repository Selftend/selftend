import { Redirect } from "expo-router";

/**
 * `/modules` is no longer a page (#2114). The hub listed a subset of what Home
 * already lists, so it redirects there rather than to a replacement.
 *
 * The FILE survives its screen because the segment is a real route directory -
 * every module lives under `/modules/…` and none of those URLs moved - and because
 * a bookmarked or typed `/modules` has to land somewhere. `modules` is a
 * transparent breadcrumb segment (`src/lib/breadcrumbs.ts`), so nothing names this
 * stub as an ancestor and no Escape can be sent into it.
 */
export default function ModulesIndexRedirectScreen() {
  return <Redirect href={"/"} />;
}
