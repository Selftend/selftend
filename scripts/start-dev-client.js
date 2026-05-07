const { spawn } = require("node:child_process");
const path = require("node:path");

const expoCliPath = path.join(process.cwd(), "node_modules", "expo", "bin", "cli");
const args = [expoCliPath, "start", "--dev-client", ...process.argv.slice(2)];

const child = spawn(process.execPath, args, {
  env: {
    ...process.env,
    EXPO_NO_DOTENV: "1",
    SELFTEND_APP_VARIANT: "development",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
