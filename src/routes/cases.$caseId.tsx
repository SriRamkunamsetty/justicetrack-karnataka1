import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { cases, auditEvents } from "@/lib/mockData";
import { StatusPill, PriorityPill } from "./index";
import { ArrowLeft, ShieldCheck, FileText } from "lucide-react";

export const Route = createFileRoute("/cases/$caseId")({
  component: CaseDetail,
  loader: ({ params }) => {
    const c = cases.find((x) => x.id === params.caseId);
    if (!c) throw notFound();
    return c;
  },
  notFoundComponent: () => (
    <GovLayout>
      <div className="p-10">Case not found.</div>
    </GovLayout>
  ),
});

function CaseDetail() {
  const c = Route.useLoaderData();
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <Link to="/cases" className="text-xs text-[var(--gov-blue)] flex items-center gap-1 mb-3 hover:underline">
          <ArrowLeft className="h-3 w-3" /> All cases
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="ribbon-label">Case File</div>
            <h1 className="font-serif text-2xl text-[var(--gov-blue-deep)] font-semibold">
              {c.title}
            </h1>
            <div className="text-xs text-muted-foreground mt-1 font-mono">{c.caseNumber}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={c.status} />
            <PriorityPill priority={c.priority} />
            <Link
              to="/verification/$caseId"
              params={{ caseId: c.id }}
              className="bg-[var(--gov-blue)] text-white text-sm font-semibold px-4 h-9 rounded inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" /> Open Verification
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="official-card p-5">
              <div className="ribbon-label mb-3">Verified Metadata</div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><dt className="text-muted-foreground text-xs">Court</dt><dd className="font-medium">{c.court}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Judge</dt><dd className="font-medium">{c.judge}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Order Date</dt><dd className="font-medium">{c.orderDate}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Department</dt><dd className="font-medium">{c.department}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Petitioner</dt><dd className="font-medium">{c.petitioner}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Respondent</dt><dd className="font-medium">{c.respondent}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Filed by</dt><dd className="font-medium">{c.filedBy}</dd></div>
                <div><dt className="text-muted-foreground text-xs">Reviewed by</dt><dd className="font-medium">{c.reviewedBy ?? "— pending —"}</dd></div>
              </dl>
            </div>

            <div className="official-card p-5">
              <div className="ribbon-label mb-3">Compliance Directives</div>
              <ul className="space-y-3">
                {c.directives.map((d) => (
                  <li key={d.id} className="border-l-4 border-[var(--gov-red)] pl-3 py-1">
                    <div className="font-semibold text-sm">{d.text}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Deadline {d.deadline} · {d.daysRemaining} days remaining · {d.department}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="official-card p-5">
              <div className="ribbon-label mb-3">Reviewer Notes</div>
              <p className="text-sm text-muted-foreground italic">
                "Field 'Relief Granted' was paraphrased by AI. Reworded to match the operative
                portion of paragraph 5 of the order. All other extractions verified against the
                certified copy."
              </p>
              <p className="text-xs text-muted-foreground mt-2">— {c.reviewedBy ?? "Pending review"}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="official-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-[var(--gov-red)]" />
                <h3 className="font-serif text-base font-semibold">Source Document</h3>
              </div>
              <div className="text-xs text-muted-foreground">
                Certified copy received from CCMS gateway · 4 pages · 312 KB
              </div>
              <button className="mt-3 w-full text-xs font-semibold border border-border rounded h-8">
                Download PDF
              </button>
            </div>

            <div className="official-card p-5">
              <div className="ribbon-label mb-3">Audit Timeline</div>
              <ol className="relative border-l border-border ml-2 space-y-3">
                {auditEvents.slice(0, 5).map((e, i) => (
                  <li key={i} className="ml-4">
                    <div className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--gov-blue)]" />
                    <div className="text-xs text-muted-foreground">{e.ts}</div>
                    <div className="text-sm font-medium">{e.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.actor} · {e.role}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}
