import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { cases } from "@/lib/mockData";
import { PriorityPill } from "./index";
import { Calendar, Building2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/action-plans")({ component: ActionPlans });

function ActionPlans() {
  const all = cases.flatMap((c) =>
    c.directives.map((d) => ({ ...d, caseNumber: c.caseNumber, caseId: c.id })),
  );

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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {all.map((d) => {
            const urgent = d.daysRemaining <= 7;
            return (
              <div
                key={d.caseId + d.id}
                className={`official-card p-5 border-t-4 ${
                  urgent ? "border-t-[var(--gov-red)]" : "border-t-[var(--gov-blue)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs text-[var(--gov-blue)]">{d.caseNumber}</div>
                  <PriorityPill priority={d.priority} />
                </div>
                <div className="font-serif text-base text-[var(--gov-blue-deep)] font-semibold mt-2 leading-snug">
                  {d.text}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="ribbon-label flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Deadline
                    </div>
                    <div className="font-semibold text-foreground mt-0.5">{d.deadline}</div>
                  </div>
                  <div>
                    <div className="ribbon-label flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Window
                    </div>
                    <div
                      className={`font-semibold mt-0.5 ${
                        urgent ? "text-[var(--gov-red)]" : "text-foreground"
                      }`}
                    >
                      {d.daysRemaining} days remaining
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="ribbon-label flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> Assigned Department
                    </div>
                    <div className="font-semibold text-foreground mt-0.5">{d.department}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button className="text-xs font-semibold px-3 h-8 rounded bg-[var(--gov-blue)] text-white">
                    Acknowledge
                  </button>
                  <button className="text-xs font-semibold px-3 h-8 rounded border border-border">
                    Reassign
                  </button>
                  <button className="text-xs font-semibold px-3 h-8 rounded border border-border">
                    Mark complete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GovLayout>
  );
}
