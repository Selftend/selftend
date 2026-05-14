export interface ValuesProfile {
  id: string;
  userId: string;
  lifeDomain: string;
  importanceRating: number;
  satisfactionRating: number;
  domainNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValuesProfileInput {
  lifeDomain: string;
  importanceRating: number;
  satisfactionRating: number;
  domainNote: string;
}
