import { createFileRoute, Link } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { cases } from "@/lib/mockData";
import { StatusPill, PriorityPill } from "./index";

export const Route = createFileRoute("/verification/")({ component: VerificationList });

function VerificationList() {
  const queue = cases.filter((c) => c.status === "pending" || c.status === "in_review");
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1500px] mx-auto">
        <div className="ribbon-label">Module · Human Verification</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Verification Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Review AI-extracted fields against the source judgment. Approve, edit or reject
          individual fields. Click any extracted value to auto-scroll to its exact source line
          in the PDF.
        </p>

        <div className="official-card mt-6">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Case No.</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Avg. Confidence</th>
                <th className="px-3 py-2.5">Uploaded</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((c) => {
                const conf = (c.fields.reduce((a, f) => a + f.confidence, 0) / c.fields.length) * 100;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-[var(--sandal)]/40">
                    <td className="px-5 py-3 font-mono text-xs text-[var(--gov-blue)]">{c.caseNumber}</td>
                    <td className="px-3 py-3">{c.department}</td>
                    <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                    <td className="px-3 py-3"><PriorityPill priority={c.priority} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-muted rounded">
                          <div className="h-1.5 rounded bg-success" style={{ width: `${conf}%` }} />
                        </div>
                        <span className="text-xs">{conf.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{c.uploadedAt}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/verification/$caseId"
                        params={{ caseId: c.id }}
                        className="bg-[var(--gov-blue)] text-white text-xs font-semibold px-3 h-8 rounded inline-flex items-center"
                      >
                        Open Workspace
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </GovLayout>
  );
}
