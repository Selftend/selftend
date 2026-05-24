export type ValueTier = 1 | 2 | 3;

export interface PersonalValue {
  key: string;
  tier: ValueTier;
}

export interface ValuesProfile {
  id: string;
  userId: string;
  personalValues: PersonalValue[];
  priorityValues: string[];
  updatedAt: string;
}

export interface ValuesProfileInput {
  personalValues: PersonalValue[];
  priorityValues: string[];
}
