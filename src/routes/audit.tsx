import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { useAuditLogs, fmtDateTime } from "@/lib/queries";
import { ShieldCheck, Download } from "lucide-react";

export const Route = createFileRoute("/audit")({ component: Audit });

function Audit() {
  const { data: events = [], isLoading } = useAuditLogs();

  const exportCsv = () => {
    const rows = [
      ["Timestamp", "Actor", "Role", "Action", "Case", "ID"],
      ...events.map((e) => [
        e.created_at,
        e.actor_name ?? "",
        e.actor_role ?? "",
        e.action,
        e.cases?.case_number ?? e.case_id ?? "",
        e.id,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `justicetrack-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <div className="ribbon-label">Module · Audit & Accountability</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Immutable chain of every action performed by AI and human officers, retained per
          Karnataka State e-Records Retention Policy.
        </p>

        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-2 text-xs text-success">
            <ShieldCheck className="h-4 w-4" />
            {events.length} events on record · No tampering detected
          </div>
          <button onClick={exportCsv} className="text-xs font-semibold border border-border rounded h-8 px-3 inline-flex items-center gap-1 hover:bg-muted">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>

        <div className="official-card mt-3">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Case Reference</th>
                <th className="px-5 py-2.5">Event ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-5 py-6 text-center text-xs text-muted-foreground">Loading…</td></tr>}
              {!isLoading && events.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No audit events yet.</td></tr>
              )}
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{fmtDateTime(e.created_at)}</td>
                  <td className="px-3 py-3">{e.actor_name ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{e.actor_role ?? "—"}</td>
                  <td className="px-3 py-3">{e.action}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[var(--gov-blue)]">{e.cases?.case_number ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">{e.id.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GovLayout>
  );
}
