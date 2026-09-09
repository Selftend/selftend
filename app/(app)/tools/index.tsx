import { Redirect } from "expo-router";

/**
 * `/tools` is no longer a page (#2114). The hub listed a subset of what Home
 * already lists, so it redirects there rather than to a replacement.
 *
 * The FILE survives its screen because the segment is a real route directory -
 * every tool lives under `/tools/…` and none of those URLs moved - and because a
 * bookmarked or typed `/tools` has to land somewhere. `tools` is a transparent
 * breadcrumb segment (`src/lib/breadcrumbs.ts`), so nothing names this stub as an
 * ancestor and no Escape can be sent into it.
 */
export default function ToolsIndexRedirectScreen() {
  return <Redirect href={"/"} />;
}
