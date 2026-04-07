import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function requireStudioUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
}

export async function requireAdvertiserProfile() {
  const user = await requireStudioUser();
  if (!user) return null;
  const profile = await prisma.advertiserProfile.findUnique({
    where: { userId: user.id },
  });
  return { user, profile };
}

