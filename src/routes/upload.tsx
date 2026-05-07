import { createFileRoute, Link } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  ScanLine,
  Brain,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const steps = [
  { id: "upload", label: "PDF received", icon: Upload },
  { id: "ocr", label: "OCR & layout analysis", icon: ScanLine },
  { id: "extract", label: "AI extraction (entities, directives, deadlines)", icon: Brain },
  { id: "validate", label: "Cross-validation against statutes & departments", icon: ShieldCheck },
  { id: "ready", label: "Ready for human verification", icon: CheckCircle2 },
];

function UploadPage() {
  const [stage, setStage] = useState(-1);
  const [file, setFile] = useState<string | null>(null);

  const begin = (name: string) => {
    setFile(name);
    setStage(0);
    steps.forEach((_, i) => {
      setTimeout(() => setStage(i), (i + 1) * 800);
    });
  };

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1300px] mx-auto">
        <div className="ribbon-label">Module · Ingestion</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Upload Court Judgment
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Upload judgment PDFs received from the High Court of Karnataka via CCMS gateway.
          The system performs OCR, structured extraction and confidence scoring. All extracted
          fields require human verification before publication to the dashboard.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 official-card p-6">
            <label
              className="block border-2 border-dashed border-[var(--gov-blue)]/30 rounded-lg p-10 text-center cursor-pointer hover:bg-[var(--sandal)]/40 transition"
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && begin(e.target.files[0].name)}
              />
              <div className="mx-auto h-14 w-14 grid place-items-center rounded-full bg-[var(--gov-blue)]/10 text-[var(--gov-blue)] mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <div className="font-serif text-lg text-[var(--gov-blue-deep)] font-semibold">
                Drop judgment PDF here, or click to browse
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Accepted: PDF (scanned or digital) · Max 25 MB · Source: CCMS / Manual
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  begin("WP_10234_2025_RajeshKumar_vs_State.pdf");
                }}
                className="mt-5 inline-flex items-center gap-2 bg-[var(--gov-blue)] text-white text-sm font-semibold px-4 h-9 rounded"
              >
                <FileText className="h-4 w-4" /> Use sample judgment
              </button>
            </label>

            {file && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-[var(--gov-red)]" />
                  {file}
                </div>
                <ol className="mt-4 space-y-3">
                  {steps.map((s, i) => {
                    const done = stage > i;
                    const active = stage === i;
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 text-sm border border-border rounded px-3 py-2 bg-card"
                      >
                        <div
                          className={`h-7 w-7 rounded-full grid place-items-center text-xs font-semibold ${
                            done
                              ? "bg-success text-white"
                              : active
                              ? "bg-[var(--gov-blue)] text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : active ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <s.icon className="h-4 w-4 text-muted-foreground" />
                        <span className={done || active ? "text-foreground" : "text-muted-foreground"}>
                          {s.label}
                        </span>
                        {done && <span className="ml-auto text-[11px] text-success font-semibold">OK</span>}
                      </li>
                    );
                  })}
                </ol>

                {stage >= steps.length - 1 && (
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div className="text-xs text-muted-foreground">
                      Avg. confidence: <span className="text-foreground font-semibold">94.2%</span> · 8
                      fields extracted · 2 directives detected
                    </div>
                    <Link
                      to="/verification/$caseId"
                      params={{ caseId: "case-0" }}
                      className="bg-[var(--gov-red)] text-white text-sm font-semibold px-4 h-9 inline-flex items-center rounded"
                    >
                      Proceed to Verification →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="official-card p-5 text-sm">
            <div className="ribbon-label">Governance Notice</div>
            <h3 className="font-serif text-lg text-[var(--gov-blue-deep)] font-semibold mt-1">
              AI assists. Officers decide.
            </h3>
            <p className="text-muted-foreground mt-2">
              JusticeTrack does not autonomously act on court judgments. Every extracted
              record is reviewed and digitally signed by an authorised Legal Officer before it
              becomes part of the official compliance record.
            </p>
            <ul className="mt-4 space-y-2 text-foreground">
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> Source-traceable extractions with PDF jump-to-line</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> Per-field confidence indicators</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> Tamper-evident audit log on NIC Cloud</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success mt-0.5" /> Role-based access control (RBAC)</li>
            </ul>
          </aside>
        </div>
      </div>
    </GovLayout>
  );
}
