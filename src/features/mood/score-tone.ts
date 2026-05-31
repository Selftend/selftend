/** Tailwind background-tone class for a 1–5 mood score. Shared by the entry card and the detail hero. */
export function scoreToneClass(score: number): string {
  switch (score) {
    case 1:
      return "bg-red-500/15";
    case 2:
      return "bg-orange-500/15";
    case 3:
      return "bg-yellow-400/20";
    case 4:
      return "bg-lime-500/15";
    case 5:
      return "bg-green-500/15";
    default:
      return "bg-muted";
  }
}
