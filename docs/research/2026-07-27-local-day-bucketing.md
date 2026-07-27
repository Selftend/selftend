# Local-day bucketing in Postgres from a captured UTC offset

Research for [#333](https://github.com/Selftend/selftend/issues/333), a ticket on the sleep-aggregates wayfinder map [#331](https://github.com/Selftend/selftend/issues/331). Question: if sleep aggregates move server-side, how does SQL reproduce the day/weekday bucketing the client does today?

Date: 2026-07-27. Verified against staging (`qivwioreztotptttnklc`, Postgres 17.6) and Node.

## Headline: the semantic is already being decided elsewhere

The premise of the ticket — "the client buckets device-locally, so SQL must reproduce that" — is **out of date**. Issue [#250](https://github.com/Selftend/selftend/issues/250) is an in-flight workstream that changes the bucketing semantic across the app, and three of its PRs are open right now:

| PR                                                    | scope                                                     | state                        |
| ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------- |
| [#326](https://github.com/Selftend/selftend/pull/326) | make the captured offset nullable so "unknown" is sayable | draft, `integration` failing |
| [#328](https://github.com/Selftend/selftend/pull/328) | mood buckets by captured day                              | draft, `integration` failing |
| [#329](https://github.com/Selftend/selftend/pull/329) | **gratitude, sleep, journal** finish the migration        | draft, `integration` failing |

**PR #329 already rewrites `src/features/sleep/summaries.ts`** — the exact module map #331's mechanism ticket ([#334](https://github.com/Selftend/selftend/issues/334)) proposes to move server-side.

What #250 settles, so #333 does not have to:

1. **Which offset wins** — the offset _captured at logging time_, not the viewer's current one. `entryDayKey(occurredAt, offsetMinutes)` is the new canonical helper; `occurrenceDateKey` in `src/lib/occurrence-time.ts` is its shipped ancestor.
2. **How windows are walked** — in **day keys**, not timestamps. From the PR's own comment: _"their windows have to be walked in day keys too. Doing it in timestamps instead is what let a log count toward the '7-day average' while bucketing outside the 7 columns drawn above it."_ That directly answers the `withinDays` / `startOfDayDaysAgo` half of #334.
3. **A third state exists** — the offset becomes **nullable**, `null` meaning "unknown".

## The SQL expression, verified

For a row with a known offset, the JS

```ts
new Date(new Date(occurredAt).getTime() + offsetMinutes * 60000).toISOString().slice(0, 10);
```

is reproduced exactly by

```sql
((logged_at at time zone 'UTC') + make_interval(mins => logged_offset_minutes))::date
```

and the weekday by `extract(isodow from ...)` → 1=Mon … 7=Sun, which is `(jsDay + 6) % 7` + 1, i.e. the existing `weekdayAverages` index plus one.

Parity checked on eight cases — SQL on staging vs Node, **all match**:

| case                       | offset | day key    |
| -------------------------- | ------ | ---------- |
| Sofia summer, 00:30 local  | +180   | 2026-07-16 |
| Sofia summer, 23:30 local  | +180   | 2026-07-15 |
| LA, 23:30 local            | −420   | 2026-07-15 |
| Nepal (:45 offset)         | +345   | 2026-07-16 |
| Kiritimati (max +14)       | +840   | 2026-07-16 |
| Baker Is. (min −12)        | −720   | 2026-07-15 |
| UTC midnight exact         | 0      | 2026-07-16 |
| DST spring-forward instant | +120   | 2026-03-29 |

DST needs no special handling: the offset is a _stored number_, so no timezone database is consulted on either side. That is the whole point of capturing it.

## The finding that constrains the mechanism decision

**SQL cannot reproduce the null-offset fallback.** `entryDayKey` degrades like this:

```ts
if (offsetMinutes === null || !Number.isFinite(offsetMinutes) || Number.isNaN(date.getTime())) {
  return localDateKey(date); // the VIEWER's current device timezone
}
```

`localDateKey` reads the device's timezone. A Postgres function has no access to it, so for any row with a null offset a server-side aggregate **must** either:

- take the viewer's current offset as an **RPC parameter** — which makes the result non-cacheable across timezones and means the "same" query key can return different numbers for the same user on two devices; or
- bucket null-offset rows by UTC, **knowingly diverging** from what the screen shows for those rows.

There is no third option that matches the client. How much this matters is a function of how many rows carry a null offset — which is exactly what PR #326 introduces, so the population is not yet knowable.

## Indexes

`sleep_logs` was renamed to `sleep_logs_data` by the encryption migration (`20260615`); its index travelled with the rename and exists on staging:

```
CREATE INDEX sleep_logs_user_logged_idx ON public.sleep_logs_data USING btree (user_id, logged_at DESC)
```

`mood_logs_data` has the same shape. Adequate for a per-user timestamp range scan. A lifetime aggregate scans all of one user's rows regardless — bounded and cheap — but note there is **no index on a computed day key**, so day-bucketed aggregation computes the expression per row. Fine at these row counts; not an index-only path.

Bonus, for [#337](https://github.com/Selftend/selftend/issues/337): **`meditation_sessions` is not encrypted** — no `_data` twin, no decrypting view. Its columns are directly readable, so a percentile aggregate there has fewer constraints than the sleep/journal cases.

## Recommendation

Do not decide #334 before #250 lands. Moving sleep's aggregates into SQL while PR #329 is rewriting the same module's day semantics in JS means either freezing the old semantic in SQL or implementing the new one twice, in two languages, with no parity test between them — the exact failure mode the `\s`-vs-`btrim` trap represented on the journal side.

The cheapest sequencing: let #250 land, then re-read `summaries.ts`, then choose the mechanism against the semantics that actually shipped.
