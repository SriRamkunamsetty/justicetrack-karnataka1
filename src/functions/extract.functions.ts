import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  extractPdfText,
  callGemini,
  persistExtraction,
  setCaseExtracting,
  markExtractionFailed,
  downloadJudgmentPdf,
  signJudgmentUrl,
} from "@/server/extract.server";

export const runExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ caseId: z.string().uuid(), pdfPath: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { caseId, pdfPath } = data;
    const { supabase, userId } = context;

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, pdf_path, uploaded_by")
      .eq("id", caseId)
      .eq("uploaded_by", userId)
      .maybeSingle();

    if (caseError) throw new Error("Upload authorization failed. Please sign in again and retry.");
    if (!caseRow || caseRow.pdf_path !== pdfPath) {
      throw new Error("Upload authorization failed. This judgment is not linked to your session.");
    }

    await setCaseExtracting(caseId);
    try {
      const bytes = await downloadJudgmentPdf(pdfPath);
      const { text, pages } = await extractPdfText(bytes);

      const result = await callGemini(text);
      await persistExtraction(caseId, result, pages, text, userId);

      return { ok: true, caseId };
    } catch (error: any) {
      await supabase.from("uploads").update({ status: "extraction_failed", error_message: error?.message ?? "Extraction failed" }).eq("case_id", caseId);
      await markExtractionFailed(caseId, userId, error?.message ?? "Extraction failed");
      throw new Error(error?.message ?? "Unable to complete extraction workflow. Please retry.");
    }
  });

export const decideField = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        fieldId: z.string().uuid(),
        decision: z.enum(["approved", "edited", "rejected"]),
        editedValue: z.string().optional(),
        reason: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: permitted } = await supabase.rpc("current_user_has_any_role", {
      _roles: ["super_admin", "legal_officer", "reviewing_officer"],
    });
    if (!permitted) throw new Error("Verification authorization failed. Your role can upload and view, but cannot verify fields.");

    const { data: field, error } = await supabase
      .from("extracted_fields")
      .update({
        decision: data.decision,
        edited_value: data.decision === "edited" ? data.editedValue ?? null : null,
        rejection_reason: data.decision === "rejected" ? data.reason ?? null : null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.fieldId)
      .select("*, cases(id, case_number)")
      .single();
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, designation")
      .eq("id", userId)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      case_id: field.case_id,
      actor_id: userId,
      actor_name: profile?.full_name ?? "Officer",
      actor_role: profile?.designation ?? "Reviewer",
      action: `Field ${data.decision}: ${field.label}`,
      details: {
        field_id: data.fieldId,
        previous_value: field.value,
        edited_value: data.editedValue ?? null,
        reason: data.reason ?? null,
      },
    });

    return { ok: true };
  });

export const publishCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ caseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: permitted } = await supabase.rpc("current_user_has_any_role", {
      _roles: ["super_admin", "legal_officer"],
    });
    if (!permitted) throw new Error("Publication authorization failed. Only authorised legal officers can publish verified records.");

    const { error } = await supabase
      .from("cases")
      .update({
        status: "verified",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.caseId);
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, designation")
      .eq("id", userId)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      case_id: data.caseId,
      actor_id: userId,
      actor_name: profile?.full_name ?? "Officer",
      actor_role: profile?.designation ?? "Legal Officer",
      action: "Verified record published to dashboard",
    });
    return { ok: true };
  });

export const getSignedPdfUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pdfPath: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const url = await signJudgmentUrl(data.pdfPath);
    return { url };
  });

export const acknowledgeDirective = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ directiveId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: permitted } = await supabase.rpc("current_user_has_any_role", {
      _roles: ["super_admin", "legal_officer", "reviewing_officer", "department_admin"],
    });
    if (!permitted) throw new Error("Workflow authorization failed. Your role can upload and view, but cannot acknowledge directives.");

    const { data: dir, error } = await supabase
      .from("directives")
      .update({
        status: "acknowledged",
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", data.directiveId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, designation")
      .eq("id", userId)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      case_id: dir.case_id,
      actor_id: userId,
      actor_name: profile?.full_name ?? "Officer",
      actor_role: profile?.designation ?? "Department Officer",
      action: `Directive acknowledged: ${dir.text.slice(0, 80)}`,
      details: { directive_id: dir.id, department: dir.department },
    });
    return { ok: true };
  });

