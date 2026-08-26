import { exportUserData } from "@/src/features/settings/repository";

/**
 * "Does this guest hold user-created content?" - the warn-and-abandon gate's
 * check (#1444, spec §6): a guest signing in over content gets one calm
 * confirm; an empty guest signs straight in.
 *
 * Reuses `export_user_data` rather than a bespoke count query or RPC: the
 * export is the one server surface guaranteed to cover every tool table (the
 * export-completeness gate holds it to the live schema), so a tool added
 * tomorrow counts as content without anyone remembering this file. The
 * polarity is deliberate too - the set below names the NON-content keys and
 * anything unknown counts as content, because a stale entry here costs one
 * extra tap while a missing one costs silent data loss.
 */
const NON_CONTENT_EXPORT_KEYS = new Set([
  // Export metadata, not a row at all.
  "exportDate",
  // Lazily auto-upserted rows every account grows without the user creating
  // anything: the profile shell, and preferences (consent, onboarding,
  // language, reminders...). Spec §6 names consent/onboarding as not counting.
  "profile",
  "preferences",
  // Device plumbing written by enabling notifications, not tool content.
  "devicePushTokens",
  "webPushSubscriptions",
  // Customization of a tool's controls, not something made with the tool.
  "emotionPreferences",
  "widgetPreferences",
  // Already delivered to the team; signing in leaves nothing behind.
  "feedbackSubmissions",
]);

/** Pure half of the check, so the boundary is unit-testable without a client. */
export function exportHasUserContent(data: unknown): boolean {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  return Object.entries(data as Record<string, unknown>).some(([key, value]) => {
    if (NON_CONTENT_EXPORT_KEYS.has(key)) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    // A scalar under an unknown key is metadata-shaped, not a row.
    return false;
  });
}

/**
 * Whether the CURRENT session's account holds user-created content. Callers
 * own the failure policy; the guard fails toward warning (see its docblock).
 */
export async function guestHasContent(): Promise<boolean> {
  return exportHasUserContent(await exportUserData());
}
