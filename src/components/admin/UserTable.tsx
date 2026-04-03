"use client";

import * as React from "react";

type UserRole = "user" | "agent" | "agency" | "admin";
type UserStatus = "active" | "blocked";

export type UserTableRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  status: UserStatus;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

const MOCK_USERS: UserTableRow[] = [
  {
    id: "u_1",
    name: "Maged Elwan",
    email: "maged@example.com",
    role: "agent",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    status: "active",
  },
  {
    id: "u_2",
    name: "Bayt Share",
    email: "baytshare@example.com",
    role: "agency",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString(),
    status: "active",
  },
  {
    id: "u_3",
    name: "Demo Admin",
    email: "admin@example.com",
    role: "admin",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 55).toISOString(),
    status: "active",
  },
  {
    id: "u_4",
    name: "John Doe",
    email: "john@example.com",
    role: "user",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    status: "blocked",
  },
];

export default function UserTable({
  users,
  onToggleStatus,
  onDeleteUser,
}: {
  users?: UserTableRow[];
  onToggleStatus?: (userId: string, nextStatus: UserStatus) => Promise<void> | void;
  onDeleteUser?: (userId: string) => Promise<void> | void;
}) {
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState<"" | UserRole>("");
  const [rows, setRows] = React.useState<UserTableRow[]>(users ?? MOCK_USERS);
  const [busyId, setBusyId] = React.useState<string>("");

  React.useEffect(() => {
    setRows(users ?? MOCK_USERS);
  }, [users]);

  const filtered = rows.filter((u) => {
    const matchesQ = q.trim()
      ? u.name.toLowerCase().includes(q.trim().toLowerCase()) ||
        u.email.toLowerCase().includes(q.trim().toLowerCase())
      : true;
    const matchesRole = role ? u.role === role : true;
    return matchesQ && matchesRole;
  });

  const toggle = async (u: UserTableRow) => {
    const nextStatus: UserStatus = u.status === "active" ? "blocked" : "active";
    setBusyId(u.id);
    setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: nextStatus } : x)));
    try {
      await onToggleStatus?.(u.id, nextStatus);
    } catch {
      setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)));
    } finally {
      setBusyId("");
    }
  };

  const removeUser = async (u: UserTableRow) => {
    if (u.role === "admin") {
      window.alert("Admin accounts cannot be deleted from the dashboard.");
      return;
    }
    const ok = window.confirm(`Permanently delete user "${u.name}"? This cannot be undone.`);
    if (!ok) return;
    setBusyId(u.id);
    const prev = rows;
    setRows((p) => p.filter((x) => x.id !== u.id));
    try {
      await onDeleteUser?.(u.id);
    } catch {
      setRows(prev);
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-semibold">Users</h2>
          <p className="text-sm text-white/60 mt-1">Search, filter, and manage user status.</p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="agent">Agent</option>
            <option value="agency">Agency</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-white/60" colSpan={6}>
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="text-white/80 align-top">
                  <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-4 py-3 text-white/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60 tabular-nums">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        u.status === "active"
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          : "border-amber-400/20 bg-amber-500/10 text-amber-200",
                      ].join(" ")}
                    >
                      {u.status === "active" ? "Active" : "Blocked"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => void toggle(u)}
                        className={[
                          "rounded-xl border px-3 py-2 text-xs font-medium transition",
                          u.status === "active"
                            ? "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                            : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
                          busyId === u.id ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {u.status === "active" ? "Block" : "Unblock"}
                      </button>
                      {onDeleteUser ? (
                        <button
                          type="button"
                          disabled={busyId === u.id || u.role === "admin"}
                          onClick={() => void removeUser(u)}
                          className={[
                            "rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15",
                            busyId === u.id || u.role === "admin" ? "opacity-50 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
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

