"use client";

import { useState, useEffect, use } from 'react';
import { ThumbsUp, Share2, PhoneCall, MessageCircle, MapPin, Bed, Bath, Maximize, Bell } from 'lucide-react';
import VideoCard from '@/components/VideoCard';
import ShareModal from '@/components/ShareModal';
import Link from 'next/link';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useSession } from 'next-auth/react';
import YouTubePlayer from '@/components/video/YouTubePlayer';
import { getYouTubeEmbedUrl } from '@/lib/youtube';
import WatchPageComments from '@/components/watch/WatchPageComments';

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const videoId = unwrappedParams.id;
  const { t } = useTranslation();
  const { status: sessionStatus } = useSession();
  const [videoData, setVideoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Engagement State
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await fetch(`/api/video/watch?id=${videoId}`);
        if (!res.ok) throw new Error('Failed to fetch video');
        const data = await res.json();
        setVideoData(data);
        setLikesCount(data.likesCount || 0);
        setIsLiked(data.userReaction === "LIKE");
        setIsSubscribed(Boolean(data.subscribedToChannel));
        
        // Fetch recommendations asynchronously
        fetch(`/api/recommendations/similar?videoId=${videoId}`)
          .then(r => r.json())
          .then(data => { if (Array.isArray(data)) setRecommendations(data); })
          .catch(e => console.error("Recs error", e));

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (videoId) fetchVideo();
  }, [videoId]);

  const handleLike = async () => {
    if (sessionStatus !== "authenticated") return;

    const previousReaction = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: "LIKE" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        likesCount?: number;
        userReaction?: "LIKE" | "DISLIKE" | null;
      };
      if (!res.ok) throw new Error(data.error || "Like failed");

      if (typeof data.likesCount === "number") setLikesCount(data.likesCount);
      setIsLiked(data.userReaction === "LIKE");
    } catch (e) {
      console.error(e);
      setIsLiked(previousReaction);
      setLikesCount(previousCount);
    }
  };

  const handleSubscribe = async () => {
    if (sessionStatus !== "authenticated") return;
    const chId = videoData?.channelId || videoData?.channel?.id;
    if (!chId) return;

    const prev = isSubscribed;
    setIsSubscribed(!prev);
    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(chId)}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; subscribed?: boolean };
      if (!res.ok) throw new Error(data.error || "Subscribe failed");
      if (typeof data.subscribed === "boolean") setIsSubscribed(data.subscribed);
    } catch (e) {
      console.error(e);
      setIsSubscribed(prev);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading video...</div>;
  if (error || !videoData) return <div className="min-h-screen flex items-center justify-center text-white">Error loading video or not found. <Link href="/" className="ml-2 text-blue-500">Go home</Link></div>;

  const video = videoData;
  const channel = videoData.channel || {};
  const contact = videoData.contact || {};

  const formattedPrice = `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(video.price || 0)} ${video.currency || 'USD'}`;
  const locationString = video.location || `${video.city || ''}, ${video.country || ''}`.replace(/^,\s*|\s*,$/g, '');

  return (
    <>
    <div className="max-w-[1600px] mx-auto p-4 lg:p-6 lg:grid lg:grid-cols-[1fr_400px] gap-6">
      
      {/* Primary Column: Video & Details */}
      <div className="flex flex-col gap-4 w-full overflow-hidden">
        
        {/* The Video Player Area */}
        <div
          className={[
            "bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative flex items-center justify-center",
            video.isShort
              ? "aspect-[9/16] w-full max-w-[400px] mx-auto"
              : "w-full aspect-video",
          ].join(" ")}
        >
            {video.videoUrl ? (
                getYouTubeEmbedUrl(video.videoUrl) ? (
                  /* YouTube: embed iframe; invalid / non-YouTube URLs still use native <video> below */
                  <YouTubePlayer watchUrl={video.videoUrl} title={video.title} className="w-full h-full min-h-0" />
                ) : (
                  <video src={video.videoUrl} controls className="w-full h-full object-contain" poster={video.thumbnailUrl} />
                )
            ) : (
               <div className="text-gray-500 flex flex-col items-center">
                  <PlaySquareIcon className="w-16 h-16 text-gray-700 mb-2" />
                  <p>Processing Video Stream</p>
               </div>
            )}
        </div>

        {/* Video Title */}
        <h1 className="text-xl md:text-2xl font-bold text-white mt-2 font-[family-name:var(--font-geist-sans)] line-clamp-2 leading-tight">{video.title}</h1>

        {/* Interactions & Channel Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
            
            <div className="flex items-center gap-3">
                <Link href={`/channel/${channel.id}`}>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                        <img src={channel.avatarUrl || `https://ui-avatars.com/api/?name=${channel.name}&background=random`} alt={channel.name} className="w-full h-full object-cover" />
                    </div>
                </Link>
                <div className="flex flex-col justify-center">
                    <Link href={`/channel/${video.channelId || 'demo'}`}>
                        <h3 className="text-white font-medium text-base md:text-lg leading-tight hover:text-blue-400 transition-colors line-clamp-1">{channel.channelName || 'Unknown Channel'}</h3>
                    </Link>
                    <p className="text-gray-400 text-xs md:text-sm">{channel.followersCount || 0} {t('watch', 'subscribers')}</p>
                </div>
                <button 
                    type="button"
                    onClick={() => void handleSubscribe()}
                    className={`ml-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-medium transition-colors flex items-center gap-2 text-sm ${
                        isSubscribed ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-black hover:bg-gray-200'
                    }`}
                >
                    {isSubscribed ? <><Bell className="w-4 h-4" /> {t('watch', 'subscribed')}</> : t('watch', 'subscribe')}
                </button>
            </div>

            <div className="flex items-center gap-1 md:gap-2 bg-gray-900 rounded-full p-1 border border-gray-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => void handleLike()} 
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 rounded-full transition-colors text-sm font-medium ${isLiked ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/10 text-white'}`}
                >
                    <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-blue-400' : ''}`} /> {likesCount}
                </button>
                <div className="w-[1px] h-5 md:h-6 bg-gray-700"></div>
                <button 
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 hover:bg-white/10 rounded-full transition-colors text-white text-sm font-medium"
                >
                    <Share2 className="w-4 h-4 md:w-5 md:h-5" /> {t('watch', 'share')}
                </button>
            </div>
        </div>

        {/* Property Information Card (Below Video Layout as requested) */}
        <div className="bg-gray-900/50 rounded-2xl p-4 md:p-5 border border-gray-800 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{formattedPrice}</h2>
                <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm">
                   <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded font-bold text-xs">{video.status === 'FOR_SALE' ? t('watch', 'forSale') : t('watch', 'forRent')}</span>
                   <span>• {video.viewsCount || 0} {t('watch', 'views')} • {new Date(video.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap gap-4 py-3 md:py-4 border-y border-gray-800/50 my-3 md:my-4">
                <div className="flex items-center gap-2 text-gray-300">
                    <Bed className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.bedrooms}</strong> {t('watch', 'beds')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                    <Bath className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.bathrooms}</strong> {t('watch', 'baths')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                    <Maximize className="w-4 h-4 md:w-5 md:h-5 text-gray-500" />
                    <span className="text-sm md:text-base"><strong className="text-white">{video.sizeSqm}</strong> {t('watch', 'sqm')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 w-full sm:w-auto mt-1 sm:mt-0">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-gray-500 shrink-0" />
                    <span className="text-sm md:text-base truncate"><strong className="text-white">{locationString}</strong></span>
                </div>
            </div>

            <p className="text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                {video.description}
            </p>

            {/* Contact Action Buttons */}
            {contact.rawPhone && (
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3">
                    <a 
                        href={contact.whatsappLink || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center gap-2 py-3 px-4 md:px-6 rounded-xl font-bold text-base md:text-lg transition-colors shadow-lg shadow-[#25D366]/20"
                    >
                        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" /> WhatsApp
                    </a>
                    <a 
                        href={`tel:${contact.rawPhone.replace(/\s+/g, '')}`} 
                        className="flex-1 bg-white hover:bg-gray-200 text-black flex items-center justify-center gap-2 py-3 px-4 md:px-6 rounded-xl font-bold text-base md:text-lg transition-colors shadow-lg shadow-white/10"
                    >
                        <PhoneCall className="w-5 h-5 md:w-6 md:h-6" /> {contact.rawPhone}
                    </a>
                </div>
            )}
        </div>

        <WatchPageComments videoId={videoId} />

      </div>

      {/* Secondary Column: Recommendations */}
      <div className="hidden lg:flex flex-col gap-4 min-w-0">
        <h3 className="text-lg font-bold text-white">{t('watch', 'recommended')}</h3>
        {recommendations?.map((rec: any) => (
           <VideoCard 
             key={rec.id} 
             {...rec}
             channelId={rec.channelId ?? rec.channel?.id}
             channelName={rec.channel?.channelName}
             channelAvatarUrl={rec.channel?.avatarUrl}
           />
        ))}
      </div>

    </div>
    
    <ShareModal 
      isOpen={isShareModalOpen} 
      onClose={() => setIsShareModalOpen(false)} 
      title={video?.title || 'Check out this property!'}
    />
    </>
  );
}

function PlaySquareIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="m9 8 6 4-6 4Z"/></svg>
}
