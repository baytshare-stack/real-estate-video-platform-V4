"use client";

import { useState } from 'react';
import VideoCard from '@/components/VideoCard';
import { Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/LanguageProvider';
import PropertyMap from '@/components/PropertyMap';

export default function SearchClient({ initialVideos, initialQuery }: { initialVideos: any[], initialQuery: string }) {
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Top Search & Filter Bar */}
      <div className="bg-[#0f0f0f] border-b border-white/10 p-4 shrink-0 z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center max-w-[2000px] mx-auto">
           
           <form onSubmit={handleSearch} className="flex-1 w-full flex items-center bg-gray-900 border border-gray-700 focus-within:border-blue-500 rounded-lg px-3 lg:px-4 py-2 opacity-90 transition-opacity focus-within:opacity-100">
             <Search className="w-5 h-5 text-gray-500 mr-3 hidden sm:block" />
             <input 
               type="text" 
               placeholder={t('search', 'placeholder')} 
               className="bg-transparent text-white w-full outline-none" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
             <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md font-medium text-sm transition-colors ml-2 shadow-lg shadow-blue-600/20">
               {t('nav', 'search')}
             </button>
           </form>

           <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar shrink-0">
             <select className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 appearance-none">
               <option>All Types</option>
               <option>Villa</option>
               <option>Apartment</option>
               <option>Land</option>
             </select>
             
             <select className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 appearance-none">
               <option>Any Price</option>
               <option>$1M - $5M</option>
               <option>$5M - $10M</option>
               <option>$10M+</option>
             </select>

             <select className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500 appearance-none">
               <option>Beds</option>
               <option>1+</option>
               <option>3+</option>
               <option>5+</option>
             </select>

             <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
                 <SlidersHorizontal className="w-4 h-4" /> Filters
             </button>
             
             <button 
                 type="button"
                 onClick={() => setIsMapVisible(!isMapVisible)}
                 className={`flex items-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isMapVisible ? 'bg-blue-600/10 text-blue-400 border-blue-500/50' : 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700'}`}
             >
                <MapPin className="w-4 h-4" /> {isMapVisible ? 'Hide Map' : 'Show Map'}
             </button>
           </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Results Scroll Area */}
        <div className={`h-full overflow-y-auto ${isMapVisible ? 'w-full lg:w-[55%] xl:w-[50%]' : 'w-full'} transition-all duration-300`}>
           <div className="p-4 md:p-6 lg:p-8">
              <h2 className="text-xl font-bold text-white mb-6 bg-clip-text">
                {initialVideos.length} Results found {initialQuery ? `for "${initialQuery}"` : ''}
              </h2>
              
              <div className={`grid gap-x-4 gap-y-8 ${isMapVisible ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'}`}>
                 {initialVideos.length > 0 ? initialVideos.map(video => (
                   <VideoCard 
                      key={video.id} 
                      {...video} 
                      price={video.property?.price ? Number(video.property.price) : video.price}
                      currency={video.property?.currency || video.currency || "USD"}
                      bedrooms={video.property?.bedrooms || video.bedrooms}
                      bathrooms={video.property?.bathrooms || video.bathrooms}
                      sizeSqm={video.property?.sizeSqm || video.sizeSqm}
                      status={video.property?.status || video.status}
                      videoUrl={video.videoUrl}
                      channelName={video.channelName || video.channel?.name || "Unknown Channel"}
                      channelAvatarUrl={video.channelAvatarUrl || video.channel?.avatar}
                      location={`${video.property?.city || video.city}, ${video.property?.country || video.country || 'Unknown'}`}
                   />
                 )) : (
                   <div className="col-span-full py-20 text-center text-gray-500">
                      {t('search', 'noResults')}
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Interactive Map Area (Right Side) */}
        {isMapVisible && (
          <div className="hidden lg:block flex-1 bg-gray-950 border-l border-white/10 relative">
             <PropertyMap
               className="absolute inset-0"
               videos={initialVideos.map((video) => ({
                 id: video.id,
                 title: video.title,
                 price: video.property?.price ? Number(video.property.price) : video.price,
                 currency: video.property?.currency || video.currency || "USD",
                 thumbnailUrl: video.thumbnailUrl || video.thumbnail,
                 latitude: video.property?.latitude ?? video.latitude,
                 longitude: video.property?.longitude ?? video.longitude,
               }))}
             />
          </div>
        )}

      </div>
    </div>
  );
}
