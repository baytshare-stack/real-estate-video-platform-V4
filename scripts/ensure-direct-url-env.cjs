/**
 * Prisma schema requires DIRECT_URL when `directUrl` is set.
 * Local .env often only has DATABASE_URL — mirror it so migrate/generate work (P1012).
 * Neon pooler: if migrate times out (P1002), set DIRECT_URL to the "Direct" connection string.
 */
function applyDirectUrlFallback() {
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
