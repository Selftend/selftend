type SizeTier = "compact" | "expanded";

export function sizeTier(_width: number, height: number): SizeTier {
  return height >= 110 ? "expanded" : "compact";
}
