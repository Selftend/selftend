import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #371 / #372 - a merge to `main` releases Android to the Play **production**
// track automatically, with no human gate on the release itself.
//
// It ships as `completed` - live to everyone, no human gate anywhere in the
// pipeline. That is the end state #371 decided on, reached 2026-08-16 after the
// capped mode ran cleanly through v0.11.0 to v0.14.1. The cap existed for the
// first releases under this pipeline (72 commits, 12 migrations) and for the
// releases that followed it; keeping it past that point meant every release
// stalling at 20% until someone remembered to bump it, which is how 80% of
// Android users ended up two versions behind on 0.12.0.
//
// What is pinned here is the property that survives either mode: **the release
// must actually reach users**. Two ways that could silently break:
//   - the submit profile being pointed back at a testing track, so releases
//     quietly stop reaching production at all;
//   - a status that serves NOBODY. `draft` uploads a release no user receives -
//     CI stays green, the build appears in Play Console, and it is invisible
//     until somebody notices. A `rollout` of 0 is the same failure wearing the
//     current mode's clothes, which is why it is asserted above zero rather
//     than merely present.
//
// `halted` is not a release mode either: it means "will no longer be served",
// a rollout that WAS serving and got stopped. It is the kill switch.

const ROOT = resolve(__dirname, "..");

// Text scan, no YAML parser - matching the repo's dependency-free convention
// tests (see workflow-supabase-cli-pin.test.ts).
const releaseWorkflow = readFileSync(
  resolve(ROOT, ".github/workflows/android-release.yml"),
  "utf8",
);

const easJson = JSON.parse(readFileSync(resolve(ROOT, "eas.json"), "utf8")) as {
  submit?: Record<
    string,
    { android?: { track?: string; releaseStatus?: string; rollout?: number } }
  >;
};

describe("Android production submit profile (#371)", () => {
  const profile = easJson.submit?.production?.android;

  it("defines a production submit profile", () => {
    expect(profile).toBeDefined();
  });

  it("targets the Play production track", () => {
    expect(profile?.track).toBe("production");
  });

  it("releases in a status that actually serves users", () => {
    // `draft` would upload a release that serves nobody - green CI, build
    // visible in Play Console, users never get it. Fail loudly instead.
    expect(["inProgress", "completed"]).toContain(profile?.releaseStatus);
  });

  it("ships uncapped, and carries no leftover rollout fraction", () => {
    // Pinned EXACTLY, not as a range, and with no early return for the other
    // status - both would make this vacuous the moment the policy drifted.
    //
    // The mode is a policy, not an implementation detail: `docs/releasing.md`
    // ("How Android reaches users" and the rollback runbook), the workflow
    // header and the job summary all describe it. A config-only edit would
    // leave CI green while four places described a pipeline that no longer
    // existed - and under the old cap an operator would reach for a halt that
    // does nothing. Edit this expectation and those four places together.
    expect(profile?.releaseStatus).toBe("completed");
    // `rollout` is meaningless outside `inProgress`, and a stale one left
    // beside `completed` is a live trap: it reads as "still capped at 20%" to
    // anyone checking why a release did or did not reach someone.
    expect(profile?.rollout).toBeUndefined();
  });
});

