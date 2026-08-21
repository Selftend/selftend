import { create } from "zustand";

export interface NavigationOrigin {
  /** The pathname the user was on when the navigation started. */
  origin: string;
  /** The pathname this Origin was recorded FOR - the push's target. */
  forPathname: string;
}

interface NavigationOriginState {
  pending: NavigationOrigin | null;
  recordOrigin: (entry: NavigationOrigin) => void;
  /**
   * Read the Origin recorded for `pathname` and clear it in one step.
   * Returns `null` - and leaves the store untouched - when the pending entry was
   * recorded for a different screen.
   */
  consumeOrigin: (pathname: string) => string | null;
}

/**
 * Where a screen learns it was reached from somewhere off its own trail (#1261,
 * clauses O1-O7 of the escape spec on #1167).
 *
 * The Escape leads Up, except when the arrival carried an Origin that is not on
 * this screen's breadcrumb trail - then it leads back there instead. Tapping the
 * bell on the CBT module home is the case the rule was written for: Reminders
 * sits at the root, so its Up is Home, and a user who came from CBT loses their
 * place. This store is how the arrival carries "you came from CBT".
 *
 * **In memory, never in the URL.** The obvious implementation is a route param,
 * and it is the wrong one for the same reason `thought-record-seed-store.ts`
 * (#739) rejected it: Expo Router serializes params into the address bar on web.
 * An Origin is a route, and on this app a route names which therapy module the
 * user was in - `/crisis?from=/modules/cbt` would put "this user was in CBT,
 * then opened crisis support" into browser history as one string. Sentry is
 * covered (`scrubBreadcrumb`, #996); the address bar is not. `sessionStorage`
 * was rejected too: it survives a reload at the price of putting a
 * health-adjacent route into storage and needing its own expiry story.
 *
 * **Never inferred from history either.** History in this repo does not describe
 * where the user came from: `dangerouslySingular` replaces entries rather than
 * adding them (#989), and the Escape itself navigates with `replace`. That is
 * what disqualifies `backWithFallback` (#475) as the escape primitive; it stays
 * correct for its Done-after-save call sites, which is why Completion is a
 * separate concept.
 *
 * **Consumed on mount, not read on render.** The pairing of `forPathname` with a
 * clearing read is what keeps a stale Origin from being served: without the
 * clear, an entry recorded for `/notifications` would still match when the user
 * reaches `/notifications` from the sidebar an hour later, and a render-time
 * guard would hand over a long-dead CBT. Consuming on mount closes that
 * structurally - the later arrival finds an empty store and correctly falls back
 * to Up. Deliberately not the `banner-inset-store` unmount-cleanup pattern,
 * which patches a store that *can* go stale; this one cannot.
 *
 * A mismatched read leaves the entry in place rather than clearing it. The
 * recording call site pushes in the same handler, so the target is the very next
 * screen to mount; treating some other screen's mount as a consumption would
 * throw away an Origin that was never delivered.
 */
export const useNavigationOriginStore = create<NavigationOriginState>((set, get) => ({
  pending: null,
  recordOrigin: (entry) => set({ pending: entry }),
  consumeOrigin: (pathname) => {
    const { pending } = get();
    if (!pending || pending.forPathname !== pathname) return null;
    set({ pending: null });
    return pending.origin;
  },
}));

/** Plain-function entry point, for the navigation helper rather than a component. */
export function recordOrigin(entry: NavigationOrigin) {
  useNavigationOriginStore.getState().recordOrigin(entry);
}

export function consumeOrigin(pathname: string): string | null {
  return useNavigationOriginStore.getState().consumeOrigin(pathname);
}
