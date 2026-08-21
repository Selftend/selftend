import { useState } from "react";
import { router, usePathname, type Href } from "expo-router";

import { computeBreadcrumbs, type Breadcrumb } from "./breadcrumbs";
import { consumeOrigin, recordOrigin } from "@/src/stores/navigation-origin-store";

/**
 * The pathname a push will land on, with the address-bar noise stripped.
 *
 * `router.push` takes either a string or `{ pathname, params }`, and the bell
 * uses the object form to bring a module's row into view. Only the pathname is
 * ever compared against `usePathname()`, so the query string and any dynamic
 * segment have to be resolved here: `/tools/journal/[id]` with `{ id: "3f9a" }`
 * arrives as `/tools/journal/3f9a`, and comparing the un-substituted form would
 * silently never match - the screen would just quietly show Up, which is exactly
 * the invisible failure mode O3 chose opt-out recording to avoid.
 */
export function targetPathname(href: Href): string {
  if (typeof href === "string") return href.split("?")[0].split("#")[0];

  const { pathname, params } = href as { pathname: string; params?: Record<string, unknown> };
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
 * global nav chrome - `SidebarNav`, the hamburger, `InvisibleHeader`'s brand
 * link - keeps calling `router.push` directly. That inversion is deliberate. The
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

  return (href: Href) => {
    recordOrigin({ origin: pathname, forPathname: targetPathname(href) });
    router.push(href);
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
 * A `useState` initialiser rather than an effect: it runs exactly once for the
 * component instance, and it runs *before* the first paint, so the Escape never
 * renders a bare Up arrow for a frame and then grows a name beside it.
 *
 * A web reload loses the Origin and the Escape falls back to Up. That is
 * correct, not merely tolerated (O7) - a reload *is* a cold arrival, and so is a
 * deep link from a notification.
 */
export function useEscapeOrigin(pathname: string): string | null {
  const [origin] = useState(() => consumeOrigin(pathname));
  return origin;
}
