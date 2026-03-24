import prisma from "@/lib/prisma";
import { safeCount, safeFindFirst } from "@/lib/safePrisma";
import VideoCard from "@/components/VideoCard";
import ShortVideoPlayer from "@/components/shorts/ShortVideoPlayer";
import SubscribeButton from "@/components/channel/SubscribeButton";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import type { ShortVideoPayload } from "@/components/shorts/types";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

type VideoPropertyType = "APARTMENT" | "VILLA" | "TOWNHOUSE" | "STUDIO" | "DUPLEX" | "LAND" | "OTHER";

const PLAYLIST_TYPES: VideoPropertyType[] = ["VILLA", "APARTMENT", "TOWNHOUSE", "STUDIO", "DUPLEX", "LAND", "OTHER"];
const PLAYLIST_TITLES: Record<VideoPropertyType, string> = {
  APARTMENT: "Apartments",
  VILLA: "Villas",
  TOWNHOUSE: "Townhouses",
  STUDIO: "Studios",
  DUPLEX: "Duplexes",
  LAND: "Lands",
  OTHER: "Other",
};

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450";

function mapPropertyTypeToVideoPropertyType(propertyType: string | null | undefined): VideoPropertyType {
  switch (propertyType) {
    case "APARTMENT":
      return "APARTMENT";
    case "VILLA":
      return "VILLA";
    case "LAND":
      return "LAND";
    case "HOUSE":
      // Legacy PropertyType has only HOUSE for multiple “house-like” categories.
      return "TOWNHOUSE";
    case "OFFICE":
    case "SHOP":
    case "COMMERCIAL":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  const unwrappedParams = await params;
  const channelId = unwrappedParams.id;
  const tabRaw = searchParams?.tab;
  const tab = String(tabRaw || "videos").toLowerCase();
  const activeTab: "videos" | "shorts" | "playlists" =
    tab === "shorts" ? "shorts" : tab === "playlists" ? "playlists" : "videos";

  const session = await getServerSession(authOptions);

  const channel = await safeFindFirst(() =>
    prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        owner: true,
        videos: {
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );

  const subscriberCount = await safeCount(() =>
    prisma.subscription.count({ where: { channelId } })
  );

  if (!channel) return notFound();

  const subscriberId = session?.user?.id as string | undefined;

  const me = subscriberId
    ? await safeFindFirst(() =>
        prisma.user.findUnique({
          where: { id: subscriberId },
          select: { channel: { select: { id: true } } },
        })
      )
    : null;

  const disabledSelf = Boolean(me?.channel?.id && me?.channel?.id === channelId);

  let initialSubscribed = false;
  if (subscriberId && !disabledSelf) {
    const existing = await safeFindFirst(() =>
      prisma.subscription.findFirst({
        where: { subscriberId, channelId },
        select: { id: true },
      })
    );
    initialSubscribed = Boolean(existing);
  }

  const profileImage = channel.profileImage ?? channel.avatar ?? undefined;
  const bannerImage = channel.bannerImage ?? channel.banner ?? undefined;

  const phone = channel.phone ?? undefined;
  const whatsappUrl = channel.whatsappUrl ?? undefined;
  const whatsapp = channel.whatsapp ?? undefined;
  const waHref = whatsappUrl
    ? whatsappUrl
    : whatsapp
      ? `https://wa.me/${digitsOnly(whatsapp)}`
      : undefined;

  const socials = [
    { label: "Facebook", href: channel.facebookUrl ?? undefined },
    { label: "Instagram", href: channel.instagramUrl ?? undefined },
    { label: "Telegram", href: channel.telegramUrl ?? undefined },
    { label: "YouTube", href: channel.youtubeUrl ?? undefined },
    { label: "Website", href: channel.websiteUrl ?? undefined },
  ].filter((s) => s.href);

  const shorts = channel.videos.filter((v) => v.isShort);
  const longs = channel.videos.filter((v) => !v.isShort);
  const shortsPayload: ShortVideoPayload[] = shorts.map((v) => ({
    id: v.id,
    title: v.title,
    videoUrl: v.videoUrl,
    thumbnail: v.thumbnail,
    channelId: channel.id,
    channelName: channel.name,
    channelAvatar: profileImage ?? channel.avatar ?? null,
    viewsCount: v.viewsCount,
    likesCount: v.likesCount,
    dislikesCount: v.dislikesCount,
    commentsCount: v.commentsCount,
    sharesCount: v.sharesCount,
    createdAt: v.createdAt.toISOString(),
    userReaction: null,
    subscribed: initialSubscribed,
  }));

  const buckets: Record<VideoPropertyType, typeof longs> = {
    APARTMENT: [],
    VILLA: [],
    TOWNHOUSE: [],
    STUDIO: [],
    DUPLEX: [],
    LAND: [],
    OTHER: [],
  };

  const getVideoPropertyType = (v: (typeof channel.videos)[number]): VideoPropertyType => {
    const denormalized = (v as any).propertyType as string | undefined;
    if (denormalized) return denormalized as VideoPropertyType;
    return mapPropertyTypeToVideoPropertyType(v.property?.propertyType);
  };

  for (const v of longs) {
    const t = getVideoPropertyType(v);
    buckets[t].push(v);
  }

  return (
    <div className="w-full bg-[#0f0f0f] min-h-screen">
      {/* Channel Banner */}
      <div className="w-full h-48 md:h-64 lg:h-80 bg-gradient-to-r from-indigo-900 to-purple-900 overflow-hidden relative">
        {bannerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerImage} alt={`${channel.name} banner`} className="w-full h-full object-cover opacity-90" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
      </div>

      {/* Channel Header Context */}
      <div className="relative -mt-16 md:-mt-24 pb-8 border-b border-white/10">
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-6">
          <div className="w-28 h-28 md:w-40 md:h-40 rounded-full border-4 border-[#0f0f0f] overflow-hidden bg-gray-800 shadow-2xl flex-shrink-0">
            {profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileImage} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <img
                // eslint-disable-next-line @next/next/no-img-element
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=random&size=200`}
                alt={channel.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 w-full text-center lg:text-left">
            <Link href={`/channel/${channelId}`} className="text-3xl md:text-4xl font-bold text-white tracking-tight hover:opacity-90">
              {channel.name}
            </Link>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1 text-gray-400 mt-2 mb-3 font-medium">
              <span>@{channel.name.replace(/\s+/g, "")}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
              <span className="text-indigo-400">{channel.owner.role === "AGENCY" ? "Real Estate Agency" : "Real Estate Agent"}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
              <span>{subscriberCount.toLocaleString()} subscriber{subscriberCount === 1 ? "" : "s"}</span>
              {channel.country ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block"></span>
                  <span className="text-gray-300">{channel.country}</span>
                </>
              ) : null}
            </div>

            <p className="text-gray-300 max-w-2xl line-clamp-2 md:line-clamp-none text-sm leading-relaxed">
              {channel.description || "Welcome to our channel! Explore our property video tours."}
            </p>

            {/* Contact info */}
            <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3">
              {phone ? (
                <a
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                >
                  Phone: {phone}
                </a>
              ) : null}
              {waHref ? (
                <a
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              ) : null}
              {channel.country ? (
                <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-xs font-semibold">
                  {channel.country}
                </span>
              ) : null}
              {socials.map((s) => (
                <a
                  key={s.label}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Subscribe button */}
          <div className="w-full lg:w-auto flex justify-center lg:justify-end pt-2">
            <SubscribeButton
              channelId={channel.id}
              initialSubscribed={initialSubscribed}
              initialSubscriberCount={subscriberCount}
              disabledSelf={disabledSelf}
              isLoggedIn={Boolean(subscriberId)}
            />
          </div>
        </div>
      </div>

      <div className="py-8">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            href={`/channel/${channelId}?tab=videos`}
            className={[
              "px-4 py-2 rounded-full text-sm font-bold transition-colors border",
              activeTab === "videos"
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10",
            ].join(" ")}
          >
            Videos
          </Link>
          <Link
            href={`/channel/${channelId}?tab=shorts`}
            className={[
              "px-4 py-2 rounded-full text-sm font-bold transition-colors border",
              activeTab === "shorts"
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10",
            ].join(" ")}
          >
            Shorts
          </Link>
          <Link
            href={`/channel/${channelId}?tab=playlists`}
            className={[
              "px-4 py-2 rounded-full text-sm font-bold transition-colors border",
              activeTab === "playlists"
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10",
            ].join(" ")}
          >
            Playlists
          </Link>
        </div>

        {/* Videos tab */}
        {activeTab === "videos" ? (
          longs.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Long videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
                {longs.map((video) => (
                  <VideoCard
                    key={video.id}
                    id={video.id}
                    title={video.title}
                    thumbnailUrl={video.thumbnail ?? undefined}
                    price={Number(video.property?.price ?? 0)}
                    currency={video.property?.currency || "USD"}
                    location={
                      video.property ? `${video.property.city}, ${video.property.country}` : "Unknown location"
                    }
                    channelName={channel.name}
                    channelAvatarUrl={profileImage}
                    channelId={channel.id}
                    viewsCount={Math.floor(Math.random() * 5000)}
                    createdAt={video.createdAt}
                    bedrooms={video.property?.bedrooms ?? undefined}
                    bathrooms={video.property?.bathrooms ?? undefined}
                    sizeSqm={video.property?.sizeSqm ?? undefined}
                    status={video.property?.status ?? undefined}
                    isShort={false}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">No property video tours uploaded yet.</div>
          )
        ) : null}

        {/* Shorts tab */}
        {activeTab === "shorts" ? (
          shorts.length > 0 ? (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-white mb-4">Shorts</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 md:gap-4">
                {shortsPayload.map((video) => (
                  <ShortVideoPlayer
                    key={video.id}
                    video={video}
                    mode="grid"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">No shorts yet.</div>
          )
        ) : null}

        {/* Playlists tab */}
        {activeTab === "playlists" ? (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-white mb-4">Playlists</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {PLAYLIST_TYPES.map((type) => {
                const vids = buckets[type];
                const preview = vids.slice(0, 3);
                return (
                  <Link
                    key={type}
                    href={`/channel/${channel.id}/playlist/${type}`}
                    className="flex-shrink-0 w-[240px] rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-white font-semibold">{PLAYLIST_TITLES[type]}</h3>
                        <p className="text-xs text-white/60 mt-1">
                          {vids.length} video{vids.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {preview.map((v) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={v.id}
                          src={v.thumbnail ?? FALLBACK_THUMBNAIL}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover border border-white/10"
                        />
                      ))}
                    </div>
                    {preview.length === 0 ? (
                      <p className="mt-3 text-xs text-white/40">No videos yet.</p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
