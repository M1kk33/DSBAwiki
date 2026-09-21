import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const existingEnv = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const keyLine = /^ADMIN_BOOTSTRAP_KEY\s*=([^\r\n]*)/m;
const keyValue = existingEnv
  .match(keyLine)?.[1]
  .trim()
  .replace(/^(['"])(.*)\1$/, "$2");
if (!keyValue) {
  const generatedLine = `ADMIN_BOOTSTRAP_KEY=${randomBytes(32).toString("hex")}`;
  writeFileSync(
    ".env",
    keyLine.test(existingEnv)
      ? existingEnv.replace(keyLine, generatedLine)
      : existingEnv +
          (existingEnv.endsWith("\n") || !existingEnv ? "" : "\n") +
          generatedLine +
          "\n",
    { mode: 0o600 },
  );
}
const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    "wrangler.local.json",
    "--persist-to",
    ".wrangler/state",
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log(
  "Local database is ready. The one-time admin activation key is in .env. Start npm run dev, sign in at /admin, then paste that key.",
);
