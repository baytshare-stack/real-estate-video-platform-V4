"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminVideoEditMockPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || "";

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    // Mock UI: prefill with placeholders; real edit will fetch video data later.
    setTitle("");
    setDescription("");
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Edit Video (Mock)</h1>
          <p className="mt-1 text-sm text-white/60">
            Video ID: <span className="font-mono text-white/70">{id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Back
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="(mock) Edit title…"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="(mock) Edit description…"
              rows={6}
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40 resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled
              className="rounded-xl bg-indigo-600/40 px-4 py-2 text-sm font-medium text-white/70 cursor-not-allowed"
              title="Mock UI only"
            >
              Save (disabled)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

