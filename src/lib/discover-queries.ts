import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { safeCount, safeFindFirst, safeFindMany } from "@/lib/safePrisma";

export const DISCOVER_PAGE_SIZE = 12;

export type DiscoverSort = "featured" | "rating" | "newest";

export type DiscoverListParams = {
  q?: string;
  city?: string;
  country?: string;
  verifiedOnly?: boolean;
  topRated?: boolean;
  sort?: DiscoverSort;
  page?: number;
};

const discoverUserSelect = {
  id: true,
  fullName: true,
  name: true,
  image: true,
  country: true,
  city: true,
  rating: true,
  isFeatured: true,
  isVerified: true,
  createdAt: true,
  role: true,
  profile: {
    select: {
      avatar: true,
      bio: true,
      name: true,
      location: true,
      contactPhone: true,
      contactEmail: true,
    },
  },
  channel: {
    select: {
      id: true,
      name: true,
      avatar: true,
      profileImage: true,
      phone: true,
      whatsapp: true,
      whatsappUrl: true,
      subscribersCount: true,
      _count: { select: { videos: true } },
    },
  },
} satisfies Prisma.UserSelect;

export type DiscoverUserRow = Prisma.UserGetPayload<{ select: typeof discoverUserSelect }>;

function safeDbHostForLog(): string {
  const u = process.env.DATABASE_URL;
  if (!u?.trim()) return "(DATABASE_URL unset)";
  try {
    return new URL(u.replace(/^postgresql:/i, "http:")).hostname;
  } catch {
    return "(DATABASE_URL parse error)";
  }
}

function logDiscoverList(
  role: "AGENT" | "AGENCY",
  total: number,
  pageItemCount: number
): void {
  if (process.env.NODE_ENV !== "production" && process.env.DISCOVER_DEBUG !== "1") {
    return;
  }
  console.log(
    `[discover] listDiscoverUsers role=${role} total=${total} pageItems=${pageItemCount} dbHost=${safeDbHostForLog()} vercel=${process.env.VERCEL ?? "0"}`
  );
}

