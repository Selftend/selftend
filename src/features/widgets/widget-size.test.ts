import { sizeTier } from "@/src/features/widgets/widget-size";

describe("widget-size", () => {
  it("sizeTier: expanded at >=110dp height, else compact", () => {
    expect(sizeTier(300, 70)).toBe("compact");
    expect(sizeTier(300, 110)).toBe("expanded");
    expect(sizeTier(300, 200)).toBe("expanded");
  });
});
