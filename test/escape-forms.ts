/**
 * The seven forms whose Escape hops up to a record the trail cannot name.
 *
 * Each is an `[id]/edit` or `[id]/log` route: the hop target is the record's own
 * crumb, which falls through to the generic opaque-id label ("Entry"). That is
 * the whole set the "Go back" fallback was charted for (#1253).
 *
 * ⚠️ `glyph` is what the screen behind the route ACTUALLY renders, and it decides
 * what the Escape announces - the label follows the glyph, not the destination
 * (#733). Only two of the seven wear the arrow; the other five are forms wearing
 * the X, and an X says "Close" whatever the trail knows. The ticket's acceptance
 * criteria read as though all seven say "Go back"; they do not, and asserting
 * that against a hard-coded arrow would have made the suite agree with the
 * ticket instead of with the app.
 *
 * `/tools/mood-tracker/[id]/edit` is deliberately absent: it is a `<Redirect>`
 * stub that renders no UI and reaches no chrome.
 */
export interface EscapeForm {
  pathname: string;
  /** The glyph the screen ships, and so what the Escape announces. */
  glyph: "arrow-back" | "close";
  /** Where to check the glyph when this table is suspected of drifting. */
  screen: string;
}

export const UNNAMED_DESTINATION_FORMS: EscapeForm[] = [
  {
    pathname: "/routines/3f9a-uuid/edit",
    glyph: "arrow-back",
    screen: "src/features/routines/routine-editor-screen.tsx",
  },
  {
    pathname: "/tools/habits/3f9a-uuid/log",
    glyph: "arrow-back",
    screen: "src/features/habits/habit-log-note-screen.tsx",
  },
  {
    pathname: "/tools/check-in/3f9a-uuid/edit",
    glyph: "close",
    screen: "src/features/mood/mood-entry-editor-screen.tsx",
  },
  {
    pathname: "/tools/gratitude-log/3f9a-uuid/edit",
    glyph: "close",
    screen: "src/features/gratitude/gratitude-entry-editor-screen.tsx",
  },
  {
    pathname: "/tools/habits/3f9a-uuid/edit",
    glyph: "close",
    screen: "src/features/habits/habit-editor-screen.tsx",
  },
  {
    pathname: "/tools/journal/3f9a-uuid/edit",
    glyph: "close",
    screen: "src/features/journal/journal-entry-editor-screen.tsx",
  },
  {
    pathname: "/tools/sleep/3f9a-uuid/edit",
    glyph: "close",
    screen: "src/features/sleep/sleep-log-screen.tsx",
  },
];
