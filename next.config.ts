import path from "node:path";
import type { NextConfig } from "next";

/** Must match `generator client { output = ... }` in prisma/schema.prisma */
const prismaClientDir = path.join(process.cwd(), "src", "generated", "prisma");

const nextConfig: NextConfig = {
  /**
   * Prisma client is generated under `src/generated/prisma` (see prisma/schema.prisma).
   * Do not use `turbopack.resolveAlias` with absolute Windows paths — Turbopack errors with
   * "windows imports are not implemented yet". Use `npm run dev` → `next dev --webpack`.
   */
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string | false | string[]>),
      "@prisma/client": prismaClientDir,
    };
    return config;
  },
};

export default nextConfig;
