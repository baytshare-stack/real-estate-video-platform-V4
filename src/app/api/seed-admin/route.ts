import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashCredentialPassword } from "@/lib/hash-user-password";
import { safeFindFirst } from "@/lib/safePrisma";

const DEFAULT_EMAIL = "admin@bytak1tube.com";
const DEFAULT_PASSWORD = "123456";

function sanitizeUsernameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "admin";
  const s = local.replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return (s || "admin").slice(0, 30);
}

/**
 * Create admin user or reset password + role for existing row with same email (case-insensitive).
 * Credentials: JSON body and/or SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_DISPLAY_NAME.
 */
async function ensureAdminResolved(
  email: string,
  password: string,
  displayName: string
): Promise<{ created: boolean; updated: boolean; userId: string }> {
  const passwordHash = await hashCredentialPassword(password);

  const existing = await safeFindFirst(() =>
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    })
  );

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
    return { created: false, updated: true, userId: existing.id };
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

  return { created: true, updated: false, userId: created.id };
}

export async function POST(request: Request) {
  const configuredToken = process.env.SEED_ADMIN_TOKEN;
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  const providedToken =
    request.headers.get("x-seed-admin-token") ?? (bearer || "");

  if (configuredToken) {
    if (providedToken !== configuredToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seed token not configured" }, { status: 500 });
  }

  const mayReadBody =
    process.env.NODE_ENV !== "production" ||
    (Boolean(configuredToken) && providedToken === configuredToken);

  let bodyEmail: string | undefined;
  let bodyPassword: string | undefined;
  let bodyName: string | undefined;

  if (mayReadBody) {
    try {
      const raw = await request.text();
      if (raw) {
        const parsed = JSON.parse(raw) as { email?: string; password?: string; name?: string };
        if (typeof parsed.email === "string") bodyEmail = parsed.email;
        if (typeof parsed.password === "string") bodyPassword = parsed.password;
        if (typeof parsed.name === "string") bodyName = parsed.name;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const email = (bodyEmail ?? process.env.SEED_ADMIN_EMAIL ?? DEFAULT_EMAIL).trim().toLowerCase();
  const password = bodyPassword ?? process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_PASSWORD;
  const displayName = (bodyName ?? process.env.SEED_ADMIN_DISPLAY_NAME ?? "Admin").trim() || "Admin";

  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  try {
    const result = await ensureAdminResolved(email, password, displayName);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to seed admin user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
