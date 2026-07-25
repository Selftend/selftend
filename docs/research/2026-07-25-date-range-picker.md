# Date-range picker options for the trend chart custom range

> Research for [design-redesign wayfinder ticket #231](https://github.com/Selftend/selftend/issues/231),
> resolved 2026-07-25. Feeds the mood workstream spec decision (#232) under map #228.
> All library facts below were checked against primary sources (npm registry, GitHub
> READMEs/API, Expo docs) on 2026-07-25; installed-package claims were verified against
> the actual code in `node_modules/`.

## The question

The progress screen's mood trend chart (`src/features/progress/progress-screen.tsx`)
currently renders a fixed 14-day window. Map #228 direction adds range presets
(7d / 30d / 90d) plus a **custom range**, which needs a date-range picker that works on
iOS, Android, and web, fits the NativeWind + @rn-primitives stack, and respects the
dependency policy (prefer Expo built-ins and already-approved dependencies).

## What is already in the repo

- `react-native-ui-datepicker@^3.3.0` is installed and shipping on all three platforms:
  `src/components/app/date-time-field.tsx` wraps it (`mode="single"`) in a themed modal
  sheet for routine scheduling.
- `@react-native-community/datetimepicker@9.1.0` is installed (transitive/platform picker).
- `@rn-primitives/*` (popover, dialog, etc.) and `dayjs` are installed.

## Options surveyed

| Option                                               | Range mode            | Web          | New deps                               | License | Notes                                             |
| ---------------------------------------------------- | --------------------- | ------------ | -------------------------------------- | ------- | ------------------------------------------------- |
| `react-native-ui-datepicker` (installed)             | Yes (`mode="range"`)  | Yes          | **None**                               | MIT     | Pure JS, NativeWind-compatible                    |
| `@react-native-community/datetimepicker` (installed) | No                    | No           | None                                   | MIT     | Single value only; native pickers                 |
| `@rn-primitives/*`                                   | —                     | —            | —                                      | —       | No calendar/date primitive exists                 |
| `react-native-paper-dates`                           | Yes                   | Yes          | `react-native-paper` (MD3 stack)       | MIT     | Heavy, visually clashes                           |
| `react-native-calendars` (wix)                       | DIY via `markedDates` | Undocumented | `xdate`, `lodash`, `recyclerlistview`… | MIT     | You write the selection logic                     |
| `@marceloterreiro/flash-calendar`                    | Yes                   | Undocumented | `@shopify/flash-list` peer             | MIT     | Fast, but no web claim                            |
| Hand-rolled on @rn-primitives + dayjs                | Yes (we write it)     | Yes          | None                                   | —       | Re-implements the installed lib; we own i18n/a11y |
| Web `<input type="date">`                            | No (two inputs)       | Web only     | None                                   | —       | Would still need a native path                    |

## Findings per option

### react-native-ui-datepicker (installed) — the zero-new-dependency answer

- **Range is native to the exact installed version.** The shipped type definitions
  (`node_modules/react-native-ui-datepicker/lib/typescript/types.d.ts`) declare
  `CalendarMode = 'single' | 'range' | 'multiple'`, and `DatePickerRangeProps` takes
  `startDate`/`endDate`, an `onChange: RangeChange` callback, and `allowRangeReset`.
- **Web works.** The README targets Android, iOS, and web via react-native-web
  ([repo](https://github.com/farhoudshapouran/react-native-ui-datepicker)), and the
  claim is already proven empirically: our shipping web build renders it through
  `DateTimeField`.
- **Pure JS, no privacy cost.** Verified in `node_modules`: no native modules
  (`requireNativeComponent`/`NativeModules` absent), no network calls, no telemetry.
  Deps are `clsx`, `dayjs`, `jalali-plugin-dayjs`, `lodash`, `tailwind-merge` — all
  pure JS; `dayjs`, `clsx`, `tailwind-merge` are already in our tree.
- **Styling fits the stack.** Unstyled by default with dual `styles`/`classNames`
  theming; README states full NativeWind compatibility. `DateTimeField` already themes
  it with our tokens, so a range variant inherits the existing look.
- **Maintenance (checked 2026-07-25):** v3.3.0 published 2026-05-20 (last repo push the
  same day — release-driven cadence, quiet ~2 months); ~108k weekly downloads; 877
  stars; 62 open issues; MIT ([npm](https://www.npmjs.com/package/react-native-ui-datepicker)).
  Moderate velocity, but we already carry this exact risk for single-date picking.

### @react-native-community/datetimepicker (installed) — no range, no web

- Modes are `date`, `time`, `datetime` (iOS-only), `countdown` (iOS-only) — single
  value only; no range API in the README
  ([repo](https://github.com/react-native-datetimepicker/datetimepicker)).
- Expo's platform list for it is "Android, iOS, Included in Expo Go" — web absent
  ([Expo docs](https://docs.expo.dev/versions/latest/sdk/date-time-picker/)).
- Well maintained (9.1.0 published 2026-03-17, ~2.1M weekly downloads). Could only
  serve as the native half of a two-tap "pick start, then pick end" flow, and would
  still need a separate web implementation — strictly worse than the option above.

### @rn-primitives — no calendar primitive

The suite is 28 primitives (accordion → tooltip, plus portal/slot/hooks/utils); none is
a calendar or date picker ([docs](https://rn-primitives.vercel.app/)). The installed
Popover/Dialog primitives remain useful as the _container_ for the calendar (matching
the existing `DateTimeField` modal-sheet pattern).

### react-native-paper-dates — capable but expensive

`DatePickerModal` supports `mode="range"` and works on Android, iOS, and web including
Expo ([repo](https://github.com/web-ridge/react-native-paper-dates)). It is the
best-maintained option surveyed (0.23.14 published 2026-07-23, ~52k weekly downloads,
1 open issue). But it peer-depends on `react-native-paper`, i.e. adopting it imports
the whole Material Design 3 theming system alongside NativeWind/@rn-primitives, and
the picker is deliberately MD3-styled — a large dependency and a visual clash for one
component. Fails the dependency-policy test while an approved dependency suffices.

### react-native-calendars (wix) — range is DIY, web unclaimed

Range selection is not a first-class API: you render it via `markedDates` with
`markingType="period"` and write the start/end tap logic yourself
([repo](https://github.com/wix/react-native-calendars)). Expo-compatible without
ejecting, actively maintained (1.1314.0, ~517k weekly downloads), but the README makes
no web-support claim (community reports RNW rendering as unreliable), and it adds
`xdate`, `lodash`, `recyclerlistview`, and more. More code for us, more deps, less
platform coverage.

### @marceloterreiro/flash-calendar — fast, but peer dep and no web claim

Explicitly built for date/range picking, tiny (~18.8 kB + `mitt`), but `Calendar.List`
wraps FlashList so `@shopify/flash-list >=2.0.0` becomes a peer dependency, and the
docs make no web-support claim ([docs](https://marceloprado.github.io/flash-calendar/fundamentals/principles)).
One release since v2.0.0 (2026-03-04), ~51k weekly downloads. Not worth a new peer
dep with unproven web support.

### Hand-rolled calendar sheet on existing primitives

Feasible with zero new dependencies: a month grid is a 7-column layout of `Pressable`
day cells inside an `@rn-primitives` dialog/popover, with `dayjs` for month math and
range logic (~a few hundred lines plus tests). But it re-implements exactly what the
already-installed `react-native-ui-datepicker` provides (month navigation, locale-aware
weekday headers, min/max clamping, range highlighting, accessibility states), and we
would own its i18n, RTL, and a11y correctness forever. Justified only if the installed
library were being removed; otherwise it is maintenance cost without dependency savings.

### Web-only escape hatch and Expo built-ins

- On web one can render a DOM `<input type="date">` (react-native-web sits on
  react-dom; use a web-only file or `unstable_createElement` — RNW's `TextInput` does
  not forward `type`, see [react-native-web#2604](https://github.com/necolas/react-native-web/issues/2604)).
  Free and accessible, but single-date only (two inputs for a range), browser-styled,
  and it solves nothing for iOS/Android.
- There is no Expo-authored universal date picker. Expo's date-picker docs page _is_
  the community `datetimepicker`; the newer `@expo/ui` `DateTimePicker` is
  SwiftUI/Jetpack-Compose backed — Android/iOS/tvOS only, no range mode documented
  ([Expo UI docs](https://docs.expo.dev/versions/v57.0.0/sdk/ui/)).

## Conclusion

**Use the already-installed `react-native-ui-datepicker` in `mode="range"`.** It is the
only surveyed option delivering one-interaction range selection on iOS + Android + web
with zero new dependencies, and it already matches the app visually via the
`DateTimeField` theming. Recommended shape: a `DateRangeField` sibling to
`src/components/app/date-time-field.tsx` (same modal-sheet container, `mode="range"`,
`startDate`/`endDate`, clamped by `minDate`/`maxDate` to the data window), surfaced
from the trend chart's range selector only when the user picks "Custom".

Every alternative fails at least one hard requirement: `datetimepicker` and `@expo/ui`
lack range and web; flash-calendar and react-native-calendars lack documented web
support and add dependencies; paper-dates drags in the entire react-native-paper stack.

**Known trade-off to record in #232:** react-native-ui-datepicker's maintenance is
moderate (last release 2026-05-20, 62 open issues) versus paper-dates' near-daily
upkeep — acceptable because we already depend on it for scheduling, so the range use
adds no _new_ maintenance exposure.
