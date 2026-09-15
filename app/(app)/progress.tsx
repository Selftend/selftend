import { Redirect } from "expo-router";

/**
 * `/progress` is no longer a page (#2431). Looking back left the product; its
 * band of one mark per recorded day was not moved anywhere, so the URL
 * redirects to Home rather than to a replacement.
 *
 * The FILE survives its screen because a bookmarked or typed `/progress` has to
 * land somewhere. Unlike `/tools`, nothing lives under this segment, so it is
 * not a transparent breadcrumb segment and needs no entry in
 * `src/lib/breadcrumbs.ts`: the redirect fires before a trail can render.
 */
export default function ProgressRedirectScreen() {
  return <Redirect href={"/"} />;
}
