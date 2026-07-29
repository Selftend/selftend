import { router } from "expo-router";

/**
 * `router.back()` when there is history; otherwise replace with the fallback
 * route. When a page is the first of the session (deep link, bookmark, or a
 * web refresh) there is no back stack and `router.back()` silently no-ops -
 * the screen just sits there looking like the action failed (#475).
 */
export function backWithFallback(fallbackHref: string) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallbackHref as Parameters<typeof router.replace>[0]);
}
