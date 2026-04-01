"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface DeleteConfirmModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({ title, onCancel, onConfirm, loading }: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t("dashboardVideos", "deleteModalTitle")}</h2>
            <p className="text-sm text-gray-400">{t("dashboardVideos", "deleteModalBody")}</p>
          </div>
        </div>

        <div className="bg-gray-800/60 rounded-xl px-4 py-3 mb-6 border border-white/[0.06]">
          <p className="text-gray-300 text-sm line-clamp-2 font-medium">"{title}"</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-colors"
          >
            {t("common", "cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{" "}
                {t("dashboardVideos", "deleting")}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> {t("dashboardVideos", "deleteModalConfirm")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
