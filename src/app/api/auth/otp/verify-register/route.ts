import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyOtpAgainstHash } from "@/lib/otp";

export async function POST(req: Request) {
  try {
    const { email, code } = (await req.json()) as { email?: string; code?: string };
    const em = (email || "").trim().toLowerCase();
    const c = (code || "").trim();

    if (!em || !c) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: em } });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code expired — request a new one" }, { status: 400 });
    }

    const ok = await verifyOtpAgainstHash(c, user.otpCode);
    if (!ok) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        phoneVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[otp/verify-register]", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
