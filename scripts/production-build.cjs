/**
 * Production build:
 * - Local/CI default: Prisma migrate + generate + Next build.
 * - Vercel default: skip migrate during build to avoid advisory-lock races;
 *   run migrations separately (e.g. `npm run migrate:deploy` from CI/terminal).
 * Set RUN_MIGRATIONS_ON_BUILD=true to force migrate in any environment.
 */
const { execSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { applyDirectUrlFallback } = require(path.join(__dirname, "ensure-direct-url-env.cjs"));
applyDirectUrlFallback();

const repoRoot = path.join(__dirname, "..");

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true, cwd: repoRoot, ...opts });
}

/** Vercel reuses build cache; a stale `.next` can break the post-compile TypeScript pass (TS6053 / missing types). */
function cleanNextDirOnVercel() {
  if (process.env.VERCEL !== "1") return;
  const nextDir = path.join(repoRoot, ".next");
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.warn("[build] Removed .next on Vercel for a clean Next.js build.");
  } catch (e) {
    console.warn("[build] Could not remove .next (non-fatal):", e && e.message ? e.message : e);
  }
}

/** Avoid shell quoting issues on Linux CI; do not use `npx`/`sh -c` for the Next CLI. */
function runNextBuild() {
  if (process.env.VERCEL === "1" && !/\bmax-old-space-size=/.test(process.env.NODE_OPTIONS || "")) {
    process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--max-old-space-size=6144"].filter(Boolean).join(" ").trim();
  }

  const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    console.error("[build] Next CLI not found at:", nextBin);
    process.exit(1);
  }

  const r = spawnSync(process.execPath, [nextBin, "build", "--webpack"], {
    stdio: "inherit",
    env: process.env,
    cwd: repoRoot,
    windowsHide: true,
  });

  if (r.error) {
    console.error("[build] Failed to spawn next build:", r.error);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(
      "\n[build] next build exited with code " +
        (r.status ?? "unknown") +
        ". In the Vercel log, scroll up to the **first** Next.js line: " +
        "`Failed to compile`, `Type error`, `Module not found`, or `Error occurred prerendering`.\n"
    );
    process.exit(r.status ?? 1);
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
cleanNextDirOnVercel();
runNextBuild();
