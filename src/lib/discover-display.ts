/** Minimal shape for discovery cards + public profiles (listing row or full profile) */
export type DiscoverDisplayUser = {
  fullName: string;
  name: string | null;
  image: string | null;
  country: string | null;
  city: string | null;
  profile: { avatar: string | null; location: string | null } | null;
  channel: {
    name: string;
    avatar: string | null;
    profileImage: string | null;
    _count?: { videos: number };
  } | null;
};

export function discoverDisplayName(row: Pick<DiscoverDisplayUser, "fullName" | "name" | "channel">): string {
  return (
    row.channel?.name?.trim() ||
    row.name?.trim() ||
    (row.fullName !== "User" ? row.fullName.trim() : "") ||
    "Professional"
  );
}

export function discoverAvatarUrl(row: DiscoverDisplayUser): string | null {
  const p = row.profile?.avatar?.trim();
  if (p) return p;
  const i = row.image?.trim();
  if (i) return i;
  const ca = row.channel?.profileImage?.trim() || row.channel?.avatar?.trim();
  if (ca) return ca;
  return null;
}

export function discoverLocation(row: DiscoverDisplayUser): string {
  const parts = [row.city?.trim(), row.country?.trim()].filter(Boolean);
  if (parts.length) return parts.join(", ");
  const loc = row.profile?.location?.trim();
  if (loc) return loc;
  return "Location on request";
}

export function discoverListingsCount(row: Pick<DiscoverDisplayUser, "channel">): number {
  return row.channel?._count?.videos ?? 0;
}
