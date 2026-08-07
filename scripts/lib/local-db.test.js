const child = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");

jest.mock("node:child_process");
jest.mock("node:net");

const { ensureLocalDbRunning } = require("./local-db");

const ENV_KEYS = ["SELFTEND_LOCAL_SUPABASE_PORT", "EXPO_PUBLIC_SUPABASE_URL"];

// Fake socket whose `event` fires on the next tick, mirroring how a real
// net.Socket resolves the probe.
function mockSocket(event) {
  const handlers = {};
  const socket = {
    once: jest.fn((name, callback) => {
      handlers[name] = callback;
      return socket;
    }),
    destroy: jest.fn(),
  };
  process.nextTick(() => handlers[event]?.());
  return socket;
}

// Routes spawnSync by command: `docker info` probes answer per-call from
// `dockerStatuses`, `supabase start` calls from `supabaseResults` (last
// entry repeats in both).
function mockSpawnSync({ dockerStatuses = [0], supabaseResults = [{ status: 0 }] } = {}) {
  let dockerCalls = 0;
  let supabaseCalls = 0;
  child.spawnSync.mockImplementation((cmd) => {
    if (cmd === "docker") {
      const status = dockerStatuses[Math.min(dockerCalls, dockerStatuses.length - 1)];
      dockerCalls += 1;
      return { status };
    }
    const result = supabaseResults[Math.min(supabaseCalls, supabaseResults.length - 1)];
    supabaseCalls += 1;
    return result;
  });
}

function supabaseStartCalls() {
  return child.spawnSync.mock.calls.filter(([cmd]) => cmd !== "docker");
}

function setPlatform(platform) {
  Object.defineProperty(process, "platform", { value: platform });
}

describe("scripts/lib/local-db", () => {
  const realPlatform = process.platform;
  let savedEnv;
  let exitSpy;
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    setPlatform(realPlatform);
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("does nothing when Supabase is remote", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    await ensureLocalDbRunning();

    expect(net.createConnection).not.toHaveBeenCalled();
    expect(child.spawnSync).not.toHaveBeenCalled();
  });

  it("does nothing when EXPO_PUBLIC_SUPABASE_URL is unset", async () => {
    await ensureLocalDbRunning();

    expect(net.createConnection).not.toHaveBeenCalled();
    expect(child.spawnSync).not.toHaveBeenCalled();
  });

  it("skips supabase start when the local port is already open", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("connect"));

    await ensureLocalDbRunning();

    expect(net.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ host: "127.0.0.1", port: 54321 }),
    );
    expect(child.spawnSync).not.toHaveBeenCalled();
  });

  it("runs supabase start when the port is closed and Docker is up", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    mockSpawnSync();

    await ensureLocalDbRunning();

    expect(child.spawnSync).toHaveBeenCalledWith("docker", ["info"], expect.anything());
    expect(supabaseStartCalls()).toHaveLength(1);
    expect(JSON.stringify(supabaseStartCalls()[0])).toContain("supabase");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("treats a probe timeout as closed", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    net.createConnection.mockImplementation(() => mockSocket("timeout"));
    mockSpawnSync();

    await ensureLocalDbRunning();

    expect(supabaseStartCalls()).toHaveLength(1);
  });

  it("retries supabase start while the stack is still booting", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    mockSpawnSync({ supabaseResults: [{ status: 1 }, { status: 0 }] });

    const run = ensureLocalDbRunning();
    await jest.advanceTimersByTimeAsync(10000);
    await run;

    expect(supabaseStartCalls()).toHaveLength(2);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits when supabase start keeps failing", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    mockSpawnSync({ supabaseResults: [{ status: 1 }] });

    const run = ensureLocalDbRunning();
    const assertion = expect(run).rejects.toThrow("process.exit");
    await jest.advanceTimersByTimeAsync(60000);
    await assertion;

    expect(supabaseStartCalls()).toHaveLength(5);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when the supabase CLI cannot be spawned", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    mockSpawnSync({ supabaseResults: [{ error: new Error("ENOENT") }] });

    await expect(ensureLocalDbRunning()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when Docker is down and cannot be launched automatically", async () => {
    setPlatform("linux");
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    mockSpawnSync({ dockerStatuses: [1] });

    await expect(ensureLocalDbRunning()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(supabaseStartCalls()).toHaveLength(0);
  });

  it("launches Docker Desktop on Windows and waits for the daemon", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    setPlatform("win32");
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
    const unref = jest.fn();
    child.spawn.mockReturnValue({ unref });
    // Daemon down on the first probe, up once Docker Desktop has booted.
    mockSpawnSync({ dockerStatuses: [1, 0] });

    const run = ensureLocalDbRunning();
    await jest.advanceTimersByTimeAsync(3000);
    await run;

    expect(child.spawn).toHaveBeenCalledWith(
      expect.stringContaining("Docker Desktop.exe"),
      [],
      expect.objectContaining({ detached: true }),
    );
    expect(unref).toHaveBeenCalled();
    expect(supabaseStartCalls()).toHaveLength(1);
    existsSpy.mockRestore();
  });

  it("exits when the Docker daemon never comes up", async () => {
    jest.useFakeTimers({ doNotFake: ["nextTick"] });
    setPlatform("win32");
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    const existsSpy = jest.spyOn(fs, "existsSync").mockReturnValue(true);
    child.spawn.mockReturnValue({ unref: jest.fn() });
    mockSpawnSync({ dockerStatuses: [1] });

    const run = ensureLocalDbRunning();
    const assertion = expect(run).rejects.toThrow("process.exit");
    await jest.advanceTimersByTimeAsync(310000);
    await assertion;

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(supabaseStartCalls()).toHaveLength(0);
    existsSpy.mockRestore();
  });
});
