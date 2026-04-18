import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

/**
 * When this file exists, Prisma skips automatic `.env` loading — we restore it here.
 * Mirrors `scripts/ensure-direct-url-env.cjs`: DIRECT_URL falls back to DATABASE_URL.
 */
const root = process.cwd();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.local"), override: true });

const db = process.env.DATABASE_URL?.trim();
const direct = process.env.DIRECT_URL?.trim();
if (!direct && db) {
  process.env.DIRECT_URL = db;
}

/**
 * Replaces deprecated `package.json#prisma.seed` (Prisma 7 prep).
 * DB URLs remain in `prisma/schema.prisma` for Prisma 6.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
