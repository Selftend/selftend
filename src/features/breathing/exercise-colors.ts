import type { BreathingExerciseColor } from "@/src/features/breathing/exercise-types";

// A custom exercise's colour, as the swatch classes both consumers actually
// paint: the editor's colour-picker dot and the list row's border + fill.
//
// There is deliberately no `text` entry (#403). One existed and no caller ever
// read it — both destructure `bg` and `border` only — so it shipped four
// unreachable `text-<hue>` classes that a future label would have picked up as
// if they were vetted. They were not: `text-iris` and `text-clay` are 3.42 and
// 3.51 on the app background, and `text-mist` is 3.43, all under AA. A text
// consumer added here wants `text-<hue>-ink`.
export function breathingColorClass(color: BreathingExerciseColor) {
  switch (color) {
    case "aqua":
      return { bg: "bg-aqua/10", border: "border-aqua" };
    case "mist":
      return { bg: "bg-mist/10", border: "border-mist" };
    case "iris":
      return { bg: "bg-iris/10", border: "border-iris" };
    case "clay":
      return { bg: "bg-clay/10", border: "border-clay" };
    case "amber":
      return { bg: "bg-amber-500/10", border: "border-amber-500" };
    case "emerald":
      return { bg: "bg-emerald-500/10", border: "border-emerald-500" };
    case "violet":
      return { bg: "bg-violet-500/10", border: "border-violet-500" };
    case "rose":
      return { bg: "bg-rose-500/10", border: "border-rose-500" };
  }
}
