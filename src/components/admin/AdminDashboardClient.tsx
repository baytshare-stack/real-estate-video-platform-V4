"use client";

import * as React from "react";
import Link from "next/link";
import AnalyticsCards, { type DashboardMetrics } from "@/components/admin/AnalyticsCards";
import UserTable, { type UserTableRow } from "@/components/admin/UserTable";
import VideoTable, { type AdminVideoRow } from "@/components/admin/VideoTable";
import CRMPanel from "@/components/admin/CRMPanel";
import ReportedContentPanel, { type AdminReportRow } from "@/components/admin/ReportedContentPanel";

type CrmPanelRecord = {
  id: string;
  name: string;
  email: string;
  role: "user" | "agent" | "agency";
  createdAt: string;
  status: "lead" | "active" | "inactive";
  notes: string;
};

function mapUserRow(u: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  isBlocked: boolean;
}): UserTableRow {
  const roleLower = u.role.toLowerCase();
  const role: UserTableRow["role"] =
    roleLower === "agent"
      ? "agent"
      : roleLower === "agency"
        ? "agency"
        : roleLower === "admin" || roleLower === "super_admin"
          ? "admin"
          : "user";
  return {
    id: u.id,
    name: u.fullName || u.email,
    email: u.email,
    role,
    createdAt: u.createdAt,
    status: u.isBlocked ? "blocked" : "active",
  };
}

function mapVideoRow(v: {
  id: string;
  title: string;
  thumbnail: string | null;
  viewsCount: number;
  likesCount: number;
  isShort: boolean;
  moderationStatus: string;
  createdAt: string;
  channelName: string;
}): AdminVideoRow {
  const mod = v.moderationStatus as AdminVideoRow["moderationStatus"];
  return {
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    viewsCount: v.viewsCount,
    likesCount: v.likesCount,
    isShort: v.isShort,
    moderationStatus: mod === "APPROVED" || mod === "REJECTED" || mod === "PENDING" ? mod : "PENDING",
    createdAt: v.createdAt,
    channelName: v.channelName,
  };
}

function mapCrmUser(u: {
  id: string;
  fullName: string;
  email: string;
  role: "USER" | "AGENT" | "AGENCY";
  createdAt: string;
  crmStatus: "LEAD" | "ACTIVE" | "INACTIVE";
  crmNotes: string | null;
}): CrmPanelRecord {
  const roleMap = { USER: "user", AGENT: "agent", AGENCY: "agency" } as const;
  const statusMap = { LEAD: "lead", ACTIVE: "active", INACTIVE: "inactive" } as const;
  return {
    id: u.id,
    name: u.fullName || u.email,
    email: u.email,
    role: roleMap[u.role],
    createdAt: u.createdAt,
    status: statusMap[u.crmStatus],
    notes: u.crmNotes ?? "",
  };
}

