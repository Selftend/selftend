import { Redirect } from "expo-router";

/**
 * The alignment check-in folded onto the values screen (#1379). This stub is
 * MANDATORY, not a courtesy to old links.
 *
 * ☠️ Deleting the file does not 404. The segment is swallowed by its `[domain]`
 * sibling, which reads `domain="bulls-eye"`, fails its whitelist, and renders the
 * SAVE-ERROR string as a not-found message - in a bare safe-area view with no header,
 * no breadcrumb and no way back out.
 *
 * ⚠️ The route is also a routine step (`tool-routes.ts` maps `bullsEye`), so nothing
 * linking to it was never the same as nothing depending on it.
 */
export default function ActBullsEyeRedirect() {
  return <Redirect href="/modules/act/values" />;
}
