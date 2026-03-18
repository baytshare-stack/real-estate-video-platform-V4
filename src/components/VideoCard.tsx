import Link from 'next/link';
import { Bed, Bath, Maximize } from 'lucide-react';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string; 
  price: number;
  location: string;
  channelName: string;
  channelAvatarUrl?: string;
  channelId?: string;
  viewsCount: number;
  createdAt: Date;
  isShort?: boolean;
  
  // New Property Data
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  status?: "FOR_SALE" | "FOR_RENT";
}

export default function VideoCard({ 
  id, title, thumbnailUrl, price, location, channelName, channelAvatarUrl, channelId, viewsCount, createdAt, isShort = false,
  bedrooms, bathrooms, sizeSqm, status
}: VideoCardProps) {

  // Formatter
  const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  const formattedViews = Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(viewsCount);
  
  // Calculate relative time
  const timeDiff = Math.abs(new Date().getTime() - new Date(createdAt).getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const timeAgo = diffDays > 30 ? Math.floor(diffDays/30) + ' months ago' : diffDays + ' days ago';

  if (isShort) {
    return (
      <Link href={`/watch/${id}`} className="block group w-[220px] flex-shrink-0">
        <div className="relative aspect-[9/16] rounded-xl overflow-hidden mb-2 bg-gray-900 border border-gray-800">
          <img 
            src={thumbnailUrl || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400&h=700'} 
            alt={title} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-white font-bold text-xs">
             {formattedPrice}
          </div>
          {status && (
            <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-white font-bold text-xs ${status === 'FOR_SALE' ? 'bg-blue-600' : 'bg-purple-600'}`}>
               {status === 'FOR_SALE' ? 'For Sale' : 'For Rent'}
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight">{title}</h3>
            <p className="text-gray-300 text-xs mt-1">{formattedViews} views</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 group w-full cursor-pointer">
      {/* Thumbnail */}
      <Link href={`/watch/${id}`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800/50">
          <img 
            src={thumbnailUrl || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800&h=450'} 
            alt={title} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
          {/* Status Badge */}
          {status && (
            <div className={`absolute top-2 right-2 px-3 py-1 rounded-lg text-white font-bold text-xs tracking-wide shadow-lg ${status === 'FOR_SALE' ? 'bg-blue-600/90' : 'bg-purple-600/90'}`}>
               {status === 'FOR_SALE' ? 'FOR SALE' : 'FOR RENT'}
            </div>
          )}
        </div>
      </Link>

      {/* Info Details */}
      <div className="flex gap-3 px-1">
        {/* Avatar */}
        <Link href={`/channel/${channelId ?? "demo"}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex-shrink-0 mt-1">
             <img src={channelAvatarUrl || `https://ui-avatars.com/api/?name=${channelName}&background=random`} alt={channelName} className="w-full h-full object-cover" />
          </div>
        </Link>
        
        {/* Text */}
        <div className="flex flex-col overflow-hidden w-full">
          <Link href={`/watch/${id}`}>
            <h3 className="text-white font-medium text-base line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
          </Link>
          
          <div className="text-gray-300 font-semibold text-sm mt-1">
             {formattedPrice} <span className="text-gray-500 font-normal ml-1">• {location}</span>
          </div>

          {/* Property Icons Row */}
          <div className="flex items-center gap-3 text-gray-400 text-xs mt-1.5 font-medium">
             {bedrooms && (
               <div className="flex items-center gap-1">
                 <Bed className="w-3.5 h-3.5" /> {bedrooms} Beds
               </div>
             )}
             {bathrooms && (
               <div className="flex items-center gap-1">
                 <Bath className="w-3.5 h-3.5" /> {bathrooms} Baths
               </div>
             )}
             {sizeSqm && (
               <div className="flex items-center gap-1">
                 <Maximize className="w-3.5 h-3.5" /> {sizeSqm} sqm
               </div>
             )}
          </div>
          
          <Link href={`/channel/${channelId ?? "demo"}`}>
            <div className="text-gray-400 text-xs mt-2 hover:text-white transition-colors flex items-center gap-1">
              {channelName}
              <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              <span className="w-1 h-1 rounded-full bg-gray-600 ml-1"></span>
              <span className="ml-1">{formattedViews} views</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
