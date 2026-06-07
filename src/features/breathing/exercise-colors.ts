import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";

export function breathingColorClass(color: BreathingExerciseColor) {
  switch (color) {
    case "aqua":
      return { bg: "bg-aqua/10", border: "border-aqua", text: "text-aqua" };
    case "mist":
      return { bg: "bg-mist/10", border: "border-mist", text: "text-mist" };
    case "iris":
      return { bg: "bg-iris/10", border: "border-iris", text: "text-iris" };
    case "clay":
      return { bg: "bg-clay/10", border: "border-clay", text: "text-clay" };
    case "amber":
      return { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-600" };
    case "emerald":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-600" };
    case "violet":
      return { bg: "bg-violet-500/10", border: "border-violet-500", text: "text-violet-600" };
    case "rose":
      return { bg: "bg-rose-500/10", border: "border-rose-500", text: "text-rose-600" };
  }
}
