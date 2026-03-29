import prisma from "@/lib/prisma";

/**
 * Ensures a Profile row exists for the user. Fixes missing profiles after partial OAuth flows
 * or legacy data so GET /api/profile and the profile page always have a stable record.
 */
export async function ensureUserProfile(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      name: true,
      email: true,
    },
  });
  if (!user) return;

  const display = user.fullName?.trim() || user.name?.trim() || user.email?.split("@")[0] || "User";

  await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      name: display,
      contactEmail: user.email ?? undefined,
    },
    update: {},
  });
}
