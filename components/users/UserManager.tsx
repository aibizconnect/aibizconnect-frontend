"use client";

import { useEffect, useState } from "react";

interface TenantUser {
  id: string;
  user_id: string;
  role: string;
  status?: string;
}

type Role = "admin" | "member" | "viewer";

const ROLES: Role[] = ["admin", "member", "viewer"];

export default function UserManager({ tenantId }: { tenantId: string }) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [invite, setInvite] = useState({ invitee_user_id: "", role: "member" as Role });
  const [inviting, setInviting] = useState(false);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/users`);
      if (res.ok) setUsers(await res.json());
    } catch {
      setError("Failed to load users.");
    }
  }

  useEffect(() => { load(); }, [tenantId]);

  async function inviteUser() {
    if (!invite.invitee_user_id.trim()) { setError("User ID is required."); return; }
    setError(null);
    setInviting(true);
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invite)
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setInvite({ invitee_user_id: "", role: "member" });
      await load();
    } catch (err: any) {
      setError(err.message ?? "Invite failed.");
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(id: string, role: Role) {
    setChangingRoleId(id);
    try {
      await fetch(`/agent/tenants/${tenantId}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      await load();
    } catch {
      setError("Role update failed.");
    } finally {
      setChangingRoleId(null);
    }
  }

  async function removeUser(id: string) {
    setRemovingId(id);
    try {
      await fetch(`/agent/tenants/${tenantId}/users/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Remove failed.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      {/* Invite form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <input
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. user_abc123"
            value={invite.invitee_user_id}
            onChange={e => setInvite(i => ({ ...i, invitee_user_id: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={invite.role}
            onChange={e => setInvite(i => ({ ...i, role: e.target.value as Role }))}
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={inviteUser}
          disabled={inviting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {inviting ? "Inviting..." : "Invite User"}
        </button>
      </div>

      {/* User list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Existing Users
          {users.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({users.length})</span>
          )}
        </h2>

        {users.length === 0 && (
          <p className="text-sm text-gray-400">No users found.</p>
        )}

        <ul className="space-y-3">
          {users.map(u => (
            <li key={u.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="space-y-0.5">
                  <p className="font-mono text-sm text-gray-900">{u.user_id}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {u.role}
                    </span>
                    {u.status && (
                      <span className="text-xs text-gray-400">{u.status}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeUser(u.id)}
                  disabled={removingId === u.id}
                  className="shrink-0 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  {removingId === u.id ? "Removing..." : "Remove"}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {ROLES.map(role => (
                  <button
                    key={role}
                    onClick={() => changeRole(u.id, role)}
                    disabled={changingRoleId === u.id || u.role === role}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors disabled:opacity-40 ${
                      u.role === role
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {changingRoleId === u.id ? "..." : `Make ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
