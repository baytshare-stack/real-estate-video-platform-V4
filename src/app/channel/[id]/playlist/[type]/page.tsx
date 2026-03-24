import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import VideoCard from "@/components/VideoCard";
import { notFound } from "next/navigation";
import Link from "next/link";

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

function mapPropertyTypeToVideoPropertyType(propertyType: string | null | undefined): VideoPropertyType {
  switch (propertyType) {
    case "APARTMENT":
      return "APARTMENT";
    case "VILLA":
      return "VILLA";
    case "LAND":
      return "LAND";
    case "HOUSE":
      return "TOWNHOUSE";
    case "OFFICE":
    case "SHOP":
    case "COMMERCIAL":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export default async function ChannelPlaylistPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const unwrappedParams = await params;
  const channelId = unwrappedParams.id;
  const requested = String(unwrappedParams.type || "").toUpperCase();

  if (!PLAYLIST_TYPES.includes(requested as VideoPropertyType)) return notFound();
  const playlistType = requested as VideoPropertyType;

  const channel = await safeFindFirst(() =>
    prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        owner: true,
        videos: {
          where: { isShort: false },
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );

  if (!channel) return notFound();

  const getVideoPropertyType = (v: (typeof channel.videos)[number]): VideoPropertyType => {
    const denormalized = (v as any).propertyType as string | undefined;
    if (denormalized) return denormalized as VideoPropertyType;
    return mapPropertyTypeToVideoPropertyType(v.property?.propertyType);
  };

  const videos = channel.videos.filter((v) => getVideoPropertyType(v) === playlistType);

  const profileImage = channel.profileImage ?? channel.avatar ?? undefined;

  return (
    <div className="w-full bg-[#0f0f0f] min-h-screen">
      <div className="max-w-[2000px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{PLAYLIST_TITLES[playlistType]}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {channel.name} • {videos.length} video{videos.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href={`/channel/${channelId}`}
            className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors"
          >
            Back to channel
          </Link>
        </div>

        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
            {videos.map((video) => (
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
        ) : (
          <div className="py-12 text-center text-gray-400">No videos in this playlist yet.</div>
        )}
      </div>
    </div>
  );
}

