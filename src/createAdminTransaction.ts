/**
 * One-off script: create or promote ADMIN (same fields as prisma/seed-admin-user.ts).
 * Run from project root: npx tsx src/createAdminTransaction.ts
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { hashCredentialPassword } from "./lib/hash-user-password";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function sanitizeUsernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "admin";
  const s = local.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return (s || "admin").slice(0, 30);
}

async function main() {
  const email = "baytaktube@gmail.com".trim().toLowerCase();
  const password = "Maged@#Maged@99306637";

  if (!email.includes("@") || password.length < 6) {
    console.error("Set a valid email and password (min 6 characters).");
    process.exit(1);
  }

  const passwordHash = await hashCredentialPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, fullName: true, name: true },
      });

      if (existing) {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            email,
            role: "ADMIN",
            passwordHash,
            fullName: existing.fullName || "Admin",
            name: existing.name || "Admin",
          },
        });
        console.log("Existing user updated to ADMIN:", email);
        return;
      }

      let username = sanitizeUsernameFromEmail(email);
      const clash = await tx.user.findUnique({ where: { username } });
      if (clash) {
        username = `${username}_${Math.random().toString(36).slice(2, 8)}`;
      }

      await tx.user.create({
        data: {
          username,
          fullName: "Admin",
          name: "Admin",
          email,
          passwordHash,
          role: "ADMIN",
          phoneVerified: true,
          profile: {
            create: {
              name: "Admin",
              contactEmail: email,
            },
          },
        },
      });
      console.log("Admin created successfully:", email);
    });
  } catch (error) {
    console.error("Transaction failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
