/**
 * Production build: Prisma migrate + generate + Next (webpack).
 * DIRECT_URL fallback: ensure-direct-url-env.cjs
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const { applyDirectUrlFallback } = require(path.join(__dirname, "ensure-direct-url-env.cjs"));
applyDirectUrlFallback();

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

run("npx prisma migrate deploy");
run("npx prisma generate");
run("npx next build --webpack");