describe("Android release workflow track targeting (#371, #374)", () => {
  it("submits with the submit_profile input, defaulting to production", () => {
    // The submit is parameterized for the dev testing feed (#374). What must
    // not drift: the parameter is the one the inputs declare, and every
    // resolution of it falls back to production - so the release orchestrator,
    // which passes no submit_profile, keeps releasing to production.
    const submitLine = releaseWorkflow
      .split(/\r?\n/)
      .find((line) => line.includes("eas-cli -- submit"));

    expect(submitLine).toBeDefined();
    expect(submitLine).toContain('--profile "$SUBMIT_PROFILE"');
    const resolutions = releaseWorkflow.match(/inputs\.submit_profile \|\| 'production'/g) ?? [];
    expect(resolutions.length).toBeGreaterThanOrEqual(3); // submit, mirror, summary
  });

  it("keeps the release orchestrator on the production profile", () => {
    // release.yml invoking the reusable workflow with submit_profile: closed
    // would silently retarget every production release at the testing tracks -
    // the exact failure the original hardcoded assertion existed to catch.
    const orchestrator = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");
    expect(orchestrator).toContain("android-release.yml");
    expect(orchestrator).not.toContain("submit_profile");
  });

  it("mirrors both channels downstream, so testers are never behind", () => {
    // production run: production -> Groups and production -> alpha (the FLOOR:
    // after every release the testing tracks hold at least what users have).
    // closed run: Groups -> alpha (eas already released to Groups).
    const mirrors = releaseWorkflow
      .split(/\r?\n/)
      .filter((line) => line.includes("promote-android-track.cjs"));

    expect(mirrors.some((l) => l.includes("--from production") && l.includes("--to Groups"))).toBe(
      true,
    );
    expect(mirrors.some((l) => l.includes("--from production") && l.includes("--to alpha"))).toBe(
      true,
    );
    expect(mirrors.some((l) => l.includes("--from Groups") && l.includes("--to alpha"))).toBe(true);
  });

  it("scopes build concurrency per submit profile", () => {
    // A shared concurrency group with cancel-in-progress would let a dev
    // testing dispatch cancel an in-flight production release build.
    expect(releaseWorkflow).toContain(
      "group: android-release-${{ inputs.submit_profile || 'production' }}",
    );
  });
});

describe("dev-driven closed testing feed (#374)", () => {
  const testingWorkflow = readFileSync(
    resolve(ROOT, ".github/workflows/android-testing-release.yml"),
    "utf8",
  );

  it("builds dev and submits with the closed profile", () => {
    expect(testingWorkflow).toContain("ref: dev");
    expect(testingWorkflow).toContain("submit_profile: closed");
    expect(testingWorkflow).toContain("android-release.yml");
  });

  it("is manual-only - no push or schedule trigger", () => {
    // A per-merge or nightly trigger would burn ~90-minute builds nobody asked
    // for (#374 decided manual dispatch); this pins that the trigger surface
    // stays dispatch-only.
    expect(testingWorkflow).toContain("workflow_dispatch");
    expect(testingWorkflow).not.toMatch(/\n\s+push:/);
    expect(testingWorkflow).not.toContain("schedule:");
  });

  it("gates on migrations production has not run", () => {
    // The precondition that keeps a dev client honest against the production
    // backend: the preflight diffs supabase/migrations against main and FAILS
    // unless the dispatch explicitly acknowledged the list - a warning on a
    // fire-and-forget dispatch reaches nobody before the build submits.
    expect(testingWorkflow).toContain("supabase/migrations");
    expect(testingWorkflow).toContain("acknowledge_unpromoted_migrations");
    expect(testingWorkflow).toContain("::error::");
    expect(testingWorkflow).not.toContain("::warning::");
  });

  // The mirror script's guards are exercised for real below (see "the mirror
  // script, driven against a mocked Play API") - a source-substring pin cannot
  // tell a working guard from a bypassed one (#453 review).

  it("targets the Groups track with a status that serves testers", () => {
    const closed = easJson.submit?.closed?.android;
    expect(closed?.track).toBe("Groups");
    expect(closed?.releaseStatus).toBe("completed");
  });
});

