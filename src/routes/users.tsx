import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/users")({ component: Users });

const roster = [
  { name: "Sri. Mahesh Gowda", role: "Legal Officer", dept: "Revenue Department", status: "Active", last: "Today, 09:18" },
  { name: "Smt. Anitha R.", role: "Section Officer", dept: "Revenue Department", status: "Active", last: "Today, 08:42" },
  { name: "Dr. Lakshmi N.", role: "Department Admin", dept: "Health & Family Welfare", status: "Active", last: "Yesterday" },
  { name: "Sri. Vinod Patil", role: "Reviewing Officer", dept: "Urban Development", status: "Active", last: "Today, 10:01" },
  { name: "Smt. Pavithra K.", role: "Read-only Viewer", dept: "Education Department", status: "Active", last: "2 days ago" },
  { name: "Sri. Harish Bhat", role: "Super Admin", dept: "DPAR (e-Gov)", status: "Active", last: "Today, 09:30" },
];

const roles = [
  { role: "Super Admin", scope: "All departments", canVerify: true, canPublish: true, canManage: true },
  { role: "Legal Officer", scope: "Assigned department", canVerify: true, canPublish: true, canManage: false },
  { role: "Reviewing Officer", scope: "Assigned cases", canVerify: true, canPublish: false, canManage: false },
  { role: "Department Admin", scope: "Own department", canVerify: false, canPublish: false, canManage: true },
  { role: "Read-only Viewer", scope: "Read only", canVerify: false, canPublish: false, canManage: false },
];

function Users() {
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <div className="ribbon-label">Module · Identity & Access</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Users & Role-Based Access
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Federated with Karnataka State Single Sign-On (SSO) and e-Office directory.
          Privileged actions require digital signature certificate (DSC).
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 official-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-[var(--gov-blue-deep)]">
                Active Officers
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Officer</th>
                  <th className="px-3 py-2.5">Role</th>
                  <th className="px-3 py-2.5">Department</th>
                  <th className="px-3 py-2.5">Last Active</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((u) => (
                  <tr key={u.name} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">{u.name}</td>
                    <td className="px-3 py-3">{u.role}</td>
                    <td className="px-3 py-3 text-muted-foreground">{u.dept}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{u.last}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-semibold border rounded px-2 py-0.5 bg-success/10 text-success border-success/30">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="official-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-[var(--gov-blue)]" />
              <h3 className="font-serif text-base font-semibold">Role Matrix</h3>
            </div>
            <ul className="space-y-3 text-sm">
              {roles.map((r) => (
                <li key={r.role} className="border-b border-border pb-2 last:border-0">
                  <div className="font-semibold">{r.role}</div>
                  <div className="text-xs text-muted-foreground">{r.scope}</div>
                  <div className="flex gap-2 mt-1 text-[10px] uppercase tracking-wider">
                    {r.canVerify && <span className="bg-[var(--gov-blue)]/10 text-[var(--gov-blue)] px-1.5 py-0.5 rounded">Verify</span>}
                    {r.canPublish && <span className="bg-success/10 text-success px-1.5 py-0.5 rounded">Publish</span>}
                    {r.canManage && <span className="bg-[var(--warning)]/10 text-[var(--warning)] px-1.5 py-0.5 rounded">Manage</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}
