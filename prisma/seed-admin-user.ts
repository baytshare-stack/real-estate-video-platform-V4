/**
 * Create or update an ADMIN user (for /admin-login + admin dashboard).
 * Does not touch NextAuth registration or other auth code.
 *
 * Usage (from project root; loads .env / .env.local like Next.js):
 *   CREATE_ADMIN_EMAIL=you@example.com CREATE_ADMIN_PASSWORD='your-password' npm run seed:admin
 *
 * Optional: CREATE_ADMIN_NAME="Display Name"
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { hashCredentialPassword } from "../src/lib/hash-user-password";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function sanitizeUsernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "admin";
  const s = local.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return (s || "admin").slice(0, 30);
}

async function main() {
  const email = (process.env.CREATE_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.CREATE_ADMIN_PASSWORD || "";
  const displayName = (process.env.CREATE_ADMIN_NAME || "Admin").trim() || "Admin";

  if (!email.includes("@")) {
    console.error("Missing or invalid CREATE_ADMIN_EMAIL.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Set CREATE_ADMIN_PASSWORD (minimum 6 characters).");
    process.exit(1);
  }

  const passwordHash = await hashCredentialPassword(password);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email,
        role: "ADMIN",
        passwordHash,
        fullName: displayName,
        name: displayName,
      },
    });
    console.log("OK: updated user to ADMIN, id=%s", existing.id);
    console.log("Sign in at /admin-login with this email and password.");
    return;
  }

  let username = sanitizeUsernameFromEmail(email);
  const clash = await prisma.user.findUnique({ where: { username } });
  if (clash) {
    username = `${username}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const created = await prisma.user.create({
    data: {
      username,
      fullName: displayName,
      name: displayName,
      email,
      passwordHash,
      role: "ADMIN",
      phoneVerified: true,
      profile: {
        create: {
          name: displayName,
          contactEmail: email,
        },
      },
    },
    select: { id: true },
  });

  console.log("OK: created ADMIN user, id=%s", created.id);
  console.log("Sign in at /admin-login with this email and password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
