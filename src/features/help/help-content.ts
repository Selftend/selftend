export const HELP_KEYS = [
  "program",
  "actProgram",
  "thoughtRecords",
  "beliefs",
  "worry",
  "distortions",
  "goals",
  "values",
  "activities",
  "exposure",
  "tasks",
  "anger",
  "selfCare",
  "breathing",
  "mindfulness",
  "meditation",
  "grounding",
  "mood",
  "sleep",
  "journal",
  "gratitude",
  "habits",
  "defusion",
  "expansion",
  "connection",
  "observingSelf",
  "committedAction",
] as const;

export type HelpKey = (typeof HELP_KEYS)[number];

export interface HelpEntry {
  titleKey: string;
  whatKey: string;
  howKey: string;
  whyKey: string;
}

export const HELP_CONTENT: Record<HelpKey, HelpEntry> = Object.fromEntries(
  HELP_KEYS.map((key) => [
    key,
    {
      titleKey: `${key}.title`,
      whatKey: `${key}.what`,
      howKey: `${key}.how`,
      whyKey: `${key}.why`,
    },
  ]),
) as Record<HelpKey, HelpEntry>;
