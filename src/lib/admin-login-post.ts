import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  signAdminToken,
} from "@/lib/admin-jwt";

const DEBUG =
  process.env.NODE_ENV === "development" || process.env.ADMIN_AUTH_DEBUG === "1";

/**
 * Shared POST handler for admin login (separate from NextAuth user sessions).
 * Only `Role.ADMIN` accounts may authenticate; password verified with bcrypt.
 */
export async function handleAdminLoginPost(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await safeFindFirst(() =>
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, role: true, passwordHash: true, email: true },
      })
    );

    if (DEBUG) {
      console.info(
        "[admin-auth]",
        "lookup",
        email,
        user
          ? { id: user.id, role: user.role, hasPasswordHash: Boolean(user.passwordHash) }
          : "not found"
      );
    }

    const isAdminRole = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (!user || !isAdminRole || !user.passwordHash) {
      if (DEBUG) console.info("[admin-auth] rejected: user missing, not admin role, or no password hash");
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (DEBUG) {
      console.info("[admin-auth] bcrypt.compare result:", passwordOk);
    }

    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signAdminToken({
      userId: user.id,
      role: "ADMIN",
    });

    const res = NextResponse.json({
      ok: true,
      userId: user.id,
      role: "admin",
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions());
    return res;
  } catch (e) {
    console.error("[admin-auth] unexpected error", e);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
