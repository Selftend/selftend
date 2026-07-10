// Canonical 8-4-4-4-12 hex form produced by gen_random_uuid() - every entity id in the app.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a string is a well-formed uuid. Repositories use this to short-circuit
 * fetch-by-id calls whose id comes from a route param: PostgREST rejects a malformed
 * uuid in `.eq("id", ...)` with a 400 and the browser logs a console error for the
 * doomed request, so a bad id must return the normal "not found" result without a
 * network round trip.
 */
export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
