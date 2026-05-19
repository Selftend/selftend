import type { ExposureHierarchyFormSchema } from "@/src/features/exposure/schemas";
import { createWizardDraftStore } from "@/src/stores/create-wizard-draft-store";

export const useExposureDraftStore = createWizardDraftStore<ExposureHierarchyFormSchema>();
