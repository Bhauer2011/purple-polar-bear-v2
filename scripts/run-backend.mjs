import { spawn, spawnSync } from "node:child_process";

const args = [
  "-m",
  "uvicorn",
  "backend.server:app",
  "--host",
  "0.0.0.0",
  "--port",
  "8000",
  "--reload"
];

const commands = ["python", "py", "python3"];

const available = commands.find((command) => {
  const result = spawnSync(command, ["--version"], {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: true
  });
  return result.status === 0;
});

if (!available) {
  console.error(
    "No Python runtime was found. Install Python 3, run `pip install -r backend/requirements.txt`, then try `npm.cmd run dev:backend` again."
  );
  process.exit(1);
}

const child = spawn(available, args, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: true
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
