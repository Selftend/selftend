import { Redirect } from "expo-router";

/**
 * Compatibility shim, not a screen. #851 folded the per-stage detail screen
 * into the stages list, where every stage expands in place - but a bookmarked
 * `/tools/meditation/stages/5` should land on that list, not on a 404.
 */
export default function LegacyStageDetailRedirect() {
  return <Redirect href="/tools/meditation/stages" />;
}
