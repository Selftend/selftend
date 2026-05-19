import type { ProcrastinationTaskFormSchema } from "@/src/features/procrastination/schemas";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export const useProcrastinationDraftStore = createWizardDraftStore<ProcrastinationTaskFormSchema>();
