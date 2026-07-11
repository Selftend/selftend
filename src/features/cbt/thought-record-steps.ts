import type { ThoughtRecordStepKey } from "@/src/features/cbt/thought-record-form";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";

export interface ThoughtRecordStep {
  fields: (keyof ThoughtRecordFormSchema)[];
  key: ThoughtRecordStepKey;
  title: string;
}

// The `fields` mapping is the single source of truth for per-step RHF validation.
export function buildThoughtRecordSteps(t: (key: string) => string): ThoughtRecordStep[] {
  return [
    { fields: ["situation"], key: "situation", title: t("record.situation") },
    { fields: ["nats"], key: "nats", title: t("record.nats") },
    { fields: ["nats"], key: "hotThought", title: t("record.hotThought") },
    {
      fields: ["emotions", "emotionIntensityBefore"],
      key: "emotions",
      title: t("record.emotions"),
    },
    { fields: ["evidenceFor", "evidenceAgainst"], key: "evidence", title: t("record.evidence") },
    { fields: ["distortions"], key: "distortions", title: t("record.patterns") },
    { fields: ["balancedThought"], key: "balancedThought", title: t("record.balancedThought") },
    {
      fields: ["emotionIntensityAfter", "outcomeNotes"],
      key: "outcome",
      title: t("record.outcome"),
    },
  ];
}
