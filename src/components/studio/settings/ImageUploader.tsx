"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/i18n/LanguageProvider";

type ImageUploaderProps = {
  label: string;
  helpText?: string;
  buttonText: string;
  currentUrl?: string | null;
  accept?: string;
  resetSignal?: string | number;
  onFileChange?: (file: File | null) => void;
};

export default function ImageUploader({
  label,
  helpText,
  buttonText,
  currentUrl,
  accept = "image/*",
  resetSignal,
  onFileChange,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Reset local state after successful save (or when parent clears).
    setFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    onFileChange?.(null);
  }, [resetSignal]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const activePreview = useMemo(() => previewUrl ?? currentUrl ?? null, [previewUrl, currentUrl]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-white text-sm font-medium mb-0.5">{label}</p>
        {helpText && <p className="text-gray-500 text-xs">{helpText}</p>}
      </div>

      <div className="flex items-center gap-5 p-4 border border-dashed border-white/10 rounded-xl hover:border-white/20 transition-colors">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          {activePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activePreview} alt={label} className="w-full h-full object-cover" />
          ) : (
            <span className="opacity-90">IMG</span>
          )}
        </div>

        <div className="flex-1">
          <input
            id={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0] ?? null;
              if (!selected) {
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                onFileChange?.(null);
                return;
              }
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              const nextPreview = URL.createObjectURL(selected);
              setFile(selected);
              setPreviewUrl(nextPreview);
              onFileChange?.(selected);
            }}
          />

          <div className="flex items-center gap-3">
            <label
              htmlFor={`file-${label.replace(/\s+/g, "-").toLowerCase()}`}
              className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {buttonText}
            </label>

            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  onFileChange?.(null);
                }}
                className="text-gray-400 hover:text-white text-xs font-semibold transition-colors"
              >
                {t("imageUploader", "remove")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

