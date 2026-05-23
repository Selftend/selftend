import type { ImageSourcePropType } from "react-native";

import type { HelpKey } from "@/src/features/help/help-content";

export const HELP_IMAGES: Partial<Record<HelpKey, ImageSourcePropType>> = {
  program: require("../../../assets/images/help/cbt_program.png"),
  actProgram: require("../../../assets/images/help/act_program.png"),
  thoughtRecords: require("../../../assets/images/help/thought_records.png"),
  beliefs: require("../../../assets/images/help/core_beliefs.png"),
  worry: require("../../../assets/images/help/worry_journal.png"),
  distortions: require("../../../assets/images/help/distortion_guide.png"),
  goals: require("../../../assets/images/help/goals.png"),
  values: require("../../../assets/images/help/values.png"),
  activities: require("../../../assets/images/help/activity_scheduling.png"),
  exposure: require("../../../assets/images/help/graded_exposure.png"),
  tasks: require("../../../assets/images/help/stuck_task_breakdown.png"),
  anger: require("../../../assets/images/help/anger_log.png"),
  selfCare: require("../../../assets/images/help/self_care_check_in.png"),
  breathing: require("../../../assets/images/help/breathing.png"),
  mindfulness: require("../../../assets/images/help/mindfulness.png"),
  meditation: require("../../../assets/images/help/meditation.png"),
  grounding: require("../../../assets/images/help/grounding.png"),
  mood: require("../../../assets/images/help/mood_tracker.png"),
  sleep: require("../../../assets/images/help/sleep.png"),
  journal: require("../../../assets/images/help/journal.png"),
  gratitude: require("../../../assets/images/help/gratitude_log.png"),
  habits: require("../../../assets/images/help/habits.png"),
  defusion: require("../../../assets/images/help/defusion.png"),
};
