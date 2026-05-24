import type { GratitudeLevel } from "@/src/features/modules/types";

export interface GratitudeEntry {
  id: string;
  userId: string;
  level: GratitudeLevel;
  items: string[];
  note: string;
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  events: string[];
  goodMoment: string;
  missIfGone: string;
  hiddenGood: string;
  lifeItems: string[];
  starred: boolean;
}

export interface GratitudeInput {
  level: GratitudeLevel;
  items: string[];
  note: string;
  loggedAt?: string;
  events?: string[];
  goodMoment?: string;
  missIfGone?: string;
  hiddenGood?: string;
  lifeItems?: string[];
}
