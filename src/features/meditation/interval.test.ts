import { INTERVAL_OPTIONS_MINUTES } from "@/src/features/meditation/interval";

describe("INTERVAL_OPTIONS_MINUTES", () => {
  it("offers an off option alongside real intervals", () => {
    expect(INTERVAL_OPTIONS_MINUTES[0]).toBe(0); // 0 = off
    expect(INTERVAL_OPTIONS_MINUTES).toContain(5);
  });
});
