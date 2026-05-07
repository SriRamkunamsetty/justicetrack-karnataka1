import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CaseRow = Tables<"cases">;
export type FieldRow = Tables<"extracted_fields">;
export type DirectiveRow = Tables<"directives">;
export type AuditRow = Tables<"audit_logs">;

export const STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded",
  extracting: "Extracting…",
  pending: "Pending Verification",
  in_review: "In Review",
  verified: "Verified",
  rejected: "Rejected",
};

export function useCases() {
  return useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseRow[];
    },
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const [{ data: c }, { data: fields }, { data: directives }] = await Promise.all([
        supabase.from("cases").select("*").eq("id", id).maybeSingle(),
        supabase.from("extracted_fields").select("*").eq("case_id", id).order("created_at"),
        supabase.from("directives").select("*").eq("case_id", id).order("created_at"),
      ]);
      return {
        case: c as CaseRow | null,
        fields: (fields ?? []) as FieldRow[],
        directives: (directives ?? []) as DirectiveRow[],
      };
    },
  });
}

export function useDirectives() {
  return useQuery({
    queryKey: ["directives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directives")
        .select("*, cases(case_number, id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (DirectiveRow & { cases: { case_number: string | null; id: string } | null })[];
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, cases(case_number)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as (AuditRow & { cases: { case_number: string | null } | null })[];
    },
  });
}

export function daysBetween(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  return Math.round((d - Date.now()) / (1000 * 60 * 60 * 24));
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
