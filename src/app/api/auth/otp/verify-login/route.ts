import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateLoginToken, PHONE_LOGIN_TOKEN_TTL_MS, verifyOtpAgainstHash } from "@/lib/otp";
import { userWherePhoneMatches } from "@/lib/userPhone";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; phone?: string; code?: string };
    const em = (body.email || "").trim().toLowerCase();
    const raw = (body.phone || "").trim();
    const c = (body.code || "").trim();

    if (!c || (!em && !raw)) {
      return NextResponse.json({ error: "Email (or phone) and code are required" }, { status: 400 });
    }

    let user = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;

    if (em) {
      user = await prisma.user.findUnique({ where: { email: em } });
    } else {
      const clause = userWherePhoneMatches(raw);
      if (!clause) {
        return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
      }
      user = await prisma.user.findFirst({
        where: {
          ...clause,
          phoneVerified: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code expired — request a new one" }, { status: 400 });
    }

    const ok = await verifyOtpAgainstHash(c, user.otpCode);
    if (!ok) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const loginToken = generateLoginToken();
    const loginExpires = new Date(Date.now() + PHONE_LOGIN_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        phoneLoginToken: loginToken,
        phoneLoginTokenExpiresAt: loginExpires,
        ...(!user.emailVerified
          ? { emailVerified: new Date(), phoneVerified: true }
          : {}),
      },
    });

    return NextResponse.json({
      loginToken,
      email: user.email,
      phone: raw || undefined,
    });
  } catch (e) {
    console.error("[otp/verify-login]", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
