import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ensureUserProfile } from "@/lib/ensureUserProfile";
import ProfilePageClient, { type ProfileUserPayload } from "@/app/profile/ProfilePageClient";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
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
    redirect("/login");
  }

  const initialUser = JSON.parse(JSON.stringify(user)) as ProfileUserPayload;

  return <ProfilePageClient initialUser={initialUser} fromStudio />;
}
