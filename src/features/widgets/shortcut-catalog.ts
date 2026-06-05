export interface ShortcutCatalogEntry {
  id: string;
  emoji: string;
  labelKey: string;
  path: string;
}

export const SHORTCUT_CATALOG: ShortcutCatalogEntry[] = [
  {
    id: "mood",
    emoji: "🙂",
    labelKey: "home.widgets.shortcutCatalog.mood",
    path: "/tools/mood-tracker/new",
  },
  {
    id: "breathing",
    emoji: "🌬️",
    labelKey: "home.widgets.shortcutCatalog.breathing",
    path: "/tools/breathing/session",
  },
  {
    id: "grounding",
    emoji: "🌍",
    labelKey: "home.widgets.shortcutCatalog.grounding",
    path: "/tools/grounding",
  },
  {
    id: "journal",
    emoji: "📓",
    labelKey: "home.widgets.shortcutCatalog.journal",
    path: "/tools/journal/new",
  },
  {
    id: "gratitude",
    emoji: "💛",
    labelKey: "home.widgets.shortcutCatalog.gratitude",
    path: "/tools/gratitude-log/new",
  },
  {
    id: "meditation",
    emoji: "🧘",
    labelKey: "home.widgets.shortcutCatalog.meditation",
    path: "/tools/meditation",
  },
  {
    id: "sleep",
    emoji: "🛌",
    labelKey: "home.widgets.shortcutCatalog.sleep",
    path: "/tools/sleep/new",
  },
  {
    id: "habits",
    emoji: "✅",
    labelKey: "home.widgets.shortcutCatalog.habits",
    path: "/tools/habits",
  },
  {
    id: "thoughtRecord",
    emoji: "🧠",
    labelKey: "home.widgets.shortcutCatalog.thoughtRecord",
    path: "/modules/cbt/new",
  },
  {
    id: "defusion",
    emoji: "🌤️",
    labelKey: "home.widgets.shortcutCatalog.defusion",
    path: "/modules/act/defusion",
  },
  {
    id: "dropAnchor",
    emoji: "⚓",
    labelKey: "home.widgets.shortcutCatalog.dropAnchor",
    path: "/modules/act/connection/drop-anchor",
  },
  {
    id: "choicePoint",
    emoji: "🔀",
    labelKey: "home.widgets.shortcutCatalog.choicePoint",
    path: "/modules/act/choice-point/new",
  },
];
