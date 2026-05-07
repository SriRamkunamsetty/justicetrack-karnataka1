import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  extractPdfText,
  callGemini,
  persistExtraction,
  setCaseExtracting,
  downloadJudgmentPdf,
  signJudgmentUrl,
} from "./extract.server";

export const runExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ caseId: z.string().uuid(), pdfPath: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { caseId, pdfPath } = data;
    const userId = context.userId;

    await supabaseAdmin.from("cases").update({ status: "extracting" }).eq("id", caseId);

    const { data: file, error: dlErr } = await supabaseAdmin.storage
      .from("judgments")
      .download(pdfPath);
    if (dlErr || !file) throw new Error(`Download failed: ${dlErr?.message ?? "no file"}`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text, pages } = await extractPdfText(bytes);

    const result = await callGemini(text);
    await persistExtraction(caseId, result, pages, text, userId);

    return { ok: true, caseId };
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
    const { data: signed, error } = await supabaseAdmin.storage
      .from("judgments")
      .createSignedUrl(data.pdfPath, 60 * 60);
    if (error || !signed) throw new Error(error?.message ?? "Could not sign URL");
    return { url: signed.signedUrl };
  });

export const acknowledgeDirective = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ directiveId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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

