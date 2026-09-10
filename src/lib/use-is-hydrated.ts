import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * `false` for exactly one render: the one React uses to hydrate a page the
 * static export wrote (#2293). `true` on every render after that, and on every
 * render that is not a hydration at all - native, a client-side navigation, a
 * root mounted with `createRoot`.
 *
 * The web files are rendered in Node with what Node can know: no window, no
 * `matchMedia`, no user agent, no storage. Anything the browser knows on its
 * first render that Node did not - the device's colour scheme, an Android
 * user agent - must NOT change that first render, because React hydrates by
 * comparing it with the file: a different element throws the whole page away
 * and renders it again from scratch, and a different attribute is silently
 * left as the file had it (a dark-mode visitor would keep the light palette's
 * inline tokens and read dark text on a dark page). So a component reads
 * this, renders what the file carries while it is `false`, and applies what
 * the browser knows on the re-render React schedules the moment hydration
 * commits - the pattern `useSyncExternalStore` exists for.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
