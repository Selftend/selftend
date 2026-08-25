import { useEffect, useState } from "react";
import { router, usePathname, type Href } from "expo-router";

import { computeBreadcrumbs, type Breadcrumb } from "./breadcrumbs";
import { clearOrigin, peekOrigin, recordOrigin } from "@/src/stores/navigation-origin-store";

type ParamsRecord = Record<string, unknown>;

/**
 * The options `router.push` takes beside the href, forwarded verbatim.
 *
 * Taken off `router.push` rather than imported: expo-router keeps
 * `NavigationOptions` internal to `global-state/types`, and the repo already
 * reads router argument types positionally (`Parameters<typeof router.replace>[0]`).
 *
 * The helper has to express everything the call sites it replaces could express,
 * or migrating one quietly changes how the app navigates. `dangerouslySingular`
 * is the live case (#1266): ACT's "Also try" row is a lateral jump - "the tool
 * you jump to may be the one you came from two hops ago" (#1027) - and passes
 * the flag so the stack does not grow a second copy of a screen already in it.
 */
type PushOptions = Parameters<typeof router.push>[1];

/** An expo-router route group - `/(app)`, `/(tabs)` - which `usePathname` omits. */
const GROUP_SEGMENT = /\/\([^)]*\)/g;

/**
 * The pathname a push will land on, with the address-bar noise stripped.
 *
 * `router.push` takes either a string or `{ pathname, params }`, and the bell
 * uses the object form to bring a module's row into view. Only the pathname is
 * ever compared against `usePathname()`, so everything `usePathname()` does not
 * report has to come off here. Three things do not survive into it:
 *
 * - the **query string and fragment**, which the address bar carries and the
 *   route does not;
 * - a **dynamic segment**, which arrives substituted - `/tools/journal/[id]`
 *   with `{ id: "3f9a" }` is reported as `/tools/journal/3f9a`;
 * - a **route group**, which expo-router strips. ⚠️ Hrefs in this repo are
 *   routinely written `/(app)/settings` rather than `/settings` - the sidebar's
 *   whole table is - so a migrated call site copying that form is the likeliest
 *   way to record a target that can never match.
 *
 * A mismatch does not throw. It just silently never matches, and the destination
 * quietly shows Up - the invisible failure mode O3 chose opt-out recording to
 * avoid, reintroduced one call site at a time.
 */
export function targetPathname(href: Href): string {
  const raw = typeof href === "string" ? href : href.pathname;
  const params = typeof href === "string" ? undefined : (href.params as ParamsRecord | undefined);

  const withoutQuery = raw.split("?")[0].split("#")[0];
  const withoutGroups = withoutQuery.replace(GROUP_SEGMENT, "");
  const pathname = withoutGroups === "" ? "/" : withoutGroups;
  if (!params) return pathname;

  return pathname.replace(/\[(?:\.\.\.)?([^\]]+)\]/g, (whole, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) return whole;
    return Array.isArray(value) ? value.join("/") : String(value);
  });
}

/**
 * The one navigation helper that records an Origin (#1261, O3).
 *
 * Recording is **opt-out, not opt-in**: every push through this helper records
 * `{ origin: <where you are>, forPathname: <where you are going> }`, and the
 * global nav chrome does not go through it. That set is **five surfaces, and
 * only two of them are a call anyone could forget to migrate**: `SidebarNav`'s
 * rows and `InvisibleHeader`'s brand link navigate with `<Link href>` and the
 * hamburger does not navigate at all, so there is nothing there to leave out;
 * `UserMenu` and `ScreenBreadcrumb` do call `router.push` and stay bare on
 * purpose (#1265). The whole set is enumerated, with the reasoning that
 * distinguishes those two, in `src/components/app/nav-chrome-origin.test.ts`,
 * which fails if any of them starts recording. That inversion is deliberate. The
 * cross-link set is actively growing (#1192 added nine off-trail pushes hours
 * after the rule was charted) and opt-in fails *invisibly*: a link that forgets
 * just quietly shows Up, with nothing on screen to notice. Opt-out is a small
 * fixed set someone would have to actively break.
 *
 * Recording an *on-trail* push is harmless and is not worth a call-site
 * decision: the off-trail test runs at render on the destination and simply
 * ignores an Origin that is already on the trail.
 *
 * The nav chrome's opt-out is substantive rather than an optimisation. Those are
 * "go somewhere else entirely" affordances whose targets are top-level routes
 * already rooted correctly, and an Escape reading "← CBT" on Settings would
 * compete with the sidebar itself as the way back.
 */
