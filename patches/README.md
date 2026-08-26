# Dependency patches

Applied by [`patch-package`](https://github.com/ds300/patch-package) from `postinstall`.

## ⚠️ Bumping a patched dependency

**A patch is applied by filename.** `name+version.patch` runs only against that
exact installed version. Change the version in `package.json` and the patch
silently stops applying — `patch-package` prints a warning into the middle of a
long install log and still exits 0.

So, when you bump one of the packages below:

1. Re-cut the patch: `npx patch-package <name>`
2. Delete the old `name+oldversion.patch` and commit the new file.
3. Re-read the patch. The upstream source may have moved under it, and
   `patch-package` will happily produce a patch of whatever you left behind.

`test/patch-version-pin.test.ts` fails if a patch filename and the installed
version drift apart, so this cannot pass unnoticed — but that guard only catches
the version, not whether the patched behaviour still makes sense.

## ⚠️ CI caches `node_modules`, so this directory is part of the cache key

Every workflow that installs restores `node_modules` from a cache and runs
`npm ci` only on a miss — and `npm ci` is the only thing that runs
`postinstall`, i.e. the only thing that runs `patch-package`. So the cache key
hashes `patches/**` alongside the lockfile. Adding or editing a patch without
that would restore a pre-patch `node_modules`, skip the install, and test an
**unpatched** dependency against a tree that contains the patch. That is not a
subtle failure: it turned every open PR red at once on 2026-08-25, each with
nothing in its own diff to explain it.

## `react-native-ui-datepicker`

Adds the accessibility hooks the calendar grid needs (#1301, #1305). The library
renders every day and both month-navigation buttons inside its **own**
`Pressable`, with `accessibilityLabel` hardcoded — to the bare day number, and
to the English strings `"Prev"` / `"Next"`. Nothing passed through the public
component API reaches the element assistive technology reads, so a screen-reader
user hears "8, button", cannot tell which day is selected (it is painted as a
background colour and conveyed by colour alone), and hears English in a
Bulgarian app.

Five changes, all optional and inert unless a caller opts in:

- `components.dayProps(day)` spread onto **both** of `day.tsx`'s pressable
  branches, after the hardcoded `accessibilityLabel` so a caller can replace it.
- `components.prevButtonProps` / `nextButtonProps`, likewise.
- `onChangeMonth` now fires the library's **existing public**
  `onMonthChange` / `onYearChange` props. They previously fired only from the
  month/year selector views, so pressing the prev/next arrows changed the
  visible month with no way for a caller to observe it — and therefore no way
  to announce it.
- The three optional members declared on `CalendarComponents`.
- A `visibleDate` prop (#1305): the `YYYY-MM-DD` day whose month the grid
  should be showing, so keyboard navigation can page the calendar without
  selecting anything.

  The public `month` / `year` pair cannot do this, for two separate reasons.
  Each dispatches from its own effect against a `stateRef` that still holds the
  pre-dispatch value when the second one runs, so crossing a year applies the
  two halves to different bases — December 2026 → January 2027 lands on
  **December 2027**. And `dayjs(currentDate).month(value)` overflows: asking a
  calendar sitting on 31 January for February shows **March**.

  It is re-asserted whenever the library's own `currentDate` moves, not only
  when the prop changes, because a controlled prop has to win over internal
  state. ⚠️ That is not belt-and-braces: the picker re-seeds `currentDate` from
  the SELECTED day inside an effect keyed on the identity of
  `date`/`minDate`/`maxDate`/`onChange`, so an unrelated re-render used to drag
  the grid back out of the month the caller had asked for. That was a shipped
  bug — pressing Next announced April while every cell below stayed in March —
  and `ThemedCalendar` now also pins those four props by value so the effect
  stops firing spuriously in the first place.

Every change is replicated across `src/`, `lib/commonjs/` and `lib/module/`,
because they are not interchangeable here: Metro resolves this package's
`"react-native": "src/index"` field, so **the app bundles `src/`**, while Jest
resolves the compiled build. Patching only one gives you green tests over an
unpatched app, or the reverse.

Consumed by `src/components/app/themed-calendar.tsx`; the behaviour is pinned by
`src/components/app/themed-calendar.a11y.test.tsx` (screen-reader semantics),
`src/components/app/themed-calendar.keyboard.test.tsx` (roving focus and
paging), and the month-arrow regression test in
`src/components/app/themed-calendar.test.tsx`.

## `react-native-sortables`

Pre-existing. See the patch file itself.
