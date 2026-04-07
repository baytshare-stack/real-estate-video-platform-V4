import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { prefixWithLocale } from "@/i18n/routing";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import ProfilePageClient, { type ProfileUserPayload } from "../../profile/ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = (locales.includes(loc as Locale) ? loc : defaultLocale) as Locale;
  const lp = (path: string) => prefixWithLocale(locale, path);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(lp("/login"));
  }

  await ensureUserProfile(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      fullName: true,
      name: true,
      email: true,
      phone: true,
      phoneCode: true,
      phoneNumber: true,
      fullPhoneNumber: true,
      whatsapp: true,
      country: true,
      city: true,
      phoneVerified: true,
      role: true,
      image: true,
      createdAt: true,
      profile: true,
      channel: {
        select: {
          id: true,
          name: true,
          description: true,
          avatar: true,
          profileImage: true,
          phone: true,
          websiteUrl: true,
          country: true,
          whatsapp: true,
        },
      },
    },
  });

  if (!user) {
    redirect(lp("/login"));
  }

  const initialUser = JSON.parse(JSON.stringify(user)) as ProfileUserPayload;

  return <ProfilePageClient initialUser={initialUser} fromStudio />;
}
