import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  allowUnconfiguredEmail,
  isTransactionalEmailConfigured,
  sendRegistrationOtpEmail,
} from "@/lib/email";
import { generateNumericOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";
import { userWherePhoneMatches } from "@/lib/userPhone";

type Body = {
  purpose?: "login" | "register";
  phone?: string;
  email?: string;
};

/** True for accounts verified under the legacy phone-OTP flow (no pending email OTP). */
function legacyPhoneVerifiedAccount(user: {
  emailVerified: Date | null;
  phoneVerified: boolean;
  otpCode: string | null;
  otpExpiresAt: Date | null;
}): boolean {
  return (
    !user.emailVerified &&
    user.phoneVerified &&
    !user.otpCode &&
    !user.otpExpiresAt
  );
}

function canReceiveEmailOtp(user: {
  emailVerified: Date | null;
  phoneVerified: boolean;
  otpCode: string | null;
  otpExpiresAt: Date | null;
}): boolean {
  return Boolean(user.emailVerified) || legacyPhoneVerifiedAccount(user);
}

/** @returns true if the provider accepted the message */
async function trySendOtpEmail(
  allowFallback: boolean,
  emailConfigured: boolean,
  to: string,
  otpPlain: string
): Promise<boolean> {
  if (allowFallback && !emailConfigured) {
    console.warn("[otp/send] Skipping email: not configured (dev or ALLOW_UNCONFIGURED_EMAIL).");
    return false;
  }
  try {
    await sendRegistrationOtpEmail(to, otpPlain);
    return true;
  } catch (e) {
    if (allowFallback) {
      console.error("[otp/send] sendEmail failed; OTP returned in response.", e);
      return false;
    }
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const purpose = body.purpose;
    const emailOptional = allowUnconfiguredEmail();
    const emailConfigured = isTransactionalEmailConfigured();

    if (
      !emailOptional &&
      !emailConfigured &&
      (purpose === "register" || purpose === "login")
    ) {
      return NextResponse.json(
        {
          error: "Email delivery is not configured on this server.",
          hint:
            "Set RESEND_API_KEY + RESEND_FROM_EMAIL or SMTP (e.g. on Vercel). For local `next start` without email, set ALLOW_UNCONFIGURED_EMAIL=true — never on public production.",
        },
        { status: 503 }
      );
    }

    if (purpose === "register") {
      const email = (body.email || "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }
      if (user.emailVerified) {
        return NextResponse.json({ error: "Email already verified" }, { status: 400 });
      }

      const otpPlain = generateNumericOtp(6);
      console.log("EMAIL OTP:", otpPlain);
      const otpHash = await hashOtp(otpPlain);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otpHash,
          otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      });

      let sent = false;
      try {
        sent = await trySendOtpEmail(
          emailOptional,
          emailConfigured,
          user.email,
          otpPlain
        );
      } catch (e) {
        console.error("[otp/send register email]", e);
        return NextResponse.json({ error: "Failed to send email" }, { status: 503 });
      }

      const resBody: { ok: true; otp?: string } = { ok: true };
      if (emailOptional && !sent) resBody.otp = otpPlain;
      return NextResponse.json(resBody);
    }

    if (purpose === "login") {
      const em = (body.email || "").trim().toLowerCase();
      const raw = (body.phone || "").trim();

      let user: Awaited<ReturnType<typeof prisma.user.findUnique>> = null;

      if (em) {
        user = await prisma.user.findUnique({ where: { email: em } });
      } else if (raw) {
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
      } else {
        return NextResponse.json({ error: "Email or phone is required" }, { status: 400 });
      }

      if (!user?.email) {
        return NextResponse.json({ error: "No account found" }, { status: 404 });
      }

      if (!canReceiveEmailOtp(user)) {
        return NextResponse.json(
          { error: "Complete email verification before using code sign-in" },
          { status: 400 }
        );
      }

      const otpPlain = generateNumericOtp(6);
      const otpHash = await hashOtp(otpPlain);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otpHash,
          otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
          phoneLoginToken: null,
          phoneLoginTokenExpiresAt: null,
        },
      });

      let sent = false;
      try {
        sent = await trySendOtpEmail(
          emailOptional,
          emailConfigured,
          user.email,
          otpPlain
        );
      } catch (e) {
        console.error("[otp/send login email]", e);
        return NextResponse.json({ error: "Failed to send email" }, { status: 503 });
      }

      const resBody: { ok: true; otp?: string } = { ok: true };
      if (emailOptional && !sent) resBody.otp = otpPlain;
      return NextResponse.json(resBody);
    }

    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  } catch (e) {
    console.error("[otp/send]", e);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
