import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { User } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { getEmailTransportConfig, sendEmail } from "@/lib/email";
import { userWherePhoneMatches } from "@/lib/userPhone";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

const facebookClientId =
  process.env.FACEBOOK_CLIENT_ID?.trim() ||
  process.env.FACEBOOK_APP_ID?.trim();
const facebookClientSecret =
  process.env.FACEBOOK_CLIENT_SECRET?.trim() ||
  process.env.FACEBOOK_APP_SECRET?.trim();
const facebookConfigured = Boolean(facebookClientId && facebookClientSecret);

const emailTransport = getEmailTransportConfig();
const emailSendConfigured = emailTransport.ok;
const transactionalFrom = emailTransport.ok ? emailTransport.config.from : null;

function emailProviderServer():
  | string
  | { host: string; port: number; auth: { user: string; pass: string } } {
  const raw = process.env.EMAIL_SERVER?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as { host: string; port: number; auth: { user: string; pass: string } };
    } catch {
      return raw;
    }
  }
  return {
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.EMAIL_FROM ?? "",
      pass: process.env.EMAIL_PASSWORD ?? "",
    },
  };
}

/** Legacy accounts verified via phone OTP only (before email OTP). */
function legacyPhoneVerifiedOnly(user: {
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(emailSendConfigured
      ? [
          EmailProvider({
            server: emailProviderServer(),
            from: transactionalFrom!,
            async sendVerificationRequest({ identifier, url }) {
              try {
                const host = new URL(url).host;
                const text = [
                  `Sign in to ${host}`,
                  "",
                  `Open this link to sign in: ${url}`,
                  "",
                  "If you did not request this email, you can ignore it.",
                ].join("\n");
                const html = `
                  <p>Sign in to <strong>${host}</strong></p>
                  <p><a href="${url}">Click here to sign in</a></p>
                  <p>If you did not request this email, ignore it.</p>
                `;
                await sendEmail({
                  to: identifier,
                  subject: `Sign in to ${host}`,
                  text,
                  html,
                });
              } catch (err) {
                console.error("Email error:", err);
                throw new Error("Failed to send verification email");
              }
            },
          }),
        ]
      : []),
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(facebookConfigured
      ? [
          FacebookProvider({
            clientId: facebookClientId!,
            clientSecret: facebookClientSecret!,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }
        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }
        if (!user.emailVerified && !legacyPhoneVerifiedOnly(user)) {
          throw new Error("Please verify your email before signing in.");
        }
        return user;
      },
    }),
    CredentialsProvider({
      id: "phone-login",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        email: { label: "Email", type: "text" },
        loginToken: { label: "Login token", type: "text" },
      },
      async authorize(credentials) {
        const raw = credentials?.phone?.trim();
        const email = credentials?.email?.trim().toLowerCase();
        const loginToken = credentials?.loginToken?.trim();
        if (!loginToken || (!raw && !email)) {
          throw new Error("Missing data");
        }
        let user = null;
        if (email) {
          user = await prisma.user.findFirst({
            where: {
              email,
              phoneLoginToken: loginToken,
              phoneLoginTokenExpiresAt: { gt: new Date() },
            },
          });
        } else {
          const clause = userWherePhoneMatches(raw!);
          if (!clause) throw new Error("Invalid phone");
          user = await prisma.user.findFirst({
            where: {
              AND: [
                clause,
                { phoneLoginToken: loginToken },
                { phoneLoginTokenExpiresAt: { gt: new Date() } },
                { phoneVerified: true },
              ],
            },
          });
        }
        if (!user) {
          throw new Error("Invalid or expired login");
        }
        await prisma.user.update({
          where: { id: user.id },
          data: {
            phoneLoginToken: null,
            phoneLoginTokenExpiresAt: null,
          },
        });
        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (
        (account?.provider === "google" || account?.provider === "facebook") &&
        user?.id
      ) {
        const existing = await prisma.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });
        if (!existing?.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
              otpCode: null,
              otpExpiresAt: null,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as User;
        token.id = u.id;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || token.sub || "";
        session.user.role =
          (token.role as (typeof session.user)["role"]) || "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const id = user.id as string;
      if (!id) return;
      await prisma.user.update({
        where: { id },
        data: {
          emailVerified: new Date(),
          otpCode: null,
          otpExpiresAt: null,
          phoneVerified: true,
        },
      });
      const email = user.email ?? undefined;
      const display = user.name?.trim() || email?.split("@")[0] || "User";
      await prisma.profile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          name: display,
          contactEmail: email,
        },
        update: {},
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
