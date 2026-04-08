/**
 * Production build:
 * - Local/CI default: Prisma migrate + generate + Next build.
 * - Vercel default: skip migrate during build to avoid advisory-lock races;
 *   run migrations separately (e.g. `npm run migrate:deploy` from CI/terminal).
 * Set RUN_MIGRATIONS_ON_BUILD=true to force migrate in any environment.
 */
const { execSync } = require("node:child_process");
const path = require("node:path");

const { applyDirectUrlFallback } = require(path.join(__dirname, "ensure-direct-url-env.cjs"));
applyDirectUrlFallback();

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

const forceMigrate = String(process.env.RUN_MIGRATIONS_ON_BUILD || "").toLowerCase() === "true";
const isVercel = process.env.VERCEL === "1";

if (forceMigrate || !isVercel) {
  run("npx prisma migrate deploy");
} else {
  console.warn(
    "[build] Skipping `prisma migrate deploy` on Vercel build. " +
      "Run migrations separately, then redeploy."
  );
}
run("npx prisma generate");
run("npx next build --webpack");
