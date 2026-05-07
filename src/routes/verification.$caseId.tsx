import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { cases } from "@/lib/mockData";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Edit3,
  ShieldCheck,
  FileText,
  Maximize2,
} from "lucide-react";
import { PriorityPill } from "./index";

export const Route = createFileRoute("/verification/$caseId")({
  component: VerificationWorkspace,
  loader: ({ params }) => {
    const c = cases.find((x) => x.id === params.caseId);
    if (!c) throw notFound();
    return c;
  },
  notFoundComponent: () => (
    <GovLayout>
      <div className="p-10 text-center">
        <h1 className="font-serif text-2xl">Case not found</h1>
        <Link to="/verification" className="text-[var(--gov-blue)] underline">
          Back to verification queue
        </Link>
      </div>
    </GovLayout>
  ),
});

function VerificationWorkspace() {
  const c = Route.useLoaderData();
  const [activeLine, setActiveLine] = useState<string>(c.fields[0].sourceLineId);
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected" | "edited" | undefined>>({});
  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const el = lineRefs.current[activeLine];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLine]);

  const decide = (fid: string, d: "approved" | "rejected" | "edited") =>
    setDecisions((prev) => ({ ...prev, [fid]: d }));

  const approvedCount = Object.values(decisions).filter((d) => d === "approved" || d === "edited").length;

  return (
    <GovLayout>
      <div className="px-6 py-5 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-2 text-xs mb-3">
          <Link to="/verification" className="text-[var(--gov-blue)] flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Verification queue
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono">{c.caseNumber}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="ribbon-label">Verification Workspace</div>
            <h1 className="font-serif text-2xl text-[var(--gov-blue-deep)] font-semibold">
              {c.title}
            </h1>
            <div className="text-xs text-muted-foreground mt-1">
              {c.court} · {c.judge} · Order dated {c.orderDate}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PriorityPill priority={c.priority} />
            <span className="text-xs text-muted-foreground">
              {approvedCount} of {c.fields.length} fields actioned
            </span>
            <button className="bg-success text-white text-sm font-semibold px-4 h-9 rounded inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Sign & Publish to Dashboard
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PDF viewer */}
          <div className="official-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 text-[var(--gov-red)]" /> Source Judgment ·
                Page 1 of 4
              </div>
              <button className="text-xs text-muted-foreground flex items-center gap-1">
                <Maximize2 className="h-3 w-3" /> Full screen
              </button>
            </div>
            <div className="bg-[#fbf9f3] p-6 max-h-[760px] overflow-y-auto font-serif text-[13px] leading-relaxed text-[#1a1a1a]">
              <div className="text-center mb-3">
                <div className="text-[10px] tracking-widest font-sans uppercase text-muted-foreground">
                  Certified true copy
                </div>
              </div>
              {c.judgmentLines.map((line) => {
                const isActive = activeLine === line.id;
                return (
                  <div
                    key={line.id}
                    ref={(el) => {
                      lineRefs.current[line.id] = el;
                    }}
                    className={`px-2 py-1 rounded transition-colors ${
                      isActive
                        ? "bg-yellow-200/80 ring-2 ring-[var(--warning)]"
                        : line.highlight
                        ? "bg-yellow-50"
                        : ""
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extracted fields */}
          <div className="space-y-3">
            <div className="official-card p-4">
              <div className="ribbon-label mb-2">Extracted Fields · Click to verify source</div>
              <div className="space-y-2">
                {c.fields.map((f) => {
                  const decision = decisions[f.id];
                  const confColor =
                    f.confidence >= 0.95 ? "text-success" : f.confidence >= 0.85 ? "text-[var(--warning)]" : "text-[var(--gov-red)]";
                  return (
                    <div
                      key={f.id}
                      onClick={() => setActiveLine(f.sourceLineId)}
                      className={`group cursor-pointer border rounded px-3 py-2.5 ${
                        activeLine === f.sourceLineId
                          ? "border-[var(--gov-blue)] bg-[var(--sandal)]/60"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <span>{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={confColor}>
                            {(f.confidence * 100).toFixed(0)}% confidence
                          </span>
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                            ↳ {f.sourceLineId}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-foreground mt-1 font-medium">{f.value}</div>
                      <div className="mt-2 flex items-center gap-1 opacity-90">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            decide(f.id, "approved");
                          }}
                          className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border ${
                            decision === "approved"
                              ? "bg-success text-white border-success"
                              : "border-border hover:bg-success/10"
                          }`}
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            decide(f.id, "edited");
                          }}
                          className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border ${
                            decision === "edited"
                              ? "bg-[var(--gov-blue)] text-white border-[var(--gov-blue)]"
                              : "border-border hover:bg-[var(--gov-blue)]/10"
                          }`}
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            decide(f.id, "rejected");
                          }}
                          className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border ${
                            decision === "rejected"
                              ? "bg-[var(--gov-red)] text-white border-[var(--gov-red)]"
                              : "border-border hover:bg-[var(--gov-red)]/10"
                          }`}
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="official-card p-4">
              <div className="ribbon-label mb-2">Generated Action Plan (advisory)</div>
              {c.directives.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setActiveLine(d.sourceLineId)}
                  className="cursor-pointer border-l-4 border-[var(--gov-red)] bg-[var(--sandal)]/40 px-3 py-2 rounded mb-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-foreground">{d.text}</div>
                    <PriorityPill priority={d.priority} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Deadline: {d.deadline} · {d.daysRemaining} days remaining ·{" "}
                    {d.department} · source ↳ {d.sourceLineId}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}
