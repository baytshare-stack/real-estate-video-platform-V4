/**
 * Prisma schema requires DIRECT_URL when `directUrl` is set.
 * Local .env often only has DATABASE_URL — mirror it so migrate/generate work (P1012).
 * Neon pooler: if migrate times out (P1002), set DIRECT_URL to the "Direct" connection string.
 */
const fs = require("node:fs");
const path = require("node:path");

/** Load .env into process.env when running via `node scripts/prisma-cli.cjs` (parent has no env). */
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function applyDirectUrlFallback() {
  loadDotEnv();
  const db = process.env.DATABASE_URL?.trim();
  const direct = process.env.DIRECT_URL?.trim();
  if (!direct && db) {
    process.env.DIRECT_URL = db;
    console.warn(
      "[prisma] DIRECT_URL was unset — using DATABASE_URL. " +
        "If migrate times out on Neon pooler, add DIRECT_URL (Direct host) to .env."
    );
  }
  if (!process.env.DIRECT_URL?.trim()) {
    console.error("[prisma] Add DATABASE_URL or DIRECT_URL to your .env file.");
    process.exit(1);
  }
}

module.exports = { applyDirectUrlFallback };
