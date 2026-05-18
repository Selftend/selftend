import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export const useCbtDraftStore = createWizardDraftStore<ThoughtRecordFormSchema>();
