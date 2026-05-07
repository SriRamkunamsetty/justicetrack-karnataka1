import { createFileRoute, Link } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { cases, departments } from "@/lib/mockData";
import { StatusPill, PriorityPill } from "./index";
import { useState } from "react";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/cases/")({ component: Cases });

function Cases() {
  const [dept, setDept] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const filtered = cases.filter(
    (c) => (dept === "all" || c.department === dept) && (status === "all" || c.status === status),
  );

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1500px] mx-auto">
        <div className="ribbon-label">Module · Case Repository</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Case Repository
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Master register of all judgments ingested into JusticeTrack.
        </p>

        <div className="official-card mt-5 p-3 flex flex-wrap items-center gap-3 text-sm">
          <Filter className="h-4 w-4 text-muted-foreground ml-1" />
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="border border-input bg-card rounded h-9 px-2 text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-input bg-card rounded h-9 px-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Verification</option>
            <option value="in_review">In Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">
            Showing {filtered.length} of {cases.length} cases
          </span>
        </div>

        <div className="official-card mt-4">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2.5">Case No.</th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Order Date</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-5 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-[var(--sandal)]/40">
                  <td className="px-5 py-3 font-mono text-xs text-[var(--gov-blue)]">{c.caseNumber}</td>
                  <td className="px-3 py-3 max-w-xs truncate">{c.title}</td>
                  <td className="px-3 py-3">{c.department}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.orderDate}</td>
                  <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3"><PriorityPill priority={c.priority} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/cases/$caseId"
                      params={{ caseId: c.id }}
                      className="text-[var(--gov-blue)] text-xs font-semibold hover:underline"
                    >
                      View →
                    </Link>
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
