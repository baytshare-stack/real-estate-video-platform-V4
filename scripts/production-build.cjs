/**
 * Vercel / CI: Prisma requires DIRECT_URL when `directUrl` is set in schema.
 * If only DATABASE_URL is configured, fall back so schema validation (P1012) passes.
 * Neon pooler URLs may still fail migrate with P1002 — then set DIRECT_URL to Neon's "Direct" host.
 */
const { execSync } = require("node:child_process");

const db = process.env.DATABASE_URL?.trim();
const direct = process.env.DIRECT_URL?.trim();
if (!direct && db) {
  process.env.DIRECT_URL = db;
  console.warn(
    "[build] DIRECT_URL unset — using DATABASE_URL for Prisma. " +
      "If migrate times out (Neon pooler / advisory lock), add DIRECT_URL = Neon Direct connection in Vercel."
  );
}
if (!process.env.DIRECT_URL?.trim()) {
  console.error("[build] Set DATABASE_URL or DIRECT_URL in the environment.");
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

run("npx prisma migrate deploy");
run("npx prisma generate");
run("npx next build --webpack");
