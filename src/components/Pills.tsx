import { Link } from "@tanstack/react-router";

export function StatusPill({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    pending: "bg-[var(--gov-red)]/10 text-[var(--gov-red)] border-[var(--gov-red)]/30",
    in_review: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/30",
    verified: "bg-success/10 text-success border-success/30",
    rejected: "bg-muted text-muted-foreground border-border",
    uploaded: "bg-muted text-muted-foreground border-border",
    extracting: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/30",
  };
  const label: Record<string, string> = {
    pending: "Pending Verification",
    in_review: "In Review",
    verified: "Verified",
    rejected: "Rejected",
    uploaded: "Uploaded",
    extracting: "Extracting…",
  };
  const s = status ?? "uploaded";
  return (
    <span className={`text-[11px] font-semibold border rounded px-2 py-0.5 ${map[s] ?? map.uploaded}`}>
      {label[s] ?? s}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: string | null }) {
  const map: Record<string, string> = {
    high: "bg-[var(--gov-red)] text-white",
    medium: "bg-[var(--warning)] text-white",
    low: "bg-muted text-muted-foreground",
  };
  const p = priority ?? "medium";
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 ${map[p]}`}>
      {p}
    </span>
  );
}

export { Link };
