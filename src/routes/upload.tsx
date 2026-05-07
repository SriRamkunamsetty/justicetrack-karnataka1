import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { runExtraction } from "@/functions/extract.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/upload")({ component: UploadPage });

const steps = [
  { id: "upload", label: "Uploading PDF to secure storage", icon: Upload },
  { id: "ocr", label: "Reading document text & layout", icon: ScanLine },
  { id: "extract", label: "AI extraction (entities, directives, deadlines)", icon: Brain },
  { id: "validate", label: "Persisting structured record & audit log", icon: ShieldCheck },
  { id: "ready", label: "Ready for human verification", icon: CheckCircle2 },
];

function UploadPage() {
  const { user, canWrite, profile } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState(-1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!canWrite) {
      toast.error("Your role cannot upload judgments. Contact a Department Admin.");
      return;
    }
    setError(null);
    setBusy(true);
    setFileName(file.name);
    setStage(0);

    try {
      // 1. Insert case row
      const { data: caseRow, error: caseErr } = await supabase
        .from("cases")
        .insert({
          pdf_name: file.name,
          status: "uploaded",
          uploaded_by: user.id,
          title: file.name.replace(/\.pdf$/i, ""),
        })
        .select("id")
        .single();
      if (caseErr || !caseRow) throw new Error(caseErr?.message ?? "Could not create case");

      // 2. Upload PDF to storage
      const path = `${user.id}/${caseRow.id}/${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("judgments")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      await supabase.from("cases").update({ pdf_path: path }).eq("id", caseRow.id);
      await supabase.from("audit_logs").insert({
        case_id: caseRow.id,
        actor_id: user.id,
        actor_name: profile?.full_name ?? user.email ?? "Officer",
        actor_role: profile?.designation ?? "Section Officer",
        action: "Uploaded judgment PDF",
        details: { file: file.name, size: file.size },
      });

      setStage(1);
      // 3. Server function: extract + persist
      setStage(2);
      await runExtraction({ data: { caseId: caseRow.id, pdfPath: path } });
      setStage(3);
      setStage(4);

      toast.success("Extraction complete. Open verification workspace.");
      setTimeout(() => navigate({ to: "/verification/$caseId", params: { caseId: caseRow.id } }), 600);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Unknown error");
      toast.error(e?.message ?? "Extraction failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1300px] mx-auto">
        <div className="ribbon-label">Module · Ingestion</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Upload Court Judgment
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Upload judgment PDFs received from the High Court of Karnataka. The system performs OCR-grade
          text extraction, AI structuring, and per-field confidence scoring. All extracted fields require
          human verification before publication to the Governance Dashboard.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
          <div className="lg:col-span-2 official-card p-6">
            <label
              className={`block border-2 border-dashed rounded-lg p-10 text-center transition ${
                busy
                  ? "border-border bg-muted/30 cursor-not-allowed"
                  : "border-[var(--gov-blue)]/30 cursor-pointer hover:bg-[var(--sandal)]/40"
              }`}
            >
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="mx-auto h-14 w-14 grid place-items-center rounded-full bg-[var(--gov-blue)]/10 text-[var(--gov-blue)] mb-3">
                {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
              </div>
              <div className="font-serif text-lg text-[var(--gov-blue-deep)] font-semibold">
                {busy ? "Processing…" : "Drop judgment PDF here, or click to browse"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Accepted: PDF (digital or scanned) · Max 25 MB · Extraction by Lovable AI Gateway
              </div>
            </label>

            {fileName && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-[var(--gov-red)]" />
                  {fileName}
                </div>
                <ol className="mt-4 space-y-2.5">
                  {steps.map((s, i) => {
                    const done = stage > i;
                    const active = stage === i && busy;
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
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : active ? (
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
                {error && (
                  <div className="mt-4 flex items-start gap-2 border border-[var(--gov-red)]/30 bg-[var(--gov-red)]/5 text-[var(--gov-red)] rounded px-3 py-2 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-semibold">Extraction failed</div>
                      <div className="text-xs">{error}</div>
                    </div>
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
              JusticeTrack does not autonomously act on court judgments. Every extracted record is
              reviewed and digitally signed by an authorised Legal Officer before it becomes part of
              the official compliance record.
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
