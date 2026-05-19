import type { ActivityFormSchema } from "@/src/features/activities/schemas";
import { createDraftStore } from "@/src/stores/create-draft-store";

export const useActivityDraftStore = createDraftStore<ActivityFormSchema>();