function searchFilters(params: DiscoverListParams): Prisma.UserWhereInput {
  const parts: Prisma.UserWhereInput[] = [];
  const q = params.q?.trim();
  if (q) {
    parts.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { profile: { is: { name: { contains: q, mode: "insensitive" } } } },
        { channel: { is: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  const city = params.city?.trim();
  if (city) {
    parts.push({
      OR: [
        { city: { contains: city, mode: "insensitive" } },
        { country: { contains: city, mode: "insensitive" } },
        { profile: { is: { location: { contains: city, mode: "insensitive" } } } },
      ],
    });
  }
  const country = params.country?.trim();
  if (country) {
    parts.push({
      OR: [{ country: { contains: country, mode: "insensitive" } }],
    });
  }
  if (params.verifiedOnly) {
    parts.push({ isVerified: true });
  }
  if (params.topRated) {
    parts.push({ rating: { gte: 4 } });
  }
  return parts.length ? { AND: parts } : {};
}

function orderByForSort(sort?: DiscoverSort): Prisma.UserOrderByWithRelationInput[] {
  if (sort === "newest") {
    return [{ createdAt: "desc" }];
  }
  if (sort === "rating") {
    return [
      { rating: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ];
  }
  return [
    { isFeatured: "desc" },
    { rating: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
  ];
}

function parsePage(page?: string | string[]): number {
  const n = Number(Array.isArray(page) ? page[0] : page);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parseSort(raw?: string | string[]): DiscoverSort {
  const s = (Array.isArray(raw) ? raw[0] : raw) as DiscoverSort | undefined;
  if (s === "rating" || s === "newest") return s;
  return "featured";
}

export function parseDiscoverParams(sp: Record<string, string | string[] | undefined>): DiscoverListParams {
  const g = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return {
    q: g("q"),
    city: g("city"),
    country: g("country"),
    verifiedOnly: g("verified") === "1" || g("verified") === "true",
    topRated: g("topRated") === "1" || g("topRated") === "true",
    sort: parseSort(sp.sort),
    page: parsePage(sp.page),
  };
}

export async function listDiscoverUsers(
  role: "AGENT" | "AGENCY",
  params: DiscoverListParams
): Promise<{ items: DiscoverUserRow[]; total: number; page: number; pageSize: number }> {
  const page = params.page ?? 1;
  const pageSize = DISCOVER_PAGE_SIZE;
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = {
    role,
    isBlocked: false,
    AND: [searchFilters(params)],
  };

  const orderBy = orderByForSort(params.sort);

  const [items, total] = await Promise.all([
    safeFindMany(() =>
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: discoverUserSelect,
      })
    ),
    safeCount(() => prisma.user.count({ where })),
  ]);

  logDiscoverList(role, total, items.length);

  return { items, total, page, pageSize };
}

const profileVideoWhere: Prisma.VideoWhereInput = {
  moderationStatus: { not: "REJECTED" },
};

const agentProfileSelect = {
  id: true,
  fullName: true,
  name: true,
  image: true,
  country: true,
  city: true,
  phone: true,
  whatsapp: true,
  fullPhoneNumber: true,
  rating: true,
  isVerified: true,
  isFeatured: true,
  role: true,
  createdAt: true,
  employerId: true,
  employer: {
    select: {
      id: true,
      fullName: true,
      name: true,
      channel: { select: { id: true, name: true } },
    },
  },
  profile: {
    select: {
      bio: true,
      name: true,
      location: true,
      avatar: true,
      contactPhone: true,
      contactEmail: true,
      website: true,
    },
  },
  channel: {
    select: {
      id: true,
      name: true,
      description: true,
      avatar: true,
      profileImage: true,
      bannerImage: true,
      phone: true,
      whatsapp: true,
      whatsappUrl: true,
      websiteUrl: true,
      subscribersCount: true,
      videos: {
        where: profileVideoWhere,
        orderBy: { createdAt: "desc" },
        take: 48,
        include: { property: true },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type AgentProfile = Prisma.UserGetPayload<{ select: typeof agentProfileSelect }>;

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  const user = await safeFindFirst(() =>
    prisma.user.findFirst({
      where: { id, role: "AGENT", isBlocked: false },
      select: agentProfileSelect,
    })
  );
  return user;
}

const agencyProfileSelect = {
  id: true,
  fullName: true,
  name: true,
  image: true,
  country: true,
  city: true,
  phone: true,
  whatsapp: true,
  fullPhoneNumber: true,
  rating: true,
  isVerified: true,
  isFeatured: true,
  role: true,
  createdAt: true,
  profile: {
    select: {
      bio: true,
      name: true,
      location: true,
      avatar: true,
      contactPhone: true,
      contactEmail: true,
      website: true,
    },
  },
  channel: {
    select: {
      id: true,
      name: true,
      description: true,
      avatar: true,
      profileImage: true,
      bannerImage: true,
      phone: true,
      whatsapp: true,
      whatsappUrl: true,
      websiteUrl: true,
      subscribersCount: true,
      videos: {
        where: profileVideoWhere,
        orderBy: { createdAt: "desc" },
        take: 48,
        include: { property: true },
      },
    },
  },
  agencyAgents: {
    where: { isBlocked: false, role: "AGENT" },
    select: {
      id: true,
      fullName: true,
      name: true,
      image: true,
      city: true,
      country: true,
      rating: true,
      profile: { select: { avatar: true } },
      channel: { select: { _count: { select: { videos: true } } } },
    },
    take: 24,
  },
} satisfies Prisma.UserSelect;

export type AgencyProfile = Prisma.UserGetPayload<{ select: typeof agencyProfileSelect }>;

export async function getAgencyProfile(id: string): Promise<AgencyProfile | null> {
  const user = await safeFindFirst(() =>
    prisma.user.findFirst({
      where: { id, role: "AGENCY", isBlocked: false },
      select: agencyProfileSelect,
    })
  );
  return user;
}

export function isListablePublicProfile(user: {
  country: string | null;
  city: string | null;
  fullName: string;
  name: string | null;
  profile: { location: string | null } | null;
  channel: unknown | null;
}): boolean {
  const hasLocation =
    Boolean(user.city?.trim()) ||
    Boolean(user.country?.trim()) ||
    Boolean(user.profile?.location?.trim()) ||
    Boolean(user.channel);
  const hasName =
    Boolean(user.name?.trim()) || user.fullName !== "User" || Boolean(user.channel);
  return hasLocation && hasName;
}
