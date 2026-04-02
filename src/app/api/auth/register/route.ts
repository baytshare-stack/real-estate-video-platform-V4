import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { safeFindUnique } from "@/lib/safePrisma";
import bcrypt from "bcryptjs";
import { buildFullPhoneNumber, buildWhatsappFull, getCountryByIso, normalizePlusE164 } from "@/lib/countriesData";
import { normalizeRegistrationRole } from "@/lib/roles";
import {
  allowUnconfiguredEmail,
  isTransactionalEmailConfigured,
  sendRegistrationOtpEmail,
  validateEmailEnvironment,
} from "@/lib/email";
import { generateNumericOtp, hashOtp, OTP_TTL_MS } from "@/lib/otp";
import { canonicalPhoneDigitsFromE164 } from "@/lib/userPhone";

function normalizePhone(input: string): string {
  return input.replace(/[\s\-().]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      email,
      password,
      role,
      phone,
      whatsapp,
      countryIso,
      phoneNational,
      fullPhoneNumber: clientFullPhone,
    } = body as {
      username?: string;
      email?: string;
      password?: string;
      role?: string;
      phone?: string;
      whatsapp?: string;
      countryIso?: string;
      phoneNational?: string;
      fullPhoneNumber?: string;
    };

    if (!username?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const mappedRole = normalizeRegistrationRole(role);
    if (!mappedRole) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const needsPhone = mappedRole === "AGENT" || mappedRole === "AGENCY";
    const country = getCountryByIso(countryIso?.trim());

    let fullPhone: string | null =
      typeof clientFullPhone === "string" && clientFullPhone.trim().startsWith("+")
        ? normalizePlusE164(clientFullPhone.trim(), country?.iso2)
        : null;

    if (!fullPhone && country && phoneNational?.trim()) {
      fullPhone = buildFullPhoneNumber(country.iso2, phoneNational);
    }

    if (!fullPhone && needsPhone && phone?.trim()) {
      const p = normalizePhone(phone.trim());
      fullPhone = p.startsWith("+") ? normalizePlusE164(p, country?.iso2) : null;
      if (!fullPhone && country) {
        fullPhone = buildFullPhoneNumber(country.iso2, p);
      }
    }

    if (fullPhone?.startsWith("+")) {
      fullPhone = normalizePlusE164(fullPhone, country?.iso2) ?? fullPhone;
    }

    const phoneTrim = fullPhone ? canonicalPhoneDigitsFromE164(fullPhone) ?? "" : "";
    const hasPhone = Boolean(phoneTrim);

    if (needsPhone && !hasPhone) {
      return NextResponse.json(
        { error: "Phone is required for agent and agency accounts (select country and enter number)" },
        { status: 400 }
      );
    }

    if (hasPhone && !country && !String(clientFullPhone || "").trim().startsWith("+")) {
      return NextResponse.json({ error: "Country is required when registering with a phone" }, { status: 400 });
    }

    const existingEmail = await safeFindUnique(() =>
      prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })
    );
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const existingUsername = await safeFindUnique(() =>
      prisma.user.findUnique({
        where: { username: username.trim() },
      })
    );
    if (existingUsername) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const emailOptional = allowUnconfiguredEmail();
    const emailConfigured = isTransactionalEmailConfigured();

    if (!emailOptional && !emailConfigured) {
      const { issues } = validateEmailEnvironment();
      return NextResponse.json(
        {
          error:
            "Email delivery is not configured on this server. Set Resend or SMTP environment variables (see deployment docs).",
          hint:
            "Vercel: add RESEND_API_KEY + RESEND_FROM_EMAIL (verified domain). Optional: ALLOW_UNCONFIGURED_EMAIL=true only for private demos — never on public production.",
          missing: issues,
        },
        { status: 503 }
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const whatsappFull = buildWhatsappFull(country?.iso2, whatsapp?.trim() ?? "");
    const whatsappTrim = whatsappFull ? canonicalPhoneDigitsFromE164(whatsappFull) : null;

    const display = username.trim();
    /** Email OTP verification for every new account (phone fields kept for agents/agencies). */
    const needsOtp = true;

    const otpPlain = generateNumericOtp(6);
    const otpHash = await hashOtp(otpPlain);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    const newUser = await prisma.user.create({
      data: {
        username: display,
        fullName: display,
        name: display,
        email: email.trim().toLowerCase(),
        passwordHash,
        role: mappedRole,
        country: country?.iso2 ?? null,
        phoneCode: country?.phoneCode ?? null,
        phoneNumber: hasPhone && fullPhone ? canonicalPhoneDigitsFromE164(fullPhone) : null,
        phone: hasPhone && fullPhone ? canonicalPhoneDigitsFromE164(fullPhone) : null,
        fullPhoneNumber: fullPhone,
        whatsapp: whatsappTrim,
        phoneVerified: true,
        emailVerified: null,
        otpCode: otpHash,
        otpExpiresAt,
        profile: {
          create: {
            name: display,
            contactPhone: fullPhone ?? undefined,
            contactEmail: email.trim().toLowerCase(),
            location: country?.name ?? undefined,
          },
        },
      },
      select: { id: true, email: true },
    });

    let emailSent = true;
    if (emailOptional && !emailConfigured) {
      emailSent = false;
      console.warn(
        "[register] Skipping email: not configured. OTP is included in the JSON response (dev or ALLOW_UNCONFIGURED_EMAIL)."
      );
    } else {
      try {
        await sendRegistrationOtpEmail(newUser.email, otpPlain);
      } catch (e) {
        console.error("[register] sendEmail", e);
        if (emailOptional) {
          emailSent = false;
          console.warn(
            "[register] Email send failed; keeping user and returning OTP in the response (dev or ALLOW_UNCONFIGURED_EMAIL)."
          );
        } else {
          await prisma.user.delete({ where: { id: newUser.id } }).catch(() => {});
          return NextResponse.json(
            {
              error: "Failed to send verification email",
              hint:
                "Confirm RESEND_API_KEY and a verified Resend sender domain, or valid SMTP credentials. See server logs for the provider error.",
            },
            { status: 503 }
          );
        }
      }
    }

    return NextResponse.json(
      {
        message: emailSent
          ? "Check your email for a verification code"
          : "Account created. Use the verification code below (email was not sent — dev/staging or send failure).",
        userId: newUser.id,
        email: newUser.email,
        needsOtp,
        ...(emailOptional
          ? {
              emailSent,
              ...(!emailSent ? { otp: otpPlain } : {}),
            }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
