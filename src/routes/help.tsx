import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";

export const Route = createFileRoute("/help")({ component: Help });

const faqs = [
  {
    q: "Can JusticeTrack act on a judgment without human verification?",
    a: "No. The system is advisory. Every extracted field, directive and deadline must be verified by an authorised Legal Officer and digitally signed before it is published to the operational dashboard.",
  },
  {
    q: "How do I verify that an extracted field is correct?",
    a: "Open the Verification Workspace for the case. Click the extracted field — the source PDF will auto-scroll to the exact paragraph or sentence. Approve, edit or reject the field accordingly.",
  },
  {
    q: "Where are documents stored?",
    a: "All judgments and audit logs are stored in NIC Cloud (Bengaluru region) with hash-chained audit trails. Retention follows the Karnataka State e-Records Retention Policy.",
  },
  {
    q: "Who decides which department is responsible?",
    a: "AI proposes a department based on respondent metadata. The Legal Officer must confirm or reassign before the directive is dispatched.",
  },
];

function Help() {
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1000px] mx-auto">
        <div className="ribbon-label">Help · User Manual</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">
          Help & Frequently Asked Questions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          For technical support, contact NIC Karnataka Helpdesk: 080-2202-XXXX · ccms-support@karnataka.gov.in
        </p>

        <div className="official-card mt-6 divide-y divide-border">
          {faqs.map((f) => (
            <details key={f.q} className="px-5 py-4 group">
              <summary className="font-serif text-base font-semibold text-[var(--gov-blue-deep)] cursor-pointer list-none flex justify-between items-center">
                {f.q}
                <span className="text-[var(--gov-red)] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </GovLayout>
  );
}
