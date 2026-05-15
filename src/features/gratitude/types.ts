export interface GratitudeEntry {
  id: string;
  userId: string;
  items: string[];
  note: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GratitudeInput {
  items: string[];
  note: string;
}
