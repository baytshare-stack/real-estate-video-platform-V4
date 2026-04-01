"use client";

import React from "react";
import { 
  Home, 
  Type, 
  Activity, 
  Bed, 
  Bath, 
  Maximize, 
  DollarSign, 
  FileText 
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface PropertyDetails {
  title: string;
  description: string;
  propertyType: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  size: string;
  price: string;
}

interface PropertyDetailsSectionProps {
  formData: PropertyDetails;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export default function PropertyDetailsSection({ formData, onChange }: PropertyDetailsSectionProps) {
  const { t, locale } = useTranslation();
  const isRTL = locale === 'ar';
  const videoPropertyTypes = ["APARTMENT", "VILLA", "TOWNHOUSE", "STUDIO", "DUPLEX", "LAND", "OTHER"] as const;

  const videoPropertyTypeLabel = (type: (typeof videoPropertyTypes)[number]) => t("upload", `types.${type}`);

  return (
    <div className={`space-y-8 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <Home className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('upload', 'propertyStep')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("upload", "propertyDescription")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label htmlFor="title" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            {t('upload', 'videoTitle')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={onChange}
            placeholder={t('upload', 'videoTitlePlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            {t('upload', 'description')}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={onChange}
            placeholder={t('upload', 'descriptionPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400 resize-none"
          />
        </div>

        {/* Property Type */}
        <div>
          <label htmlFor="propertyType" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Type className="w-4 h-4 text-gray-400" />
            {t('upload', 'propertyType')}
          </label>
          <select
            id="propertyType"
            name="propertyType"
            value={formData.propertyType}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            {videoPropertyTypes.map((type) => (
              <option key={type} value={type}>
                {videoPropertyTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Activity className="w-4 h-4 text-gray-400" />
            {t('upload', 'status')}
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            {['FOR_SALE', 'FOR_RENT'].map(status => (
              <option key={status} value={status}>{t('upload', `statuses.${status}`)}</option>
            ))}
          </select>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            {t('upload', 'price')}
          </label>
          <input
            type="number"
            id="price"
            name="price"
            min="0"
            value={formData.price}
            onChange={onChange}
            placeholder={t('upload', 'price')}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Size */}
        <div>
          <label htmlFor="size" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Maximize className="w-4 h-4 text-gray-400" />
            {t('upload', 'size')}
          </label>
          <input
            type="number"
            id="size"
            name="size"
            min="0"
            value={formData.size}
            onChange={onChange}
            placeholder="e.g. 150"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Bedrooms */}
        <div>
          <label htmlFor="bedrooms" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Bed className="w-4 h-4 text-gray-400" />
            {t('upload', 'bedrooms')}
          </label>
          <input
            type="number"
            id="bedrooms"
            name="bedrooms"
            min="0"
            value={formData.bedrooms}
            onChange={onChange}
            placeholder={t("upload", "bedroomsPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Bathrooms */}
        <div>
          <label htmlFor="bathrooms" className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <Bath className="w-4 h-4 text-gray-400" />
            {t('upload', 'bathrooms')}
          </label>
          <input
            type="number"
            id="bathrooms"
            name="bathrooms"
            min="0"
            step="0.5"
            value={formData.bathrooms}
            onChange={onChange}
            placeholder={t("upload", "bathroomsPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
