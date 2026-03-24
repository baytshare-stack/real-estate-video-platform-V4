"use client";

import * as React from "react";

type Role = "USER" | "AGENT" | "AGENCY" | "ADMIN";

type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
  isBlocked: boolean;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdminUsersPage() {
  const [rows, setRows] = React.useState<AdminUserRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState<"" | Role>("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (role) params.set("role", role);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { users?: AdminUserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load users.");
      setRows(data.users || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [role, search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onToggleBlock = async (userId: string, nextBlocked: boolean) => {
    setRows((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBlocked: nextBlocked } : u))
    );

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: nextBlocked }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update user.");
    } catch (e: any) {
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBlocked: !nextBlocked } : u))
      );
      setError(e?.message || "Failed to update user.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="mt-1 text-sm text-white/60">
            Search, filter, and block/unblock users.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-2">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email…"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">All</option>
            <option value="USER">User</option>
            <option value="AGENT">Agent</option>
            <option value="AGENCY">Agency</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-white/60" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr key={u.id} className="text-white/80">
                    <td className="px-4 py-3 font-medium text-white">{u.fullName}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.isBlocked ? (
                        <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void onToggleBlock(u.id, !u.isBlocked)}
                        className={[
                          "inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition",
                          u.isBlocked
                            ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                            : "border border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
                        ].join(" ")}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

