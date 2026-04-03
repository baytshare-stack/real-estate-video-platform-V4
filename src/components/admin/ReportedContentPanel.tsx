"use client";

import * as React from "react";

export type AdminReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; email: string; fullName: string } | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function ReportedContentPanel({
  reports,
  onStatusChange,
}: {
  reports: AdminReportRow[];
  onStatusChange?: (reportId: string, status: "REVIEWED" | "DISMISSED") => Promise<void> | void;
}) {
  const [busyId, setBusyId] = React.useState<string>("");

  const setStatus = async (id: string, status: "REVIEWED" | "DISMISSED") => {
    setBusyId(id);
    try {
      await onStatusChange?.(id, status);
    } finally {
      setBusyId("");
    }
  };

  const pending = reports.filter((r) => r.status === "PENDING");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-semibold">Reported content</h2>
          <p className="text-sm text-white/60 mt-1">
            {pending.length} pending {pending.length === 1 ? "report" : "reports"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Reporter</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {reports.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-white/60" colSpan={6}>
                  No reports yet.
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="text-white/80 align-top">
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                      {r.targetType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/60 break-all">{r.targetId}</td>
                  <td className="px-4 py-3 text-white/70">
                    {r.reporter ? (
                      <span className="line-clamp-2">{r.reporter.fullName || r.reporter.email}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/60 line-clamp-2 max-w-[220px]">{r.reason || "—"}</td>
                  <td className="px-4 py-3 text-white/50 tabular-nums">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "PENDING" ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void setStatus(r.id, "REVIEWED")}
                          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-50"
                        >
                          Reviewed
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void setStatus(r.id, "DISMISSED")}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-white/50">{r.status}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
