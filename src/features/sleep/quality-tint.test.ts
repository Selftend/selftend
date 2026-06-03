import { qualityTint } from "@/src/features/sleep/quality-tint";

describe("qualityTint", () => {
  it("maps quality 1..5 to ascending ink opacities", () => {
    expect(qualityTint(1)).toBe("bg-ink/20");
    expect(qualityTint(3)).toBe("bg-ink/50");
    expect(qualityTint(5)).toBe("bg-ink");
  });

  it("clamps out-of-range values", () => {
    expect(qualityTint(0)).toBe("bg-ink/20");
    expect(qualityTint(9)).toBe("bg-ink");
  });
});
