# ADR-0007: A vendor setting can break a promise the repo makes

Date: 2026-09-11 · Status: accepted · Origin: #2301 (map; #2302 measured it,
#2316 ruled it) · Recorded by: #2310

## Context

`src/i18n/locales/en/policies.json:46` promises, in the app's own words:

> "We do not use advertising SDKs, analytics tracking services, behavioral
> profiling tools, or social media pixels."

That promise is pinned to `policyVersion` as one tuple by
`src/features/policies/policy-content.test.ts`, appears on nine surfaces, and is
one of the four limbs of the marketing plan's offer. The repo treats it as
load-bearing and guards it accordingly.

**Cloudflare Web Analytics was nevertheless enabled on the `selftend.org` zone
from 2026-07-18 to 2026-09-10** — a wildcard rule (`host: *`, `paths: *`,
unpaused) in mode _"Enable, excluding visitor data in the EU"_, set to
auto-inject a beacon on every page. It was found by #2302 while reading the zone
for an unrelated question, and disabled the same day. **Zero page views and zero
visits were ever collected.**

Nobody in this repository did anything. No commit introduced it, no PR reviewed
it, no test could see it, and the product's own copy guard — which scans source
for banned phrasings — has no reach into a vendor dashboard. The setting was
either switched on by hand and forgotten, or defaulted on by the vendor;
Cloudflare re-enabled Web Analytics by default for free domains once already, on
2025-10-15.

Two further facts shape the decision, and both cut against the comfortable
reading:

- ☠️ **Why nothing was collected is not established.** The obvious explanation is
  that the Content-Security-Policy in `public/_headers` (`script-src 'self'`
  plus two inline hashes) refused `static.cloudflareinsights.com`. But on
  2026-09-11 an identically-stacked zone on the same account with automatic
  setup still enabled — `wikicanvas.org`, an Expo static export served through
  Cloudflare — was measured serving HTML containing **no beacon reference at
  all**, with none of the documented `no-transform` blocker present. So "the CSP
  stopped it" and "nothing was ever injected" both explain the observation, and
  the Wayback Machine holds no capture of `selftend.org` from the period. **It is
  now unknowable.** Routed to control-tower#134.
- ☠️ **The guard that may have held is asserted by nothing.**
  `test/theme-web-surfaces.test.ts` pins the two inline-script hashes and
  forbids `'unsafe-inline'`, but nothing forbids a third-party host: a CSP
  reading `script-src 'self' https://static.cloudflareinsights.com 'sha256-…'`
  passes every existing assertion.

## Decision

**1. "Use" means configured, and the promise was false for those eight weeks.**

The narrower reading — that a service collecting nothing was never "used" — was
available and is declined. It makes the promise's truth depend on a fact no
reader can check, and on a guard that may not even have been the thing that
stopped it. A promise that is true only because an unrelated header happened to
be strict is not one anyone should be asked to rely on. The record states the
lapse plainly rather than reasoning its way out of it.

**2. The remedy is a record, not a re-consent.**

No `policyVersion` bump and no re-gate. Nothing about any person's data changed:
nothing collected, nothing retained, no new recipient, processor or transfer, so
there is nothing for a user to consent to. A bump would re-gate every existing
user today — `policyVersion` is `2026-09-04-teen-floor` and v0.18.0 ships it —
teaching people that the consent gate is noise, in exchange for informing them
of an event that touched none of them. The disproportion runs the wrong way.

**3. The guard is the Content-Security-Policy, hardened to an allowlist.**

`test/theme-web-surfaces.test.ts` asserts the `script-src` token set is
_exactly_ `{'self', <palette hash>, <hydration hash>}`; any added host, scheme
source or `'unsafe-*'` fails CI.

**4. A live-HTML production check is declined.** It is a monitor, not a test: it
fails on production state unrelated to the commit under review, so it cannot sit
in PR CI without being flaky by design.

**5. The zone's Web Analytics state is re-read on the window's clock** — at the
2026-12-10 sitting and each subsequent window close, per `docs/measurement.md`
§ 6. ☠️ **Reading `ruleset.enabled`, never `auto_install`**, which stays `true`
after a disable and will report a disabled zone as armed.

## Consequences

**The general lesson, which is why this is an ADR and not a line in a spec:**
_a promise made in the app's copy can be broken by a setting in a vendor
dashboard that nobody in this repository ever touched._ The repo's guards —
tests, reviews, the copy scanner, the consent digest — all stop at the edge of
the codebase, and the promise does not.

So the durable guard has to be **in-repo and effective regardless of what the
vendor does**, which is what makes the CSP the right instrument and a dashboard
setting the wrong one. Where a vendor default could contradict a promise, prefer
the mechanism that makes the contradiction inert over the mechanism that merely
turns it off — a toggle can be flipped back by someone who is not us.

⚠️ This does not generalise into "audit every vendor dashboard on a cadence".
That is a duty nobody would keep, and #2316 declined to create one. It
generalises into: **when a promise is load-bearing, ask what would make a
violation inert rather than absent**, and put that in the repository.

The known remaining exposure is unchanged and accepted: the CSP guards scripts,
not every possible vendor behaviour, and no test watches the zone. The
2026-12-10 re-read is the whole of the periodic check, deliberately.
