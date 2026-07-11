/**
 * Normalize an unknown thrown value into a human-readable string.
 *
 * - `Error` instances return their `message`.
 * - Plain objects carrying a string `message` return that message.
 * - Anything else returns `fallback` (defaults to `""` to match the
 *   original `profile-avatar` variant that had no fallback argument).
 */
export function getErrorMessage(error: unknown, fallback = ""): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}
