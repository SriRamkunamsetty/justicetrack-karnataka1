import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { auditEvents } from "@/lib/mockData";
import { ShieldCheck, Download } from "lucide-react";

export const Route = createFileRoute("/audit")({ component: Audit });

function Audit() {
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <div className="ribbon-label">Module · Audit & Accountability</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Tamper-evident chain of every action performed by AI and human officers, retained
          for 7 years per Karnataka State e-Records Retention Policy.
        </p>

        <div className="flex items-center justify-between mt-5">
          <div className="flex items-center gap-2 text-xs text-success">
            <ShieldCheck className="h-4 w-4" />
            Hash-chained · Last verified 09:42 IST · No tampering detected
          </div>
          <button className="text-xs font-semibold border border-border rounded h-8 px-3 inline-flex items-center gap-1">
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>

        <div className="official-card mt-3">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Timestamp (IST)</th>
                <th className="px-3 py-2.5">Actor</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Action</th>
                <th className="px-3 py-2.5">Case Reference</th>
                <th className="px-5 py-2.5">Hash</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((e, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-3 font-mono text-xs">{e.ts}</td>
                  <td className="px-3 py-3">{e.actor}</td>
                  <td className="px-3 py-3 text-muted-foreground">{e.role}</td>
                  <td className="px-3 py-3">{e.action}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[var(--gov-blue)]">{e.caseRef}</td>
                  <td className="px-5 py-3 font-mono text-[10px] text-muted-foreground">
                    0x{(0xa3f29c + i * 13).toString(16)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </GovLayout>
  );
}
