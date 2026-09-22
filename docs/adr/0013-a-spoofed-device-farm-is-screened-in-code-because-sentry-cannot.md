# ADR-0013: A spoofed device farm is screened in `beforeSend`, because Sentry cannot screen it inbound

Date: 2026-09-18 · Status: accepted · Origin: #2577 · Supersedes the decision recorded
in that issue's first comment

## Context

Three of the ten open Sentry issues — `SELFTEND-B`, `-D` and `-G` — carried one device
fingerprint, and it was not a real device: a `OnePlus8Pro` on `os.build`
`QKR1.191246.002` reporting a 288×448 screen at density 0.6625 where the real handset is
1440×3168, `processor_count` 2 against a real 8, `x86_64` listed ahead of `arm64-v8a`, a
battery frozen at exactly 85% and 35 °C on every event, and a `boot_time` two to four
minutes before each event. An emulator farm — a crawler or store scanner — on a
freshly-spun container each run.

#2577 ruled this should be dropped with a **Sentry inbound filter**, on good reasoning:
an inbound filter needs no release, so it reaches the already-installed base, which
matters because this repo has no OTA channel (`ota_updates.is_enabled: false` on the
events themselves). A `beforeSend` screen was rejected as the weaker option for exactly
that reason.

**The inbound filter does not exist.** Sentry's custom inbound filters key on error
message, release, log message, application metrics, request URL and user-agent; the
built-ins add browser extensions, legacy browsers, localhost, crawlers, health checks,
hydration and chunk-load errors, non-allowed domains, and an IP list. Event tags and
`contexts.device` / `contexts.os` are in neither set. Upstream is explicit rather than
merely silent: both requests for tag-keyed inbound filters were closed **not planned** on
2026-06-04 — [getsentry/sentry#22874](https://github.com/getsentry/sentry/issues/22874)
("Inbound Filters by tags") and
[getsentry/sentry#29813](https://github.com/getsentry/sentry/issues/29813) ("Can't filter
by device.simulator (or many event fields)"). Custom filters also require a Business-tier
plan, which is a second gate behind the first.

### Every other key is dead

Checked against the real events on `SELFTEND-B` and `-G` before falling back to code:

- **IP address** — not on the events at all. `sendDefaultPii` is `false`, so only
  `user.geo: US` survives. The one built-in filter that could have run server-side has
  nothing to key on.
- **User id** — rotates. `cf40a6db-…` on B, `a69d6d56-…` on G: a fresh guest account per
  run, which is what the fresh container implies.
- **Release** — the farm rides real releases (`0.16.0+76`, `0.21.0+81`). Filtering those
  silences real users.
- **Error message** — differs across the three (`Object captured as exception with keys:
message` on B, `Non-Error thrown (keys: message)` on G, a Supabase 504 on D), and
  message-filtering is precisely the shape #1548 deliberately left reportable.

## Decision

**Screen the fingerprint in `beforeSend` in `src/lib/sentry.ts`, returning `null`.**

The rejected option is taken because the preferred one is not available. The objection
recorded against it in #2577 stands unchanged and is not waved away: **this reaches only
builds shipped after it.** The installed base keeps reporting the farm forever, and
nothing in this repo can change that.

**The key is the pair `os.build` AND `device.model`, and never the model alone.** A
filter on `OnePlus8Pro` would silence a genuine OnePlus 8 Pro owner. `os.build` is the
narrow half.

**The eight other impossibilities stay out of the key.** Screen geometry, processor
count, arch order and the frozen battery are each a stronger discriminator than the pair,
and a key built from them would be more precise today and broken the first time the farm
rotates one. Precision that brittle is worse than the pair.

## The edges

1. **This is the only drop in `sentry.ts` that is not about privacy.** Every other
   mechanism there — `scrubEvent`, `scrubBreadcrumb` — removes a _field_ from an event
   that still gets sent. This discards the event _whole_, for traffic triage. The
   distinction is load-bearing: someone reading the file for privacy rules should not
   find this and generalise from it, and someone adding a privacy rule should not put it
   in the screen. The comment at the constant says so in as many words.

2. **A missing context cannot match.** Web, and any platform attaching neither `os` nor
   `device`, compares `undefined` against a string and falls through. The screen can only
   ever subtract from what Android reports.

3. **The screen runs before the scrubbers.** A dropped event has nothing left worth
   scrubbing, and the drop decision is made against the event as it arrived.

4. **A second farm is a data addition, not a code change.**
   `SPOOFED_DEVICE_FINGERPRINTS` is a list for that reason. It has one member and is
   expected to stay small; a list that grows past a handful is evidence this decision was
   the wrong shape, not a reason to keep appending.

## Enforcement

`src/lib/sentry.test.ts` carries two kinds of test, and the second is the one that
matters.

Four pin the predicate, of which **"spares a genuine OnePlus 8 Pro on a real build"** is
the reason the key is a pair. If that test is ever made to pass with the build dropped
from the key, a real owner has gone silent.

Two pin the **wiring** — they pull the actual `beforeSend` out of the `Sentry.init` mock
and call it, rather than testing the predicate a second time. A pure predicate that
nothing calls is the failure mode a predicate-only suite cannot see. Verified by removing
the screen from `beforeSend` and confirming the test goes red; it does.

## Consequences

- ☠️ **`SELFTEND-B` and `-G` are the `{ message: "" }` empty-object throw, and only this
  farm has ever triggered it.** Screening it removes the sole source of a shape #1548
  deliberately left reportable, so the open question behind #1548 — which layer throws an
  object whose only own key is an empty `message` — loses its only evidence. That is the
  right trade, because the evidence was never a user's error. It is recorded here because
  it is otherwise invisible.
- Events from the installed base are unchanged. Anyone reading the Sentry backlog before
  the next release should still read it as "seven real, three farm".
- ⚠️ **A silently-dropped class of events is invisible at the console.** Nothing in
  Sentry will ever show that these were discarded — there is no filter row to inspect,
  because the drop happens on the device. This document is the only record, which is why
  #2577 asked for one either way, and why the constant's comment points back here.

## Alternatives rejected

- **The Sentry inbound filter.** The decision this supersedes. Not rejected on merit —
  it remains the better mechanism, and is where traffic triage belongs. It does not
  exist.
- **Per-issue "delete and discard future events"** on B, D and G. Genuinely
  server-side, needs no release, reaches the installed base, reversible — the only option
  that keeps #2577's original constraints. Rejected because it keys on the issue
  fingerprint rather than the device, so any new error shape from the farm lands anew, and
  because it is a Business-plan feature this project may not have. Worth revisiting if
  the farm's shapes multiply.
- **Leaving it.** Defensible: no user impact, quota and signal-to-noise only. Rejected
  because 30% of the backlog reading as real work is a standing tax on every triage pass,
  and the cost of the screen is one comparison per event.
