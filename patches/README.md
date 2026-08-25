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

## `react-native-ui-datepicker`

Adds the accessibility hooks the calendar grid needs (#1301). The library
renders every day and both month-navigation buttons inside its **own**
`Pressable`, with `accessibilityLabel` hardcoded — to the bare day number, and
to the English strings `"Prev"` / `"Next"`. Nothing passed through the public
component API reaches the element assistive technology reads, so a screen-reader
user hears "8, button", cannot tell which day is selected (it is painted as a
background colour and conveyed by colour alone), and hears English in a
Bulgarian app.

Four changes, all optional and inert unless a caller opts in:

- `components.dayProps(day)` spread onto **both** of `day.tsx`'s pressable
  branches, after the hardcoded `accessibilityLabel` so a caller can replace it.
- `components.prevButtonProps` / `nextButtonProps`, likewise.
- `onChangeMonth` now fires the library's **existing public**
  `onMonthChange` / `onYearChange` props. They previously fired only from the
  month/year selector views, so pressing the prev/next arrows changed the
  visible month with no way for a caller to observe it — and therefore no way
  to announce it.
- The three optional members declared on `CalendarComponents`.

Every change is replicated across `src/`, `lib/commonjs/` and `lib/module/`,
because they are not interchangeable here: Metro resolves this package's
`"react-native": "src/index"` field, so **the app bundles `src/`**, while Jest
resolves the compiled build. Patching only one gives you green tests over an
unpatched app, or the reverse.

Consumed by `src/components/app/themed-calendar.tsx`; the behaviour is pinned by
`src/components/app/themed-calendar.a11y.test.tsx`.

## `react-native-sortables`

Pre-existing. See the patch file itself.
