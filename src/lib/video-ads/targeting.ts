import type { Role } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Whether this user may attach a user-ad to the given listing (own channel or agency roster). */
export async function userCanTargetVideoForAd(userId: string, userRole: Role, videoId: string): Promise<boolean> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      channel: {
        select: {
          ownerId: true,
          owner: { select: { id: true, employerId: true } },
        },
      },
    },
  });
  if (!video?.channel) return false;
  const owner = video.channel.owner;
  if (owner.id === userId) return true;
  if (userRole === "AGENCY" && owner.employerId === userId) return true;
  return false;
}
