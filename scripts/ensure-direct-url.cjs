/**
 * If .env has DATABASE_URL but not DIRECT_URL, append DIRECT_URL for Prisma.
 * Neon: pooled hosts contain "-pooler." — direct host drops that segment.
 */
const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.error("No .env file found.");
  process.exit(1);
}
let raw = fs.readFileSync(envPath, "utf8");
if (/^DIRECT_URL=/m.test(raw)) {
  console.log("DIRECT_URL already set.");
  process.exit(0);
}
const m = raw.match(/^DATABASE_URL=(.+)$/m);
if (!m) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}
let dbUrl = m[1].trim();
if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
  dbUrl = dbUrl.slice(1, -1);
}
const direct = dbUrl.replace("-pooler.", ".");
const line = `\n# Prisma migrate — direct Postgres (see Neon dashboard if migrate fails)\nDIRECT_URL=${JSON.stringify(direct)}\n`;
fs.appendFileSync(envPath, line);
console.log("Appended DIRECT_URL to .env.");
