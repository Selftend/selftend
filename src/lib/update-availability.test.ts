import { Platform } from "react-native";

import {
  fetchVersionDocument,
  getVersionDocumentUrl,
  isNewerVersion,
  parseSemver,
} from "@/src/lib/update-availability";

// jest-expo runs the NATIVE platform; the web branches under test here are
// pinned explicitly and restored after the file.
let platformSpy: jest.ReplaceProperty<typeof Platform.OS> | undefined;
beforeAll(() => {
  platformSpy = jest.replaceProperty(Platform, "OS", "web");
});
afterAll(() => platformSpy?.restore());

// The compare/fetch core of the update surface (#388 sections 2-3). The rule
// under test throughout: any doubt resolves to "no answer", never a prompt.

describe("parseSemver", () => {
  it("parses strict x.y.z", () => {
    expect(parseSemver("0.8.0")).toEqual([0, 8, 0]);
    expect(parseSemver(" 1.22.333 ")).toEqual([1, 22, 333]);
  });

  it("rejects everything else", () => {
    for (const bad of ["v1.2.3", "1.2", "1.2.3-beta.1", "1.2.3.4", "abc", "", null, 7, {}]) {
      expect(parseSemver(bad)).toBeNull();
    }
  });
});

describe("isNewerVersion", () => {
  it("is true only for a strictly newer candidate", () => {
    expect(isNewerVersion("0.8.1", "0.8.0")).toBe(true);
    expect(isNewerVersion("0.9.0", "0.8.9")).toBe(true);
    expect(isNewerVersion("1.0.0", "0.99.99")).toBe(true);
  });

  it("is false for equal versions", () => {
    expect(isNewerVersion("0.8.0", "0.8.0")).toBe(false);
  });

  it("is false when running ahead of the deploy (dev builds must never prompt)", () => {
    expect(isNewerVersion("0.8.0", "0.9.0")).toBe(false);
  });

  it("compares numerically, not lexically", () => {
    expect(isNewerVersion("0.10.0", "0.9.0")).toBe(true);
    expect(isNewerVersion("0.9.0", "0.10.0")).toBe(false);
  });

  it("is false when either side is malformed", () => {
    expect(isNewerVersion("1.2.3-rc.1", "1.2.2")).toBe(false);
    expect(isNewerVersion("1.2.3", "unknown")).toBe(false);
  });
});

describe("getVersionDocumentUrl", () => {
  it("is same-origin on web, so self-hosters get the check for free", () => {
    expect(getVersionDocumentUrl()).toBe("/version.json");
  });

  it("gives up quietly on native when no public app URL is configured", () => {
    platformSpy?.restore();
    try {
      expect(getVersionDocumentUrl()).toBeNull();
    } finally {
      platformSpy = jest.replaceProperty(Platform, "OS", "web");
    }
  });
});

describe("fetchVersionDocument", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockFetch(response: Partial<Response> | Error) {
    global.fetch = jest.fn(() =>
      response instanceof Error ? Promise.reject(response) : Promise.resolve(response as Response),
    ) as unknown as typeof fetch;
  }

  it("returns the document when it validates", async () => {
    mockFetch({
      ok: true,
      json: () => Promise.resolve({ version: "0.9.0", publishedAt: "2026-07-30T00:00:00.000Z" }),
    });
    await expect(fetchVersionDocument()).resolves.toEqual({
      version: "0.9.0",
      publishedAt: "2026-07-30T00:00:00.000Z",
    });
  });

  it("fails silent on network errors", async () => {
    mockFetch(new Error("offline"));
    await expect(fetchVersionDocument()).resolves.toBeNull();
  });

  it("fails silent on non-200", async () => {
    mockFetch({ ok: false, json: () => Promise.resolve({}) });
    await expect(fetchVersionDocument()).resolves.toBeNull();
  });

  it("fails silent when the SPA fallback answers with html instead of JSON", async () => {
    // Before the first deploy that writes version.json, the worker serves the
    // app shell with a 200 - response.json() then throws on '<'.
    mockFetch({ ok: true, json: () => Promise.reject(new SyntaxError("Unexpected token <")) });
    await expect(fetchVersionDocument()).resolves.toBeNull();
  });

  it("fails silent on malformed fields", async () => {
    for (const body of [
      {},
      { version: "not-semver", publishedAt: "2026-07-30T00:00:00.000Z" },
      { version: "0.9.0" },
      { version: "0.9.0", publishedAt: "not-a-date" },
      null,
      "string",
    ]) {
      mockFetch({ ok: true, json: () => Promise.resolve(body) });
      await expect(fetchVersionDocument()).resolves.toBeNull();
    }
  });
});
