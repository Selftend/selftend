import { exportUserData } from "@/src/features/settings/repository";

/**
 * Payload keys that do NOT count as user-created content for the
 * warn-and-abandon check (#1444, spec §6): auto-created rows (`profiles`,
 * `user_preferences`, `widget_preferences` - consent and onboarding state live
 * on `user_preferences`), the export's own timestamp, and the push rows -
 * device plumbing that exists because reminder consent was granted, not
 * content in any tool, so a guest who only toggled reminders is not warned
 * about "data" that is two subscription endpoints. `emotionPreferences`
 * deliberately DOES count: it is user-authored customization, and over-warning
 * is the safe side of that line.
 *
 * Everything else counts, including keys this set has never heard of: a new
 * tool's table joins `export_user_data` under the export-completeness gate and
 * lands here already counting. That direction is the safe default - over-warning
 * costs one calm dialog, under-warning silently strands someone's data.
 */
const NON_CONTENT_KEYS = new Set([
  "exportDate",
  "profile",
  "preferences",
  "widgetPreferences",
  "webPushSubscriptions",
  "devicePushTokens",
]);

/**
 * Whether an `export_user_data` payload holds user-created content in any tool.
 * Unexpected shapes count as content - see NON_CONTENT_KEYS for why the check
 * fails toward warning.
 */
export function holdsUserContent(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return true;
  }
  return Object.entries(payload).some(([key, value]) => {
    if (NON_CONTENT_KEYS.has(key)) return false;
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    // A scalar outside NON_CONTENT_KEYS is a payload shape this check does not
    // know; count it (the empty-guest e2e catches a metadata key that should
    // join the exclusion list instead).
    return true;
  });
}

/**
 * The warn-and-abandon check (#1444): does the current guest hold user-created
 * content? Reuses `export_user_data` rather than a bespoke count RPC - the
 * export is completeness-gated against the live schema, so a new tool's table
 * is covered here the moment it exists, with no second list to keep in sync.
 *
 * A failed fetch reports "has content": the only cost of a wrong `true` is a
 * dialog, while a wrong `false` signs away data unwarned.
 */
export async function guestHoldsContent(): Promise<boolean> {
  try {
    return holdsUserContent(await exportUserData());
  } catch {
    return true;
  }
}
