export interface ExposureHierarchy {
  id: string;
  userId: string;
  title: string;
  anxietyType: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExposureItem {
  id: string;
  hierarchyId: string;
  userId: string;
  description: string;
  sudsRating: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExposureSession {
  id: string;
  exposureItemId: string;
  userId: string;
  preSuds: number;
  postSuds: number;
  durationMinutes: number;
  safetyBehaviorsUsed: boolean;
  safetyBehaviorDescription: string;
  notes: string;
  completedAt: string;
  createdAt: string;
}

export interface ExposureHierarchyInput {
  title: string;
  anxietyType: string;
}

export interface ExposureItemInput {
  description: string;
  sudsRating: number;
}

export interface ExposureSessionInput {
  preSuds: number;
  postSuds: number;
  durationMinutes: number;
  safetyBehaviorsUsed: boolean;
  safetyBehaviorDescription: string;
  notes: string;
}
