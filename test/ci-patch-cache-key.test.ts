import fs from "node:fs";
import path from "node:path";

const WORKFLOWS = path.join(__dirname, "..", ".github", "workflows");

/** A `node_modules` cache key, captured so the failure message can show it. */
const CACHE_KEY =
  /key:\s*\$\{\{\s*runner\.os\s*\}\}-node-modules-\$\{\{\s*(hashFiles\([^)]*\))\s*\}\}/g;

function workflowFiles(): string[] {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => path.join(WORKFLOWS, name));
}

function cacheKeys(source: string): string[] {
  return [...source.matchAll(CACHE_KEY)].map((match) => match[1]);
}

/**
 * Every `node_modules` cache key must hash `patches/` too (#1266 follow-up).
 *
 * ☠️ This is a bug that reports itself as a broken feature, three steps away
 * from its cause. The chain: patches are applied by `patch-package`, which runs
 * ONLY from `postinstall`; `postinstall` runs only when `Install dependencies`
 * runs; and that step is skipped on a cache hit. So a patch added without
 * touching `package-lock.json` or `package.json` does not change the key, the
 * stale pre-patch `node_modules` is restored, and the patch is silently never
 * applied.
 *
 * It is not hypothetical. `patches/react-native-ui-datepicker+3.3.0.patch`
 * landed with #1301 without a lockfile change, and the next branch to merge dev
 * failed 17 tests across `date-field.rendered` and `themed-calendar.a11y` plus
 * two date-picker e2e specs - every one of them a test of behaviour the patch
 * supplies. The run log showed `Install dependencies` skipped. Nothing in the
 * failure pointed at caching; it read as the picker being broken.
 *
 * The cost is worse than a red build on the release workflows, which cache the
 * same way: there, an unpatched dependency does not fail anything, it ships.
 *
 * Asserted over every workflow rather than a list, because the next workflow
 * added is exactly the one that would copy the old key.
 */
describe("node_modules cache keys account for patches", () => {
  const files = workflowFiles();

  it("finds cache keys to check, so this test has a subject", () => {
    const total = files.reduce(
      (sum, file) => sum + cacheKeys(fs.readFileSync(file, "utf8")).length,
      0,
    );

    expect(total).toBeGreaterThan(0);
  });

  it.each(files.map((file) => path.basename(file)))("%s hashes patches/ in every key", (name) => {
    const keys = cacheKeys(fs.readFileSync(path.join(WORKFLOWS, name), "utf8"));

    for (const key of keys) {
      expect(key).toContain("patches/**");
    }
  });

  /**
   * The other half of the mechanism. The key only matters because the install
   * is conditional - if `Install dependencies` ever ran unconditionally, a
   * stale cache would be harmless. Pinned so that the reasoning above stays
   * true of the workflows it describes.
   */
  it.each(files.map((file) => path.basename(file)))(
    "%s still skips install on a cache hit, which is why the key matters",
    (name) => {
      const source = fs.readFileSync(path.join(WORKFLOWS, name), "utf8");
      if (cacheKeys(source).length === 0) return;

      expect(source).toContain("steps.cache-node-modules.outputs.cache-hit != 'true'");
    },
  );
});
