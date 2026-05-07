import { createFileRoute, redirect } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, AppRole } from "@/lib/auth";
import { ROLE_SCOPE } from "@/lib/karnataka";
import { toast } from "sonner";

export const Route = createFileRoute("/users")({
  component: UsersPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
});

interface OfficerRow {
  id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  department: string | null;
  district: string | null;
  roles: AppRole[];
}

const ALL_ROLES: AppRole[] = [
  "super_admin",
  "legal_officer",
  "reviewing_officer",
  "department_admin",
  "viewer",
];

function UsersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("super_admin");
  const [rows, setRows] = useState<OfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: ur }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, designation, department, district"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byId = new Map<string, AppRole[]>();
    (ur ?? []).forEach((r: any) => {
      const arr = byId.get(r.user_id) ?? [];
      arr.push(r.role);
      byId.set(r.user_id, arr);
    });
    setRows(
      ((profiles ?? []) as any[]).map((p) => ({
        ...p,
        roles: byId.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setUserRole = async (userId: string, role: AppRole) => {
    setSavingId(userId);
    try {
      // Replace roles: simple model — one role per officer (additional roles can be added later)
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      toast.success(`Role updated to ${ROLE_LABEL[role]}`);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <div className="ribbon-label">Module · Identity & Access</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Users & Role-Based Access
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Karnataka State officer directory. Privileged role assignments are restricted to
          Super Admins and audit-logged. Officers are scoped to their department and district.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 official-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-[var(--gov-blue-deep)]">
                Registered Officers
              </h2>
              <span className="text-xs text-muted-foreground">{rows.length} on roster</span>
            </div>
            {loading ? (
              <div className="p-10 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading officer directory…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2.5">Officer</th>
                      <th className="px-3 py-2.5">Department</th>
                      <th className="px-3 py-2.5">District</th>
                      <th className="px-3 py-2.5">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                          No officers registered yet.
                        </td>
                      </tr>
                    )}
                    {rows.map((u) => {
                      const current = u.roles[0] ?? "viewer";
                      return (
                        <tr key={u.id} className="border-t border-border align-top">
                          <td className="px-5 py-3">
                            <div className="font-medium">{u.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                            {u.designation && (
                              <div className="text-[11px] text-muted-foreground italic mt-0.5">
                                {u.designation}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">
                            {u.department || "Unassigned"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground text-xs">
                            {u.district || "—"}
                          </td>
                          <td className="px-3 py-3">
                            {isAdmin ? (
                              <select
                                disabled={savingId === u.id}
                                value={current}
                                onChange={(e) => setUserRole(u.id, e.target.value as AppRole)}
                                className="h-8 text-xs border border-border rounded bg-background px-2"
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_LABEL[r]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] font-semibold border rounded px-2 py-0.5 bg-[var(--gov-blue)]/10 text-[var(--gov-blue-deep)] border-[var(--gov-blue)]/20">
                                {ROLE_LABEL[current]}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!isAdmin && (
              <div className="px-5 py-3 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
                Read-only view. Only Super Admins may modify role assignments.
              </div>
            )}
          </div>

          <div className="official-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-[var(--gov-blue)]" />
              <h3 className="font-serif text-base font-semibold">Role Matrix</h3>
            </div>
            <ul className="space-y-3 text-sm">
              {ALL_ROLES.map((r) => {
                const s = ROLE_SCOPE[r];
                return (
                  <li key={r} className="border-b border-border pb-2 last:border-0">
                    <div className="font-semibold">{ROLE_LABEL[r]}</div>
                    <div className="text-xs text-muted-foreground">{s.scope}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] uppercase tracking-wider">
                      {s.canVerify && <span className="bg-[var(--gov-blue)]/10 text-[var(--gov-blue)] px-1.5 py-0.5 rounded">Verify</span>}
                      {s.canPublish && <span className="bg-success/10 text-success px-1.5 py-0.5 rounded">Publish</span>}
                      {s.canManage && <span className="bg-[var(--warning)]/10 text-[var(--warning)] px-1.5 py-0.5 rounded">Manage</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}
