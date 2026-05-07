import { createFileRoute, Link } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { useCase } from "@/lib/queries";
import { PriorityPill } from "@/components/Pills";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, X, Edit3, ShieldCheck, FileText, Maximize2, Minimize2,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Loader2, Save,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { decideField, publishCase, getSignedPdfUrl } from "@/functions/extract.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verification/$caseId")({ component: VerificationWorkspace });

function VerificationWorkspace() {
  const { caseId } = Route.useParams();
  const { canWrite } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useCase(caseId);

  const c = data?.case;
  const fields = data?.fields ?? [];
  const directives = data?.directives ?? [];

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!c?.pdf_path) return;
    getSignedPdfUrl({ data: { pdfPath: c.pdf_path } })
      .then((r) => setPdfUrl(r.url))
      .catch((e) => console.error("Signed URL error", e));
  }, [c?.pdf_path]);

  const activeField = useMemo(
    () => fields.find((f) => f.id === activeFieldId) ?? fields[0],
    [fields, activeFieldId],
  );

  useEffect(() => {
    if (activeField?.source_page) setPdfPage(activeField.source_page);
  }, [activeField?.id, activeField?.source_page]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["case", caseId] });

  const onApprove = async (fid: string) => {
    if (!canWrite) return toast.error("You don't have permission.");
    setBusy(fid);
    try {
      await decideField({ data: { fieldId: fid, decision: "approved" } });
      toast.success("Field approved");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const onSaveEdit = async (fid: string) => {
    if (!canWrite) return toast.error("You don't have permission.");
    setBusy(fid);
    try {
      await decideField({ data: { fieldId: fid, decision: "edited", editedValue: editValue } });
      toast.success("Edit saved");
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const onConfirmReject = async (fid: string) => {
    if (!rejectReason.trim()) return toast.error("Rejection reason required");
    setBusy(fid);
    try {
      await decideField({ data: { fieldId: fid, decision: "rejected", reason: rejectReason } });
      toast.success("Field rejected");
      setRejectingId(null);
      setRejectReason("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const onPublish = async () => {
    if (!canWrite) return toast.error("You don't have permission.");
    const undecided = fields.filter((f) => f.decision === "pending");
    if (undecided.length > 0) {
      if (!confirm(`${undecided.length} field(s) still pending. Publish anyway?`)) return;
    }
    setPublishing(true);
    try {
      await publishCase({ data: { caseId } });
      toast.success("Case verified & published");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["cases"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishing(false);
    }
  };

  // Realtime — refresh when fields change
  useEffect(() => {
    const ch = supabase
      .channel(`case-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "extracted_fields", filter: `case_id=eq.${caseId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  if (isLoading) return <GovLayout><div className="p-10 text-sm text-muted-foreground">Loading workspace…</div></GovLayout>;
  if (!c) return <GovLayout><div className="p-10">Case not found.</div></GovLayout>;

  const actioned = fields.filter((f) => f.decision !== "pending").length;
  const isExtracting = c.status === "extracting" || c.status === "uploaded";

  return (
    <GovLayout>
      <div className="px-6 py-5 max-w-[1700px] mx-auto">
        <div className="flex items-center gap-2 text-xs mb-3">
          <Link to="/verification" className="text-[var(--gov-blue)] flex items-center gap-1 hover:underline">
            <ArrowLeft className="h-3 w-3" /> Verification queue
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono">{c.case_number ?? c.pdf_name}</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <div className="ribbon-label">Verification Workspace</div>
            <h1 className="font-serif text-2xl text-[var(--gov-blue-deep)] font-semibold">
              {c.title ?? c.pdf_name}
            </h1>
            <div className="text-xs text-muted-foreground mt-1">
              {c.court ?? "—"} · {c.judge ?? "—"} · {c.order_date ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PriorityPill priority={c.priority} />
            <span className="text-xs text-muted-foreground">
              {actioned} of {fields.length} fields actioned
            </span>
            <button
              onClick={onPublish}
              disabled={!canWrite || publishing || c.status === "verified"}
              className="bg-success text-white text-sm font-semibold px-4 h-10 rounded inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {c.status === "verified" ? "Published" : "Sign & Publish to Dashboard"}
            </button>
          </div>
        </div>

        {isExtracting && (
          <div className="official-card p-4 mb-4 flex items-center gap-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--gov-blue)]" />
            Extraction in progress. Fields will appear automatically when ready.
          </div>
        )}

        <div className={`grid gap-4 ${fullscreen ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {/* PDF VIEWER */}
          <div className="official-card overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <FileText className="h-3.5 w-3.5 text-[var(--gov-red)]" />
                Source Judgment · {c.pdf_name ?? "PDF"}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPdfPage((p) => Math.max(1, p - 1))} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Previous page">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono px-2">
                  Page {pdfPage}{c.pdf_pages ? ` / ${c.pdf_pages}` : ""}
                </span>
                <button onClick={() => setPdfPage((p) => p + 1)} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Next page">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <span className="mx-1 h-4 w-px bg-border" />
                <button onClick={() => setPdfZoom((z) => Math.max(50, z - 10))} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Zoom out">
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono px-1 min-w-[40px] text-center">{pdfZoom}%</span>
                <button onClick={() => setPdfZoom((z) => Math.min(200, z + 10))} className="h-7 w-7 grid place-items-center rounded hover:bg-muted" title="Zoom in">
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <span className="mx-1 h-4 w-px bg-border" />
                <button onClick={() => setFullscreen((v) => !v)} className="h-7 px-2 grid place-items-center rounded hover:bg-muted text-xs" title="Toggle fullscreen">
                  {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="bg-[#525659] flex-1" style={{ height: fullscreen ? "calc(100vh - 240px)" : "780px" }}>
              {pdfUrl ? (
                <iframe
                  key={`${pdfPage}-${pdfZoom}`}
                  title="Judgment PDF"
                  src={`${pdfUrl}#page=${pdfPage}&zoom=${pdfZoom}`}
                  className="w-full h-full border-0"
                />
              ) : (
                <div className="h-full grid place-items-center text-white/80 text-sm">
                  {c.pdf_path ? (
                    <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing secure document…</div>
                  ) : (
                    <div>No PDF attached.</div>
                  )}
                </div>
              )}
            </div>
            {activeField?.source_quote && (
              <div className="px-4 py-2 border-t border-border bg-[var(--sandal)]/60 text-xs">
                <span className="ribbon-label mr-2">Source quote (p.{activeField.source_page ?? "?"})</span>
                <span className="italic">"{activeField.source_quote}"</span>
              </div>
            )}
          </div>

          {/* EXTRACTED FIELDS */}
          {!fullscreen && (
            <div className="space-y-3">
              <div className="official-card p-4">
                <div className="ribbon-label mb-2">Extracted Fields · Click to verify source</div>
                <div className="space-y-2 max-h-[760px] overflow-y-auto pr-1">
                  {fields.length === 0 && (
                    <div className="text-sm text-muted-foreground py-6 text-center">No fields extracted yet.</div>
                  )}
                  {fields.map((f) => {
                    const conf = Number(f.confidence ?? 0);
                    const confColor = conf >= 0.95 ? "text-success" : conf >= 0.85 ? "text-[var(--warning)]" : "text-[var(--gov-red)]";
                    const isActive = activeFieldId === f.id;
                    const isEditing = editingId === f.id;
                    const isRejecting = rejectingId === f.id;
                    const decisionStyle =
                      f.decision === "approved" ? "border-l-4 border-l-success" :
                      f.decision === "edited" ? "border-l-4 border-l-[var(--gov-blue)]" :
                      f.decision === "rejected" ? "border-l-4 border-l-[var(--gov-red)] opacity-75" :
                      "";
                    return (
                      <div
                        key={f.id}
                        onClick={() => setActiveFieldId(f.id)}
                        className={`group cursor-pointer border rounded px-3 py-2.5 transition ${decisionStyle} ${
                          isActive ? "border-[var(--gov-blue)] bg-[var(--sandal)]/60" : "border-border bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span>{f.label}</span>
                          <div className="flex items-center gap-2">
                            <span className={confColor}>{(conf * 100).toFixed(0)}% confidence</span>
                            {f.source_page && (
                              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">p.{f.source_page}</span>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full text-sm border border-input rounded px-2 h-9 bg-card"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                disabled={busy === f.id}
                                onClick={() => onSaveEdit(f.id)}
                                className="text-xs px-2 h-7 rounded inline-flex items-center gap-1 bg-[var(--gov-blue)] text-white disabled:opacity-50"
                              >
                                {busy === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs px-2 h-7 rounded border border-border hover:bg-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-foreground mt-1 font-medium">
                            {f.decision === "edited" && f.edited_value ? (
                              <>
                                <span>{f.edited_value}</span>
                                <span className="ml-2 text-[10px] text-muted-foreground line-through">{f.value}</span>
                              </>
                            ) : (
                              f.value ?? "—"
                            )}
                          </div>
                        )}

                        {isRejecting && (
                          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              autoFocus
                              placeholder="Reason for rejection (required)…"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="w-full text-sm border border-input rounded px-2 py-1.5 bg-card"
                              rows={2}
                            />
                            <div className="flex items-center gap-1">
                              <button
                                disabled={busy === f.id}
                                onClick={() => onConfirmReject(f.id)}
                                className="text-xs px-2 h-7 rounded bg-[var(--gov-red)] text-white disabled:opacity-50"
                              >
                                Confirm rejection
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                className="text-xs px-2 h-7 rounded border border-border hover:bg-muted"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {f.decision === "rejected" && f.rejection_reason && !isRejecting && (
                          <div className="mt-2 text-[11px] text-[var(--gov-red)] border-l-2 border-[var(--gov-red)] pl-2 italic">
                            Rejected: {f.rejection_reason}
                          </div>
                        )}
                        {!isEditing && !isRejecting && (
                          <div className="mt-2 flex items-center gap-1">
                            <button
                              disabled={!canWrite || busy === f.id}
                              onClick={(e) => { e.stopPropagation(); onApprove(f.id); }}
                              className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border disabled:opacity-50 ${
                                f.decision === "approved" ? "bg-success text-white border-success" : "border-border hover:bg-success/10"
                              }`}
                            >
                              {busy === f.id && f.decision !== "approved" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve
                            </button>
                            <button
                              disabled={!canWrite}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(f.id);
                                setEditValue((f.decision === "edited" ? f.edited_value : f.value) ?? "");
                              }}
                              className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border disabled:opacity-50 ${
                                f.decision === "edited" ? "bg-[var(--gov-blue)] text-white border-[var(--gov-blue)]" : "border-border hover:bg-[var(--gov-blue)]/10"
                              }`}
                            >
                              <Edit3 className="h-3 w-3" /> Edit
                            </button>
                            <button
                              disabled={!canWrite}
                              onClick={(e) => { e.stopPropagation(); setRejectingId(f.id); }}
                              className={`text-xs px-2 h-7 rounded inline-flex items-center gap-1 border disabled:opacity-50 ${
                                f.decision === "rejected" ? "bg-[var(--gov-red)] text-white border-[var(--gov-red)]" : "border-border hover:bg-[var(--gov-red)]/10"
                              }`}
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="official-card p-4">
                <div className="ribbon-label mb-2">Generated Action Plan (advisory)</div>
                {directives.length === 0 && <div className="text-xs text-muted-foreground">No directives detected.</div>}
                {directives.map((d) => (
                  <div
                    key={d.id}
                    className="border-l-4 border-[var(--gov-red)] bg-[var(--sandal)]/40 px-3 py-2 rounded mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">{d.text}</div>
                      <PriorityPill priority={d.priority} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Deadline: {d.deadline ?? "—"} · {d.department ?? "Unassigned"}
                      {d.source_page ? ` · source p.${d.source_page}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GovLayout>
  );
}
