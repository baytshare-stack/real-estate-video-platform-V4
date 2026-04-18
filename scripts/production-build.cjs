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

const repoRoot = path.join(__dirname, "..");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true, cwd: repoRoot, ...opts });
}

/** Avoid `npx` resolution edge cases on CI; cwd is always the package root. */
function runNextBuild() {
  const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
  const cmd = `node ${JSON.stringify(nextBin)} build --webpack`;
  try {
    run(cmd);
  } catch (e) {
    console.error(
      "\n[build] next build failed. Scroll up in the log for the first Next.js error " +
        "(TypeScript, module not found, or prerender). " +
        "Ensure DATABASE_URL is available at build time for Prisma generate.\n"
    );
    throw e;
  }
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
runNextBuild();
