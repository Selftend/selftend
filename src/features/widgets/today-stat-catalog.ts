interface TodayStatCatalogEntry {
  key: string;
  emoji: string;
  labelKey: string;
}

export const TODAY_STAT_CATALOG: TodayStatCatalogEntry[] = [
  { key: "mood", emoji: "🙂", labelKey: "home.widgets.today.moodLabel" },
  { key: "habits", emoji: "✅", labelKey: "home.widgets.today.habitsLabel" },
  { key: "sleep", emoji: "🛌", labelKey: "home.widgets.today.sleepLabel" },
  { key: "meditation", emoji: "🧘", labelKey: "home.widgets.today.meditationLabel" },
  { key: "gratitude", emoji: "💛", labelKey: "home.widgets.today.gratitudeLabel" },
  { key: "journal", emoji: "📓", labelKey: "home.widgets.today.journalLabel" },
  { key: "breathing", emoji: "🌬️", labelKey: "home.widgets.today.breathingLabel" },
  { key: "grounding", emoji: "🌍", labelKey: "home.widgets.today.groundingLabel" },
];
