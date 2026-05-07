// Server-only helpers for judgment extraction.
import { extractText } from "unpdf";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function setCaseExtracting(caseId: string) {
  await supabaseAdmin.from("cases").update({ status: "extracting" }).eq("id", caseId);
}

export async function markExtractionFailed(caseId: string, actorId: string, message: string) {
  await supabaseAdmin.from("cases").update({ status: "rejected" }).eq("id", caseId);
  await supabaseAdmin.from("audit_logs").insert({
    case_id: caseId,
    actor_id: actorId,
    actor_name: "JusticeTrack AI",
    actor_role: "system",
    action: "Extraction workflow failed",
    details: { error: message },
  });
}

export async function downloadJudgmentPdf(pdfPath: string): Promise<Uint8Array> {
  const { data: file, error } = await supabaseAdmin.storage.from("judgments").download(pdfPath);
  if (error || !file) throw new Error(`Download failed: ${error?.message ?? "no file"}`);
  return new Uint8Array(await file.arrayBuffer());
}

export async function signJudgmentUrl(pdfPath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from("judgments").createSignedUrl(pdfPath, expiresInSeconds);
  if (error || !data) throw new Error(error?.message ?? "Could not sign URL");
  return data.signedUrl;
}

export type ExtractionResult = {
  case_number: string | null;
  title: string | null;
  court: string | null;
  judge: string | null;
  order_date: string | null;
  petitioner: string | null;
  respondent: string | null;
  department: string | null;
  priority: "high" | "medium" | "low";
  appeal_deadline_days: number | null;
  summary: string;
  fields: Array<{
    label: string;
    value: string;
    confidence: number;
    source_page: number | null;
    source_quote: string | null;
  }>;
  directives: Array<{
    text: string;
    department: string | null;
    deadline: string | null;
    priority: "high" | "medium" | "low";
    source_page: number | null;
    source_quote: string | null;
  }>;
};

export async function extractPdfText(pdfBytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const { text, totalPages } = await extractText(pdfBytes, { mergePages: false });
  const pageTexts = (text as string[]).map((t, i) => `--- PAGE ${i + 1} ---\n${t}`).join("\n\n");
  return { text: pageTexts, pages: totalPages };
}

const SYSTEM = `You are JusticeTrack, an AI assistant that helps Karnataka Government legal officers triage High Court judgments. You extract structured metadata and operational directives from judgment text. You NEVER invent facts. If a field is not present, return null. Every extraction MUST include the verbatim source quote from the judgment and the page number it appeared on. Confidence must reflect how literally the value appears in the text.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "publish_extraction",
    description: "Return structured judgment extraction.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        case_number: { type: ["string", "null"] },
        title: { type: ["string", "null"], description: "Cause title e.g. Petitioner v. Respondent" },
        court: { type: ["string", "null"] },
        judge: { type: ["string", "null"] },
        order_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD if determinable" },
        petitioner: { type: ["string", "null"] },
        respondent: { type: ["string", "null"] },
        department: { type: ["string", "null"], description: "Karnataka Govt department primarily responsible" },
        priority: { type: "string", enum: ["high", "medium", "low"] },
        appeal_deadline_days: { type: ["integer", "null"] },
        summary: { type: "string", description: "2-3 sentence neutral summary for officers." },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              source_page: { type: ["integer", "null"] },
              source_quote: { type: ["string", "null"] },
            },
            required: ["label", "value", "confidence", "source_page", "source_quote"],
          },
        },
        directives: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              department: { type: ["string", "null"] },
              deadline: { type: ["string", "null"], description: "ISO date if specified or computable" },
              priority: { type: "string", enum: ["high", "medium", "low"] },
              source_page: { type: ["integer", "null"] },
              source_quote: { type: ["string", "null"] },
            },
            required: ["text", "department", "deadline", "priority", "source_page", "source_quote"],
          },
        },
      },
      required: [
        "case_number","title","court","judge","order_date","petitioner","respondent",
        "department","priority","appeal_deadline_days","summary","fields","directives",
      ],
    },
  },
};

export async function callGemini(judgmentText: string): Promise<ExtractionResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const truncated = judgmentText.slice(0, 120_000);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content:
            `Extract structured metadata and compliance directives from this Karnataka High Court judgment. Pages are delimited by '--- PAGE N ---'. Required fields to attempt: Case Number, Court, Presiding Judge, Order Date, Petitioner, Respondent, Department, Relief Granted, Compliance Window, Costs (if any). For each directive (binding instruction to government), include department, deadline date if any, and priority.\n\nJUDGMENT TEXT:\n\n${truncated}`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "publish_extraction" } },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit exceeded. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace settings.");
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }

  const json = await res.json();
  const call = json?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("AI did not return structured output");
  return JSON.parse(call.function.arguments) as ExtractionResult;
}

export async function persistExtraction(
  caseId: string,
  result: ExtractionResult,
  pages: number,
  textForStorage: string,
  actorId: string,
) {
  const avgConf =
    result.fields.length > 0
      ? result.fields.reduce((s, f) => s + (f.confidence ?? 0), 0) / result.fields.length
      : null;

  await supabaseAdmin
    .from("cases")
    .update({
      case_number: result.case_number,
      title: result.title,
      court: result.court,
      judge: result.judge,
      order_date: result.order_date,
      petitioner: result.petitioner,
      respondent: result.respondent,
      department: result.department,
      priority: result.priority,
      appeal_deadline_days: result.appeal_deadline_days,
      pdf_pages: pages,
      extracted_text: textForStorage.slice(0, 200_000),
      extraction_summary: result.summary,
      extraction_confidence: avgConf,
      status: "pending",
    })
    .eq("id", caseId);

  if (result.fields.length) {
    await supabaseAdmin.from("extracted_fields").insert(
      result.fields.map((f) => ({
        case_id: caseId,
        label: f.label,
        value: f.value,
        confidence: f.confidence,
        source_page: f.source_page,
        source_quote: f.source_quote,
      })),
    );
  }
  if (result.directives.length) {
    const directives = result.directives.map((d) => ({
      case_id: caseId,
      text: d.text,
      department: d.department,
      deadline: d.deadline,
      priority: d.priority,
      source_page: d.source_page,
      source_quote: d.source_quote,
    }));
    const { data: insertedDirectives } = await supabaseAdmin.from("directives").insert(directives).select("id, text, department, deadline, priority");

    if (insertedDirectives?.length) {
      await supabaseAdmin.from("action_plans").insert(
        insertedDirectives.map((d) => ({
          case_id: caseId,
          directive_id: d.id,
          department: d.department,
          action_text: d.text,
          priority: d.priority,
          due_date: d.deadline,
          created_by: actorId,
        })),
      );
    }
  }

  await supabaseAdmin.from("workflow_assignments").insert({
    case_id: caseId,
    department: result.department,
    assigned_role: "reviewing_officer",
    status: "pending_verification",
    created_by: actorId,
  });

  await supabaseAdmin.from("uploads").update({ status: "extracted", error_message: null }).eq("case_id", caseId);
  await supabaseAdmin.from("notifications").insert({
    user_id: actorId,
    case_id: caseId,
    message: "Judgment extraction completed. Verification workspace is ready.",
  });

  await supabaseAdmin.from("audit_logs").insert({
    case_id: caseId,
    actor_id: actorId,
    actor_name: "JusticeTrack AI",
    actor_role: "system",
    action: "Extraction completed and routed for verification",
    details: {
      avg_confidence: avgConf,
      field_count: result.fields.length,
      directive_count: result.directives.length,
      workflow: "pending_verification",
    },
  });
}
