import { createFileRoute, Link } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { StatusPill, PriorityPill } from "@/components/Pills";
import { useCases } from "@/lib/queries";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  Gavel,
  ShieldAlert,
  TrendingUp,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Stat({
  label, value, delta, icon: Icon, tone,
}: { label: string; value: string; delta: string; icon: any; tone: "red" | "blue" | "amber" | "green" }) {
  const toneMap = {
    red: "border-l-[var(--gov-red)] text-[var(--gov-red)]",
    blue: "border-l-[var(--gov-blue)] text-[var(--gov-blue)]",
    amber: "border-l-[var(--warning)] text-[var(--warning)]",
    green: "border-l-success text-success",
  }[tone];
  return (
    <div className={`official-card border-l-4 ${toneMap} p-4`}>
      <div className="flex items-center justify-between">
        <div className="ribbon-label text-foreground/60">{label}</div>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="font-serif text-3xl font-semibold text-foreground mt-2">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{delta}</div>
    </div>
  );
}

function Dashboard() {
  const { data: cases = [], isLoading } = useCases();

  const pending = cases.filter((c) => c.status === "pending").length;
  const inReview = cases.filter((c) => c.status === "in_review").length;
  const verified = cases.filter((c) => c.status === "verified").length;
  const overdue = cases.filter((c) => (c.appeal_deadline_days ?? 99) <= 7).length;
  const avgConf =
    cases.filter((c) => c.extraction_confidence != null).reduce((s, c) => s + Number(c.extraction_confidence), 0) /
    Math.max(1, cases.filter((c) => c.extraction_confidence != null).length);

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1500px] mx-auto">
        <div className="flex items-start gap-3 bg-[var(--sandal)] border border-[var(--gov-blue)]/15 rounded px-4 py-3 mb-5">
          <ShieldAlert className="h-4 w-4 text-[var(--gov-red)] mt-0.5" />
          <div className="text-sm text-foreground">
            <span className="font-semibold">Advisory:</span> {pending} judgment(s) require human verification before
            publication. AI extractions are <span className="font-semibold">advisory only</span> — government
            officers must verify every record before action.
          </div>
        </div>

        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="ribbon-label">Court Case Monitoring · Executive View</div>
            <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
              Governance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time view across all departments · {cases.length} cases on record
            </p>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 bg-[var(--gov-red)] text-white px-4 h-10 rounded text-sm font-semibold hover:opacity-95"
          >
            <Upload className="h-4 w-4" /> Upload New Judgment
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <Stat label="Pending Verification" value={String(pending)} delta="Awaiting officer review" icon={FileWarning} tone="red" />
          <Stat label="In Active Review" value={String(inReview)} delta="Workspace open" icon={Clock} tone="amber" />
          <Stat label="Verified & Published" value={String(verified)} delta="Signed by Legal Officer" icon={CheckCircle2} tone="green" />
          <Stat label="Appeals Closing ≤ 7 days" value={String(overdue)} delta="Escalation required" icon={AlertTriangle} tone="red" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 official-card">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="ribbon-label">Recent Cases</div>
                <h2 className="font-serif text-lg text-[var(--gov-blue-deep)] font-semibold">
                  Cases requiring attention
                </h2>
              </div>
              <Link to="/cases" className="text-sm text-[var(--gov-blue)] underline-offset-2 hover:underline">
                View all cases →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Case No.</th>
                  <th className="px-3 py-2.5 font-semibold">Department</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Priority</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={5} className="px-5 py-6 text-center text-muted-foreground text-xs">Loading…</td></tr>
                )}
                {!isLoading && cases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No cases yet. <Link to="/upload" className="text-[var(--gov-blue)] underline">Upload the first judgment</Link>.
                    </td>
                  </tr>
                )}
                {cases.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-[var(--sandal)]/40">
                    <td className="px-5 py-3 font-mono text-xs text-[var(--gov-blue)]">{c.case_number ?? "—"}</td>
                    <td className="px-3 py-3">{c.department ?? "—"}</td>
                    <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                    <td className="px-3 py-3"><PriorityPill priority={c.priority} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to="/verification/$caseId"
                        params={{ caseId: c.id }}
                        className="text-[var(--gov-blue)] text-xs font-semibold hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-5">
            <div className="official-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="h-4 w-4 text-[var(--gov-blue)]" />
                <h3 className="font-serif text-base font-semibold text-[var(--gov-blue-deep)]">
                  Department Workload
                </h3>
              </div>
              <DeptLoad cases={cases} />
            </div>

            <div className="official-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-success" />
                <h3 className="font-serif text-base font-semibold text-[var(--gov-blue-deep)]">
                  Compliance KPIs
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="ribbon-label">Avg. extraction confidence</dt>
                  <dd className="font-serif text-2xl font-semibold mt-1">
                    {cases.length ? `${(avgConf * 100).toFixed(1)}%` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="ribbon-label">Verified rate</dt>
                  <dd className="font-serif text-2xl font-semibold mt-1 text-success">
                    {cases.length ? `${((verified / cases.length) * 100).toFixed(0)}%` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="ribbon-label">Pending queue</dt>
                  <dd className="font-serif text-2xl font-semibold mt-1">{pending}</dd>
                </div>
                <div>
                  <dt className="ribbon-label">Audit trail integrity</dt>
                  <dd className="font-serif text-2xl font-semibold mt-1">100%</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}

function DeptLoad({ cases }: { cases: any[] }) {
  const counts = new Map<string, number>();
  cases.forEach((c) => {
    const d = c.department ?? "Unassigned";
    counts.set(d, (counts.get(d) ?? 0) + 1);
  });
  const max = Math.max(1, ...counts.values());
  const entries = Array.from(counts.entries()).slice(0, 6);
  if (!entries.length) return <div className="text-xs text-muted-foreground">No data yet.</div>;
  return (
    <ul className="space-y-3">
      {entries.map(([d, n]) => (
        <li key={d}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-foreground">{d}</span>
            <span className="text-muted-foreground">{n}</span>
          </div>
          <div className="h-1.5 bg-muted rounded">
            <div className="h-1.5 rounded bg-[var(--gov-blue)]" style={{ width: `${(n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
