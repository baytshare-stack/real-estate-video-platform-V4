"use client";

import React from "react";
import { 
  Upload, 
  Youtube, 
  Image as ImageIcon, 
  FileVideo, 
  Loader2,
  X
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface VideoInputSectionProps {
  videoFile: File | null;
  youtubeUrl: string;
  thumbnailFile: File | null;
  isUploading: boolean;
  onVideoFileChange: (file: File | null) => void;
  onYoutubeUrlChange: (url: string) => void;
  onThumbnailFileChange: (file: File | null) => void;
}

export default function VideoInputSection({
  videoFile,
  youtubeUrl,
  thumbnailFile,
  isUploading,
  onVideoFileChange,
  onYoutubeUrlChange,
  onThumbnailFileChange
}: VideoInputSectionProps) {
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';

  return (
    <div className={`space-y-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('upload', 'videoStep')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("upload", "videoDescription")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Video Section */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileVideo className="w-4 h-4 text-gray-400" />
            {t('upload', 'videoFile')}
          </label>
          
          <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 ${
            videoFile 
              ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' 
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50/50 dark:bg-gray-800/50'
          }`}>
            <input
              type="file"
              accept="video/*"
              disabled={isUploading}
              onChange={(e) => onVideoFileChange(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            
            {videoFile ? (
              <div className="text-center">
                <FileVideo className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{videoFile.name}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); onVideoFileChange(null); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1 mx-auto"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
            ) : (
              <>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('upload', 'dragDrop')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("upload", "videoFormatsHint")}</p>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">{t("upload", "orDivider")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('upload', 'youtubeUrl')}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRTL ? 'right-4' : 'left-4'} flex items-center pointer-events-none`}>
                <Youtube className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="url"
                disabled={isUploading || !!videoFile}
                value={youtubeUrl}
                onChange={(e) => onYoutubeUrlChange(e.target.value)}
                placeholder={t('upload', 'youtubePlaceholder')}
                className={`w-full ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50`}
              />
            </div>
          </div>
        </div>

        {/* Thumbnail Section */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-gray-400" />
            {t('upload', 'thumbnail')}
          </label>

          <div className={`relative border-2 border-dashed rounded-2xl aspect-video transition-all flex flex-col items-center justify-center gap-3 overflow-hidden ${
            thumbnailFile 
              ? 'border-indigo-500' 
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 bg-gray-50/50 dark:bg-gray-800/50'
          }`}>
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={(e) => onThumbnailFileChange(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            
            {thumbnailFile ? (
              <>
                <img 
                  src={URL.createObjectURL(thumbnailFile)} 
                  alt="Thumbnail preview" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
                  <p className="text-white text-sm font-medium">{t("upload", "changeThumbnail")}</p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t('upload', 'dragDrop')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("upload", "thumbnailFormatsHint")}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 py-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{t('upload', 'uploading')}</span>
        </div>
      )}
    </div>
  );
}
