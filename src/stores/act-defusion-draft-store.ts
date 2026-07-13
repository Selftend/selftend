import type { DefusionTechnique, ThoughtCategory } from "@/src/features/act/types";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export interface ActDefusionDraft {
  fusedThought: string;
  thoughtCategory: ThoughtCategory;
  fusionLevelBefore: number | null;
  techniqueUsed: DefusionTechnique;
  defusedVersion: string;
  fusionLevelAfter: number | null;
  notes: string;
}

export const useActDefusionDraftStore = createWizardDraftStore<ActDefusionDraft>("act-defusion");
