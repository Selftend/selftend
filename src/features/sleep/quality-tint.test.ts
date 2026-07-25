import { qualityTint } from "@/src/features/sleep/quality-tint";

describe("qualityTint", () => {
  it("maps quality 1..5 to the shared ascending ink ramp", () => {
    expect(qualityTint(1)).toBe("bg-ink/[0.16]");
    expect(qualityTint(3)).toBe("bg-ink/[0.52]");
    expect(qualityTint(5)).toBe("bg-ink");
  });

  it("clamps out-of-range values", () => {
    expect(qualityTint(0)).toBe("bg-ink/[0.16]");
    expect(qualityTint(9)).toBe("bg-ink");
  });
});
