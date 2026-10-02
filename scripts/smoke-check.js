import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = process.env.SMOKE_PORT || "5638";
const explicitBaseUrl = process.env.SMOKE_BASE_URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(name, baseUrl, routePath, expectedStatuses, options = {}) {
  const response = await fetch(`${baseUrl}${routePath}`, options);
  const bodyText = await response.text();
  const ok = expectedStatuses.includes(response.status);

  console.log(`${ok ? "PASS" : "FAIL"} ${name} -> ${response.status}`);
  if (!ok) {
    console.log(bodyText.slice(0, 500));
    throw new Error(`${name} expected ${expectedStatuses.join(", ")} but got ${response.status}`);
  }

  return { status: response.status, bodyText };
}

async function waitForServer(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200 || response.status === 503) {
        return;
      }
    } catch {}

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function runChecks(baseUrl) {
  console.log(`Smoke base URL: ${baseUrl}`);

  await check("health", baseUrl, "/api/health", [200, 503]);
  await check("ready", baseUrl, "/api/ready", [200, 503]);

  const promotions = await check("promotions", baseUrl, "/api/promotions", [200]);
  JSON.parse(promotions.bodyText);

  await check("contact validation", baseUrl, "/api/contact", [400], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  await check("booking validation", baseUrl, "/api/bookings", [400], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

async function withManagedServer(run) {
  const serverPath = path.resolve(__dirname, "..", "dist", "index.js");
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: DEFAULT_PORT,
  };

  const child = spawn(process.execPath, [serverPath], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const baseUrl = `http://127.0.0.1:${DEFAULT_PORT}`;
    await waitForServer(baseUrl, 15000);
    await run(baseUrl);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      sleep(3000).then(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }),
    ]);

    if (stderr.trim()) {
      console.log(stderr.trim());
    } else if (stdout.trim()) {
      console.log(stdout.trim());
    }
  }
}

async function main() {
  if (explicitBaseUrl) {
    await runChecks(explicitBaseUrl);
    console.log("Smoke checks passed.");
    return;
  }

  await withManagedServer(async (baseUrl) => {
    await runChecks(baseUrl);
    console.log("Smoke checks passed.");
  });
}

main().catch((error) => {
  console.error("Smoke checks failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
