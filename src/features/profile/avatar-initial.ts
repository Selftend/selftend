/**
 * The letter to show when there is no avatar photo, or `null` when there is no
 * letter to honestly show.
 *
 * Shared by the header and the settings identity row (#1829), which is the
 * point: it used to be module-private in `profile-avatar.tsx` while settings
 * hand-rolled `displayName.charAt(0).toUpperCase()` beside it, and a guest's
 * empty string made that one render an empty circle. Its home mirrors
 * `avatar-url.ts`, beside `resolveDisplayName`, for the same reason those two
 * are shared: a second copy is the bug.
 *
 * ☠️ **`null` is not "no user" — it is "no name to take a letter from".** The
 * previous sentinel was the literal `"?"`, which was a refusal to invent an
 * identity but reads to a person as an error. Callers render a person glyph
 * instead (#1810): the truth is *no photo yet*, not *something went wrong*.
 * Returning `null` deletes the sentinel rather than promoting it to a value
 * every caller has to remember to test for.
 *
 * ☠️ The initial is never derived from the fallback WORD. `Guest` / `Гост`
 * would give a bold `G` / `Г` - a name initial the person never gave, that
 * changes when they change the interface language.
 */
export function getInitial(
  name: string | null | undefined,
  email: string | null | undefined,
): string | null {
  // `||` at every step, never `??`: an anonymous user's `email` is `""`, not
  // `undefined`, so `??` would take the empty string and index into nothing.
  const source = name?.trim() || email?.trim();
  if (!source) return null;

  return source[0].toUpperCase();
}
