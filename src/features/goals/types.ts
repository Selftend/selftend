export type GoalStatus = "active" | "completed" | "paused" | "abandoned";

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  lifeDomain: string;
  goalType: string;
  targetDate: string | null;
  status: GoalStatus;
  /**
   * The value this goal is anchored to, or null when it is anchored to nothing (#1287).
   *
   * One key from the user's own ranked priority values - never a list. It answers "what
   * am I being", where `lifeDomain` answers "where in my life"; both are kept.
   *
   * Nullable at every layer on purpose. The shipped programme's first week asks for goals
   * *before* values clarification, so on the intended path the first goal is written with
   * no priority values in existence. This can never gate goal creation.
   *
   * Encrypted at rest, deliberately overriding this table's own convention that only
   * title and description are encrypted: the values profile encrypts its value list, and
   * a plaintext pointer would put "anchored to honesty" in the clear anyway.
   */
  valueKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  userId: string;
  description: string;
  targetDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  description: string;
  lifeDomain: string;
  goalType: string;
  targetDate: string | null;
  /**
   * Nullable, but NOT optional (#1287).
   *
   * `saveGoal` overwrites every field in this payload on an edit, so a caller that simply
   * omitted the key would silently clear whatever the goal was anchored to. Making it
   * required turns that into a compile error at each call site instead - which is the
   * point, because the picker that can set a key lands separately in #1289. Pass `null`
   * to mean "anchored to nothing"; there is no "leave whatever was there" value.
   */
  valueKey: string | null;
}

export interface MilestoneInput {
  description: string;
  targetDate: string | null;
}
