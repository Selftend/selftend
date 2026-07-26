import { readFileSync } from "fs";
import { join } from "path";

import { PACER_HUE, pacerColors } from "@/src/features/breathing/pacer-colors";
import { hueHsl } from "@/src/features/mindfulness/exercise-hue";

describe("pacerColors", () => {
  it.each([false, true])("derives every stop from the aqua token (isDark=%s)", (isDark) => {
    const colors = pacerColors(isDark);
    expect(colors.innerFill).toBe(hueHsl(PACER_HUE, isDark, 0.22));
    expect(colors.innerBorder).toBe(hueHsl(PACER_HUE, isDark, 1));
    expect(colors.outerFill).toBe(hueHsl(PACER_HUE, isDark, 0.1));
    expect(colors.outerBorder).toBe(hueHsl(PACER_HUE, isDark, 0.3));
  });

  it("carries the token lightness, not the pre-#310 literal", () => {
    // The screen used to hardcode a lighter light-mode value (L 45%) than the
    // aqua token (L 36%). The token wins: it reads deeper on the room's pale
    // field and lifts the ring's contrast there (see test/room-contrast.test.ts).
    expect(pacerColors(false).innerBorder).toBe("hsla(196, 52%, 36%, 1)");
    expect(pacerColors(true).innerBorder).toBe("hsla(196, 58%, 62%, 1)");
  });
});

describe("the breathing session screen never hardcodes HSL", () => {
  // Regression guard for #310: the pacer reached its colours through a literal
  // HSL triple, so a palette retune silently skipped it. Same reasoning as the
  // chart-layer guard in test/theme-token-sync.test.ts.
  it("app/(app)/tools/breathing/session.tsx contains no hsl literal", () => {
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "app", "(app)", "tools", "breathing", "session.tsx"),
      "utf8",
    );
    expect(source).toMatch(/pacerColors/);
    expect(source).not.toMatch(/hsla?\(/);
  });
});
