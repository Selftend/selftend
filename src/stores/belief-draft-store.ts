import type { CoreBeliefFormSchema } from "@/src/features/beliefs/schemas";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export const useBeliefDraftStore = createWizardDraftStore<CoreBeliefFormSchema>();
