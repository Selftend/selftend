const child = require("node:child_process");
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

describe("scripts/lib/local-db", () => {
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
    exitSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
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
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:51555";
    net.createConnection.mockImplementation(() => mockSocket("connect"));

    await ensureLocalDbRunning();

    expect(net.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ host: "127.0.0.1", port: 51555 }),
    );
    expect(child.spawnSync).not.toHaveBeenCalled();
  });

  it("runs supabase start when the local port is closed", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:51555";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    child.spawnSync.mockReturnValue({ status: 0 });

    await ensureLocalDbRunning();

    expect(child.spawnSync).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(child.spawnSync.mock.calls[0])).toContain("supabase");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("treats a probe timeout as closed", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    net.createConnection.mockImplementation(() => mockSocket("timeout"));
    child.spawnSync.mockReturnValue({ status: 0 });

    await ensureLocalDbRunning();

    expect(child.spawnSync).toHaveBeenCalledTimes(1);
  });

  it("exits when supabase start fails", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:51555";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    child.spawnSync.mockReturnValue({ status: 1 });

    await expect(ensureLocalDbRunning()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when the supabase CLI cannot be spawned", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:51555";
    net.createConnection.mockImplementation(() => mockSocket("error"));
    child.spawnSync.mockReturnValue({ error: new Error("ENOENT") });

    await expect(ensureLocalDbRunning()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
