import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1100px] mx-auto">
        <div className="ribbon-label">Module · Configuration</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">Settings</h1>

        <div className="grid md:grid-cols-2 gap-5 mt-6">
          {[
            { t: "CCMS Gateway", d: "Inbound endpoint, polling interval, certificate authority" },
            { t: "OCR Engine", d: "Tesseract / NIC-OCR · script: Latin + Kannada" },
            { t: "AI Extraction Model", d: "Confidence threshold, redaction rules, statute mapping" },
            { t: "Notification Channels", d: "e-Mail, SMS gateway, e-Office push" },
            { t: "Retention Policy", d: "Audit logs: 7 years · Documents: 30 years" },
            { t: "Digital Signature Certificate", d: "Class III DSC binding for verified records" },
          ].map((s) => (
            <div key={s.t} className="official-card p-5">
              <div className="font-serif text-base font-semibold text-[var(--gov-blue-deep)]">{s.t}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
              <button className="mt-3 text-xs font-semibold border border-border rounded h-8 px-3">
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </GovLayout>
  );
}
