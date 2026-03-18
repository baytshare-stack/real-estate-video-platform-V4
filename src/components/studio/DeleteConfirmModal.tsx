"use client";

import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function DeleteConfirmModal({ title, onCancel, onConfirm, loading }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-4 mb-5">
          <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Delete Video?</h2>
            <p className="text-gray-400 text-sm">This action cannot be undone.</p>
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
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Delete Video</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
