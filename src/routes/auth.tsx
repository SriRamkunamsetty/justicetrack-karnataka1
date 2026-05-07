import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) nav({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. You may now sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--sandal)]">
      {/* Left identity panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[var(--gov-blue-deep)] text-white">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase opacity-80">
            ಕರ್ನಾಟಕ ಸರ್ಕಾರ · Government of Karnataka
          </div>
          <div className="font-serif text-3xl mt-2 font-semibold">JusticeTrack</div>
          <div className="text-sm opacity-80 mt-1">
            Court Case Monitoring System · Department of Personnel & Administrative Reforms
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="font-serif text-2xl">AI assists. Government decides.</h2>
          <p className="text-sm opacity-85 leading-relaxed">
            Convert High Court and Supreme Court judgments into verified, accountable
            departmental action plans — with full source traceability, RBAC controls, and an
            immutable audit trail.
          </p>
          <ul className="text-xs opacity-85 space-y-1.5">
            <li>· GIGW 3.0 Compliant · WCAG 2.1 AA</li>
            <li>· NIC Secure Cloud Hosting</li>
            <li>· Hash-chained audit log for every action</li>
          </ul>
        </div>
        <div className="text-[11px] opacity-60">
          Authorized officers only. Misuse is punishable under the IT Act, 2000.
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-[var(--gov-blue)] mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-widest uppercase">
              Secure Officer Sign In
            </span>
          </div>
          <h1 className="font-serif text-2xl text-[var(--gov-blue-deep)] font-semibold">
            {mode === "signin" ? "Sign in to your account" : "Request officer access"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? "Use your government-issued e-mail and password."
              : "Default access is read-only. A Super Admin will assign your operational role."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3 official-card p-5 bg-card">
            {mode === "signup" && (
              <div>
                <label className="ribbon-label">Full name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                  placeholder="Smt. Anitha R."
                />
              </div>
            )}
            <div>
              <label className="ribbon-label">Official e-mail</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                placeholder="officer@karnataka.gov.in"
              />
            </div>
            <div>
              <label className="ribbon-label">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                placeholder="Minimum 8 characters"
              />
            </div>
            <button
              disabled={busy}
              className="w-full h-10 mt-2 bg-[var(--gov-red)] text-white rounded font-semibold inline-flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in securely" : "Create account"}
            </button>

            <div className="text-xs text-muted-foreground text-center pt-2">
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button type="button" className="text-[var(--gov-blue)] underline" onClick={() => setMode("signup")}>
                    Request access
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" className="text-[var(--gov-blue)] underline" onClick={() => setMode("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="text-[11px] text-muted-foreground text-center mt-4">
            Protected by NIC Secure infrastructure. Sessions are audit-logged.
          </div>
        </div>
      </div>
    </div>
  );
}