/**
 * The content column, carried by the shell rather than set per screen (#733,
 * decided on #690).
 *
 * The app had no content column at all before this: every module home ran
 * edge-to-edge, which is why a 1440px browser showed a 62ch tagline floating
 * beside 900px of empty background.
 *
 * A screen never picks a number - it uses the constant that matches the shell
 * it already renders. `ModuleHomeHeader` is a home, so it takes `HOME_COLUMN`;
 * `ScreenTopBar` is a form or detail screen, so it takes `FORM_COLUMN`. The two
 * are different widths because they hold different things: a home holds charts
 * and lists that want the room, a form holds a single column of fields that
 * gets harder to read the wider it runs.
 */

/** 720px - module homes, matching the design's `2a` column. */
export const HOME_COLUMN = "w-full max-w-[720px] self-center";

/** 620px - form and detail screens, matching the design's `2b`/`2c` column. */
export const FORM_COLUMN = "w-full max-w-[620px] self-center";

/**
 * `HOME_COLUMN` as a number, for the one home that cannot take a class: the
 * check-in overview is a `SectionList`, whose rows are list items rather than
 * children of a wrapper, so its column has to ride `contentContainerStyle` -
 * and NativeWind does not register `SectionList`, so a className there is
 * silently dropped. Kept beside the class so the two can't drift.
 */
export const HOME_COLUMN_WIDTH = 720;