// #450 / #453 - the mirror script mutates Play tracks, so its two guards are
// proven by driving main() against a mocked Play API, not by scanning source:
//   - no-downgrade: a target already serving a same-or-higher versionCode is
//     left alone (#450);
//   - fail-closed: a non-404 failure reading the target aborts the promotion
//     outright - treating it as "empty track" would skip the guard above and
//     overwrite a newer tester release (#453).
describe("the mirror script, driven against a mocked Play API", () => {
  const nodeCrypto = require("node:crypto") as typeof import("node:crypto");
  const fs = require("fs") as typeof import("fs");

  // A real (throwaway) RSA key: makeJwt signs with crypto.createSign, so the
  // service-account stub must carry a parseable private key.
  const { privateKey } = nodeCrypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });

  type FetchCall = { method: string; url: string };
  let calls: FetchCall[];
  let targetTrackResponse: { status: number; body?: unknown };
  const originalFetch = global.fetch;

  const json = (body: unknown, status = 200) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body, // the token request reads .json() directly
    }) as Response;

  beforeEach(() => {
    calls = [];
    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    jest.spyOn(fs, "readFileSync").mockImplementation((path) => {
      if (String(path).includes("google-play-service-account")) {
        return JSON.stringify({ client_email: "ci@test", private_key: privateKey });
      }
      throw new Error(`unexpected read: ${String(path)}`);
    });
    global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      calls.push({ method, url: u });
      if (u.includes("oauth2.googleapis.com/token")) return json({ access_token: "tok" });
      if (method === "POST" && u.endsWith("/edits")) return json({ id: "edit-1" });
      if (method === "GET" && u.includes("/tracks/Groups"))
        return json({ releases: [{ versionCodes: ["100"], name: "1.0.0" }] });
      if (method === "GET" && u.includes("/tracks/alpha"))
        return json(targetTrackResponse.body ?? {}, targetTrackResponse.status);
      if (method === "PUT" && u.includes("/tracks/alpha")) return json({});
      if (method === "POST" && u.endsWith(":commit")) return json({});
      if (method === "DELETE") return json({});
      throw new Error(`unexpected fetch: ${method} ${u}`);
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // The script is evaluated from source with its externals passed in, rather
  // than require()d: jest's transform chain balks at the .cjs file, and the
  // simulated app runtime carries a patched URLSearchParams the Node CLI can't
  // use. The wrapper is exactly Node's own CJS shape - same code, same require
  // (so the fs spies apply), test-controlled fetch. The evaluated string is the
  // repo's own checked-in script, byte-for-byte - the same trust require() has;
  // nothing external is interpolated into it.
  const scriptSource = readFileSync(resolve(ROOT, "scripts/promote-android-track.cjs"), "utf8");
  const runMain = () => {
    const mod = { exports: {} as { main?: () => Promise<void> } };

    const wrapper = new Function(
      "require",
      "module",
      "exports",
      "fetch",
      "URLSearchParams",
      scriptSource,
    );
    const delegatingFetch = (...args: Parameters<typeof fetch>) => global.fetch(...args);

    const { URLSearchParams: NodeURLSearchParams } =
      require("node:url") as typeof import("node:url");
    wrapper(require, mod, mod.exports, delegatingFetch, NodeURLSearchParams);
    if (!mod.exports.main) throw new Error("script did not export main()");
    return mod.exports.main();
  };
  const putCalls = () => calls.filter((c) => c.method === "PUT");
  const deleteCalls = () => calls.filter((c) => c.method === "DELETE");

  it("mirrors through an absent target track (404 reads as empty)", async () => {
    targetTrackResponse = { status: 404, body: { error: "not found" } };

    await runMain();

    expect(putCalls()).toHaveLength(1);
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith(":commit"))).toBe(true);
  });

  it("aborts without writing when the target track read fails transiently", async () => {
    // The #453 finding: a 500 swallowed into "empty track" would sail past the
    // downgrade guard and PUT an older versionCode over a newer tester release.
    targetTrackResponse = { status: 500, body: { error: "backend" } };

    await expect(runMain()).rejects.toThrow(/500/);

    expect(putCalls()).toHaveLength(0);
    expect(deleteCalls()).toHaveLength(1); // the edit is cleaned up, not committed
  });

  it("leaves a target already serving a same-or-higher versionCode untouched", async () => {
    // The #450 finding: per-profile concurrency means the slower pipeline can
    // arrive carrying the older build.
    targetTrackResponse = {
      status: 200,
      body: { releases: [{ versionCodes: ["101"], name: "1.0.1" }] },
    };

    await runMain();

    expect(putCalls()).toHaveLength(0);
    expect(deleteCalls()).toHaveLength(1); // skipping is success: edit deleted, no commit
    expect(calls.some((c) => c.method === "POST" && c.url.endsWith(":commit"))).toBe(false);
  });
});
