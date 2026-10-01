import type { ImageSourcePropType } from "react-native";

import type { HelpKey } from "@/src/features/help/help-content";

export const HELP_IMAGES: Partial<Record<HelpKey, ImageSourcePropType>> = {
  program: require("../../../assets/images/help/cbt_program.webp"),
  actProgram: require("../../../assets/images/help/act_program.webp"),
  thoughtRecords: require("../../../assets/images/help/thought_records.webp"),
  beliefs: require("../../../assets/images/help/core_beliefs.webp"),
  worry: require("../../../assets/images/help/worry_journal.webp"),
  goals: require("../../../assets/images/help/goals.webp"),
  values: require("../../../assets/images/help/values.webp"),
  activities: require("../../../assets/images/help/activity_scheduling.webp"),
  exposure: require("../../../assets/images/help/graded_exposure.webp"),
  tasks: require("../../../assets/images/help/stuck_task_breakdown.webp"),
  anger: require("../../../assets/images/help/anger_log.webp"),
  selfCare: require("../../../assets/images/help/self_care_check_in.webp"),
  breathing: require("../../../assets/images/help/breathing.webp"),
  defusion: require("../../../assets/images/help/defusion.webp"),
  expansion: require("../../../assets/images/help/expansion.webp"),
  connection: require("../../../assets/images/help/connection.webp"),
  observingSelf: require("../../../assets/images/help/observing_self.webp"),
  committedAction: require("../../../assets/images/help/committed_action.webp"),
};
