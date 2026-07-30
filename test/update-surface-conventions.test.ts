import { readFileSync } from "node:fs";
import { join } from "node:path";

// Convention gates for the update surface (#388 section 7): the pieces that
// live in workflow YAML and the headers file, which no unit test executes.
// Text scans, same precedent as test/android-release-track.test.ts - if the
// line moves or is deleted, the gate names exactly what went missing.

const ROOT = join(__dirname, "..");

describe("web-deploy writes the version document", () => {
  const workflow = readFileSync(join(ROOT, ".github/workflows/web-deploy.yml"), "utf8");

  it("has the version.json step after the export step", () => {
    const exportAt = workflow.indexOf("npm run export:web");
    const versionAt = workflow.indexOf("dist/version.json");
    expect(exportAt).toBeGreaterThan(-1);
    expect(versionAt).toBeGreaterThan(exportAt);
  });

  it("stamps both fields the client validates", () => {
    expect(workflow).toContain("publishedAt");
    expect(workflow).toMatch(/package\.json'?\)\.version/);
  });
});

describe("_headers keeps version.json uncached", () => {
  const headers = readFileSync(join(ROOT, "public/_headers"), "utf8");

  it("carries the /version.json no-cache rule", () => {
    // The rule must target the exact path: a stale cached version document
    // would delay every update offer by a full cache lifetime.
    expect(headers).toMatch(/^\/version\.json\n\s+Cache-Control: no-cache$/m);
  });

  it("never lets the immutable asset rules cover it", () => {
    // version.json is served from the dist root - if someone ever nests it
    // under /assets or /_expo/static the immutable rule wins and the check
    // dies silently. The workflow writes to dist/version.json; keep it there.
    const workflow = readFileSync(join(ROOT, ".github/workflows/web-deploy.yml"), "utf8");
    expect(workflow).toContain("'dist/version.json'");
    expect(workflow).not.toContain("dist/assets/version.json");
  });
});

describe("android-release carries the Play URL env", () => {
  it("passes EXPO_PUBLIC_PLAY_STORE_URL into the build env", () => {
    const workflow = readFileSync(join(ROOT, ".github/workflows/android-release.yml"), "utf8");
    expect(workflow).toContain(
      "EXPO_PUBLIC_PLAY_STORE_URL: ${{ vars.EXPO_PUBLIC_PLAY_STORE_URL }}",
    );
  });
});
