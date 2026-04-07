#!/usr/bin/env node
/**
 * Run `npx prisma …` with DIRECT_URL defaulted from DATABASE_URL (see ensure-direct-url-env.cjs).
 * Usage: node scripts/prisma-cli.cjs migrate deploy
 *        node scripts/prisma-cli.cjs generate
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { applyDirectUrlFallback } = require(path.join(__dirname, "ensure-direct-url-env.cjs"));
applyDirectUrlFallback();

const prismaArgs = process.argv.slice(2);
if (!prismaArgs.length) {
  console.error("Usage: node scripts/prisma-cli.cjs <prisma subcommand> [args…]");
  console.error("Example: node scripts/prisma-cli.cjs migrate deploy");
  process.exit(1);
}

const r = spawnSync("npx", ["prisma", ...prismaArgs], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
process.exit(r.status ?? 1);
