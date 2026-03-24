import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";

/** Must match `prisma/seed.ts` super-admin login (public registration cannot create ADMIN). */
const ADMIN_EMAIL = "admin@bytak1tube.com";
const ADMIN_PASSWORD = "123456";
const ADMIN_FULL_NAME = "Admin";

async function ensureAdmin() {
  const existing = await safeFindUnique(() =>
    prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, email: true },
    })
  );

  if (existing) {
    return { created: false as const, userId: existing.id };
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const created = await prisma.user.create({
    data: {
      username: "admin",
      fullName: ADMIN_FULL_NAME,
      name: ADMIN_FULL_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      phoneVerified: true,
      profile: {
        create: {
          name: ADMIN_FULL_NAME,
          contactEmail: ADMIN_EMAIL,
        },
      },
    },
    select: { id: true },
  });

  return { created: true as const, userId: created.id };
}

export async function POST(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  const providedToken =
    request.headers.get("x-seed-admin-token") ??
    request.headers.get("authorization") ??
    "";

  // Token protection for production.
  // In non-production, we allow running without a token for developer convenience.
  if (configuredToken) {
    if (providedToken !== configuredToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed token not configured" }, { status: 500 });
  }

  try {
    const result = await ensureAdmin();
    return NextResponse.json(result);
  } catch (err: any) {
    // Avoid leaking sensitive info (e.g. SQL details).
    return NextResponse.json(
      { error: err?.message || "Failed to seed admin user" },
      { status: 500 }
    );
  }
}