export default function AdminDashboardClient() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [users, setUsers] = React.useState<UserTableRow[]>([]);
  const [videos, setVideos] = React.useState<AdminVideoRow[]>([]);
  const [crmRecords, setCrmRecords] = React.useState<CrmPanelRecord[]>([]);
  const [reports, setReports] = React.useState<AdminReportRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        metricsRes,
        usersRes,
        videosRes,
        crmUserRes,
        crmAgentRes,
        crmAgencyRes,
        reportsRes,
      ] = await Promise.all([
        fetch("/api/admin/dashboard-metrics", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/videos", { cache: "no-store" }),
        fetch("/api/admin/crm?role=USER", { cache: "no-store" }),
        fetch("/api/admin/crm?role=AGENT", { cache: "no-store" }),
        fetch("/api/admin/crm?role=AGENCY", { cache: "no-store" }),
        fetch("/api/admin/reports", { cache: "no-store" }),
      ]);

      const metricsJson = (await metricsRes.json()) as DashboardMetrics & { error?: string };
      if (!metricsRes.ok) throw new Error(metricsJson.error || "Failed to load metrics.");
      setMetrics(metricsJson);

      const usersJson = (await usersRes.json()) as {
        users?: Array<{
          id: string;
          fullName: string;
          email: string;
          role: string;
          createdAt: string;
          isBlocked: boolean;
        }>;
        error?: string;
      };
      if (!usersRes.ok) throw new Error(usersJson.error || "Failed to load users.");
      const rawUsers = usersJson.users ?? [];
      setUsers(rawUsers.slice(0, 80).map(mapUserRow));

      const videosJson = (await videosRes.json()) as { videos?: Parameters<typeof mapVideoRow>[0][] };
      if (!videosRes.ok) throw new Error((videosJson as { error?: string }).error || "Failed to load videos.");
      setVideos((videosJson.videos ?? []).slice(0, 80).map(mapVideoRow));

      const parseCrm = async (res: Response) => {
        const j = (await res.json()) as { users?: Parameters<typeof mapCrmUser>[0][]; error?: string };
        if (!res.ok) throw new Error(j.error || "CRM failed");
        return (j.users ?? []).slice(0, 40).map(mapCrmUser);
      };
      const crmU = await parseCrm(crmUserRes);
      const crmA = await parseCrm(crmAgentRes);
      const crmG = await parseCrm(crmAgencyRes);
      setCrmRecords([...crmU, ...crmA, ...crmG]);

      const reportsJson = (await reportsRes.json()) as { reports?: AdminReportRow[]; error?: string };
      if (!reportsRes.ok) throw new Error(reportsJson.error || "Failed to load reports.");
      setReports((reportsJson.reports ?? []).slice(0, 50));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onToggleUserStatus = async (userId: string, nextStatus: UserTableRow["status"]) => {
    const isBlocked = nextStatus === "blocked";
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Update failed.");
  };

  const onDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Delete failed.");
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const onDeleteVideo = async (videoId: string) => {
    const res = await fetch(`/api/admin/videos/${videoId}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Delete failed.");
  };

  const onModeration = async (videoId: string, moderationStatus: AdminVideoRow["moderationStatus"]) => {
    const res = await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moderationStatus }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Update failed.");
  };

  const onSaveVideoTitle = async (videoId: string, title: string) => {
    const res = await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Save failed.");
  };

  const onCrmSave = async (recordId: string, next: { status: "lead" | "active" | "inactive"; notes: string }) => {
    const crmStatus = next.status === "lead" ? "LEAD" : next.status === "active" ? "ACTIVE" : "INACTIVE";
    const res = await fetch(`/api/admin/crm/users/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crmStatus, crmNotes: next.notes }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "CRM save failed.");
  };

  const onReportStatus = async (reportId: string, status: "REVIEWED" | "DISMISSED") => {
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok) throw new Error(data.error || "Update failed.");
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-white/60">
            Live metrics, moderation, CRM, and reports — synced from the database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/settings/listing-catalog"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
          >
            Listing catalog
          </Link>
          <Link
            href="/admin/settings/appearance"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25"
          >
            Site look & theme
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-3 underline underline-offset-2 hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : null}

      <AnalyticsCards metrics={metrics} loading={loading} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <UserTable
          users={users}
          onToggleStatus={onToggleUserStatus}
          onDeleteUser={onDeleteUser}
        />
        <VideoTable
          videos={videos}
          onDelete={onDeleteVideo}
          onApprove={(id) => onModeration(id, "APPROVED")}
          onReject={(id) => onModeration(id, "REJECTED")}
          onSaveTitle={onSaveVideoTitle}
        />
      </div>

      <ReportedContentPanel reports={reports} onStatusChange={onReportStatus} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CRMPanel records={crmRecords} onSave={onCrmSave} />
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-sm">
          <h2 className="text-white font-semibold">Smart ads</h2>
          <p className="mt-1 text-sm text-white/60">
            Targeted inventory, scoring, CTR, and watch-page delivery (pre-roll, mid-roll, overlay).
          </p>
          <Link
            href="/admin/ads"
            className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Open ads management
          </Link>
        </div>
      </div>
    </div>
  );
}