export function usePushWithOrigin() {
  const pathname = usePathname();

  return (href: Href, options?: PushOptions) => {
    recordOrigin({ origin: pathname, forPathname: targetPathname(href) });
    // Forwarded only when given, never as an explicit `undefined`. Jest's
    // `toHaveBeenCalledWith(href)` does not match a call of `(href, undefined)`,
    // so passing it unconditionally would break the existing navigation
    // assertion at every migrated call site in the app for no behaviour gained.
    if (options) router.push(href, options);
    else router.push(href);
  };
}

/**
 * Whether an Origin actually diverges from this screen's own Up.
 *
 * R2's trigger is *off-trail*, not *whenever an Origin exists*. Inside a subtree
 * the two destinations are the same route, so an unconditional Origin rule could
 * only ever differ **by being wrong** - `/modules/cbt` → `/modules/cbt/history`
 * records an Origin, and the history screen's Up is `/modules/cbt` already.
 *
 * `upHref` is part of the test, not just the crumb hrefs: on a one-crumb screen
 * the trail carries no crumb for the root, so an Origin of `/` would look
 * off-trail while leading exactly where Up already goes.
 */
export function isOffTrail(
  origin: string,
  pathname: string,
  crumbs: Breadcrumb[],
  upHref: string,
): boolean {
  if (origin === pathname || origin === upHref) return false;
  return !crumbs.some((crumb) => crumb.href === origin);
}

/**
 * The Origin's visible name, read off the same route map the trail uses (O6).
 *
 * Never carried as copy at the call site: that would put an i18n string in every
 * cross-link, and the next one to forget would render nothing. The name is the
 * Origin's own terminal crumb - `/modules/cbt` names itself "CBT".
 *
 * `null` where the route map has no name for it. That is the generic opaque-id
 * fallback, and rendering it would put "← Entry" on screen - a lying exit label
 * in the one place R5 promised the user would be told where they are going.
 * Callers fall back to Up rather than lead somewhere they cannot name.
 */
export function nameOrigin(origin: string, t: (key: string) => string): string | null {
  const crumbs = computeBreadcrumbs(origin, t);
  const terminal = crumbs[crumbs.length - 1];
  if (!terminal || terminal.unresolved) return null;
  return terminal.label;
}

/**
 * The Origin this screen was arrived with, held for the screen's lifetime (O4).
 *
 * Consumed on **mount**, never on read. The Escape reads its destination on
 * every render, so a consume-on-read would clear the store on the first render
 * and lose the Origin before the second - which is why the value is parked in
 * local state here rather than read from the store where it is used.
 *
 * Split into a pure `peekOrigin` during render and a `clearOrigin` in a mount
 * effect, rather than one clearing read. Reading during render is what gives the
 * Escape its destination on the *first* paint, so it never shows a bare Up arrow
 * for a frame and then grows a name beside it - but a read that also cleared
 * would be a side effect in render, and a render React discards and retries
 * (it may, and the React Compiler is on repo-wide) would lose the Origin for
 * good. The effect only runs for a render that actually committed.
 *
 * `useState` still holds the value for the screen's lifetime: the clear lands
 * right after mount, so every later render peeks an empty store, and only the
 * captured value keeps the Escape pointing where the user came from.
 *
 * A web reload loses the Origin and the Escape falls back to Up. That is
 * correct, not merely tolerated (O7) - a reload *is* a cold arrival, and so is a
 * deep link from a notification.
 */
export function useEscapeOrigin(pathname: string): string | null {
  const [origin] = useState(() => peekOrigin(pathname));

  useEffect(() => {
    clearOrigin(pathname);
  }, [pathname]);

  return origin;
}
