import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Two iOS presentation defects found by the static audit (#523), both of which
// fail silently: nothing errors, no test goes red, and the only symptom is that
// the app looks wrong on a device nobody had yet.
//
//   - The app icon. iOS rejects an alpha channel, and `assets/icon.png` is
//     42.5% fully transparent with clear corners. Expo does not fail on that -
//     it flattens the icon onto WHITE, so the mark would sit on a white tile
//     while every other surface uses the brand cream. The fix is a
//     pre-composited opaque icon, and the thing worth pinning is the ABSENCE
//     of an alpha channel, since re-pointing `ios.icon` back at the
//     transparent artwork would look fine in a diff.
//   - The dark splash. Without a `dark` entry, every dark-mode cold launch
//     flashes the cream light-mode splash before the app paints its own dark
//     background.
//
// PNG parsed by hand rather than with an image library, matching the repo's
// dependency-free convention tests (workflow-supabase-cli-pin.test.ts,
// android-release-track.test.ts, ios-release-config.test.ts).

const ROOT = resolve(__dirname, "..");
const appConfigSource = readFileSync(resolve(ROOT, "app.config.ts"), "utf8");

/** PNG colour types that carry alpha: 4 = grey+alpha, 6 = truecolour+alpha. */
const COLOUR_TYPES_WITH_ALPHA = [4, 6];

function readPngHeader(relativePath: string) {
  const buf = readFileSync(resolve(ROOT, relativePath));
  // Signature (8) + length (4) + "IHDR" (4), then width/height/bitDepth/colourType.
  expect(buf.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colourType: buf.readUInt8(25),
    // A palette image can still be transparent via a tRNS chunk.
    hasTrns: buf.includes(Buffer.from("tRNS", "ascii")),
  };
}

describe("iOS app icon is opaque", () => {
  it("ships a 1024px icon with no alpha channel", () => {
    const png = readPngHeader("assets/icon-ios.png");

    expect(png.width).toBe(1024);
    expect(png.height).toBe(1024);
    expect(COLOUR_TYPES_WITH_ALPHA).not.toContain(png.colourType);
    expect(png.hasTrns).toBe(false);
  });

  it("points ios.icon at that opaque asset, not the transparent one", () => {
    expect(appConfigSource).toContain('icon: "./assets/icon-ios.png"');
  });

  it("confirms the shared icon really is transparent, so the override stays justified", () => {
    // Guards the reasoning rather than the outcome: if `assets/icon.png` ever
    // becomes opaque, the separate iOS asset is redundant and this test says so
    // instead of leaving two icons to drift apart.
    const shared = readPngHeader("assets/icon.png");
    expect(COLOUR_TYPES_WITH_ALPHA).toContain(shared.colourType);
  });
});

describe("splash screen covers dark mode", () => {
  it("declares a dark variant", () => {
    expect(appConfigSource).toMatch(/dark:\s*\{/);
  });

  it("uses the app's own dark background, so the launch does not flash cream", () => {
    // #15121c is `.dark { --background: 260 20% 9% }` from global.css. If that
    // token moves, this fails and the splash gets updated with it - which is
    // the entire point, since a mismatch is invisible until someone cold-starts
    // the app in dark mode.
    expect(appConfigSource).toContain('backgroundColor: "#15121c"');
  });
});
