import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

test("Render's configured db:push command cannot change production schema", () => {
  const result = spawnSync(process.execPath, [resolve("scripts/safe-db-push-predeploy.js")], {
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_ENV: "production",
      RENDER: "true",
      DATABASE_URL: "INTENTIONALLY_INVALID_TEST_ONLY",
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No database changes were made/);
});

test("npm script maps automatic db:push to nonmutating guard", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  assert.equal(pkg.scripts["db:push"], "node scripts/safe-db-push-predeploy.js");
  assert.equal(pkg.scripts["db:push:manual"], "drizzle-kit push");
});
