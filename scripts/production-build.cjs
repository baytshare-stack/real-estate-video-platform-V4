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

/** Windows: Prisma cannot rename query_engine*.dll while Next/dev holds it; see scripts/prisma-generate-windows.ps1 */
function runPrismaGenerate() {
  if (process.platform === "win32") {
    run(
      'powershell -NoProfile -ExecutionPolicy Bypass -File "./scripts/prisma-generate-windows.ps1"'
    );
  } else {
    run("npx prisma generate");
  }
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
runPrismaGenerate();
run("npx next build --webpack");
