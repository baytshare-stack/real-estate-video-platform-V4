import NextAuth, { NextAuthOptions } from "next-auth";
import type { Account } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { userWherePhoneMatches } from "@/lib/userPhone";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

const facebookClientId =
  process.env.FACEBOOK_CLIENT_ID?.trim() || process.env.FACEBOOK_APP_ID?.trim();
const facebookClientSecret =
  process.env.FACEBOOK_CLIENT_SECRET?.trim() || process.env.FACEBOOK_APP_SECRET?.trim();
const facebookConfigured = Boolean(facebookClientId && facebookClientSecret);

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
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
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

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.passwordHash) {
            throw new Error("Invalid credentials");
          }

          const isCorrectPassword = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isCorrectPassword) {
            throw new Error("Invalid credentials");
          }

          if (!user.emailVerified && !legacyPhoneVerifiedOnly(user)) {
            throw new Error("Please verify your email with the code we sent before signing in.");
          }

          return user;
        } catch (e) {
          if (e instanceof Error && e.message === "Invalid credentials") throw e;
          if (e instanceof Error && e.message.includes("verify your email")) throw e;
          console.error("[credentials authorize]", e);
          throw new Error("Invalid credentials");
        }
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
          throw new Error("Missing email or verification");
        }

        try {
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
            if (!clause) {
              throw new Error("Invalid phone");
            }
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
            throw new Error("Invalid or expired login — request a new code");
          }

          await prisma.user.update({
            where: { id: user.id },
            data: {
              phoneLoginToken: null,
              phoneLoginTokenExpiresAt: null,
            },
          });

          return user;
        } catch (e) {
          if (e instanceof Error && e.message.includes("Invalid or expired")) throw e;
          console.error("[phone-login authorize]", e);
          throw new Error("Invalid or expired login — request a new code");
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        const parsed = new URL(url);
        if (parsed.origin === baseUrl) {
          return url;
        }
      } catch {
        /* ignore */
      }
      return baseUrl;
    },
    async signIn({ user, account }) {
      const provider = (account as Account | null)?.provider;
      if (provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { role: true },
        });
        if (existing && existing.role !== "USER") {
          return "/login?error=GoogleAccountNotEligible";
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, fullName: true, name: true, username: true, image: true },
          });

          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.name = dbUser.name ?? dbUser.fullName ?? session.user.name ?? undefined;
            session.user.image = dbUser.image ?? session.user.image ?? undefined;
          }
        } catch (e) {
          console.error("[nextauth session]", e);
          session.user.role = "USER";
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      const base = user.email?.split("@")[0] ?? "user";
      const uname = `${base}-${user.id.slice(0, 6)}`;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          fullName: user.name ?? user.email ?? "User",
          name: user.name,
          username: uname,
          image: user.image,
          role: "USER",
          phoneVerified: true,
          emailVerified: new Date(),
        },
      });
      await prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          name: user.name ?? undefined,
          contactEmail: user.email ?? undefined,
        },
        update: {
          name: user.name ?? undefined,
          contactEmail: user.email ?? undefined,
        },
      });
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
