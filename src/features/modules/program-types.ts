import type { Href } from "expo-router";

export type ProgramStatus = "not_started" | "in_progress" | "graduated";

export interface ProgramTaskView {
  key: string;
  labelKey: string;
  route: Href;
  current: number;
  target: number;
  done: boolean;
}
