import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** App root (stable when multiple lockfiles / monorepo confuse `process.cwd()` during trace). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Must match `generator client { output = ... }` in prisma/schema.prisma */
const prismaClientDir = path.join(projectRoot, "src", "generated", "prisma");

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  /**
   * Prisma client is generated under `src/generated/prisma` (see prisma/schema.prisma).
   * Next.js 16 defaults to Turbopack for some pipelines; custom `webpack` triggers a warning unless
   * `next build --webpack` / `next dev --webpack` is used, or turbopack is configured.
   * Relative alias works on Vercel/Linux; absolute path kept for webpack on Windows.
   */
  turbopack: {
    resolveAlias: {
      "@prisma/client": "./src/generated/prisma",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      "@prisma/client": prismaClientDir,
    };
    return config;
  },
};

export default nextConfig;
