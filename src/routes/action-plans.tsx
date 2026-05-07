import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { useDirectives, fmtDate, daysBetween } from "@/lib/queries";
import { PriorityPill } from "@/components/Pills";
import { Calendar, Building2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/action-plans")({ component: ActionPlans });

function ActionPlans() {
  const { data: directives = [], isLoading } = useDirectives();

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1500px] mx-auto">
        <div className="ribbon-label">Module · Operational Action Plans</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Action Plans & Compliance Directives
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          AI-derived directives mapped to responsible departments. Each directive carries an
          appeal/compliance window and is published only after legal officer verification.
        </p>

        {isLoading && <div className="mt-6 text-sm text-muted-foreground">Loading directives…</div>}
        {!isLoading && directives.length === 0 && (
          <div className="mt-6 official-card p-8 text-center text-sm text-muted-foreground">
            No action plans yet. Upload a judgment to generate directives.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {directives.map((d) => {
            const days = daysBetween(d.deadline);
            const urgent = days != null && days <= 7;
            return (
              <div
                key={d.id}
                className={`official-card p-5 border-t-4 ${urgent ? "border-t-[var(--gov-red)]" : "border-t-[var(--gov-blue)]"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-[var(--gov-blue)]">{d.cases?.case_number ?? "—"}</div>
                  <PriorityPill priority={d.priority} />
                </div>
                <div className="font-serif text-base text-[var(--gov-blue-deep)] font-semibold mt-2 leading-snug">
                  {d.text}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="ribbon-label flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline</div>
                    <div className="font-semibold text-foreground mt-0.5">{fmtDate(d.deadline)}</div>
                  </div>
                  <div>
                    <div className="ribbon-label flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Window</div>
                    <div className={`font-semibold mt-0.5 ${urgent ? "text-[var(--gov-red)]" : "text-foreground"}`}>
                      {days != null ? `${days} days remaining` : "Not specified"}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="ribbon-label flex items-center gap-1"><Building2 className="h-3 w-3" /> Assigned Department</div>
                    <div className="font-semibold text-foreground mt-0.5">{d.department ?? "Unassigned"}</div>
                  </div>
                </div>
                {d.source_quote && (
                  <div className="mt-3 text-[11px] italic text-muted-foreground border-l-2 border-border pl-2 line-clamp-3">
                    “{d.source_quote}” {d.source_page ? `(p.${d.source_page})` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </GovLayout>
  );
}
