import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2, Lock, FileCheck2, Cloud } from "lucide-react";
import { toast } from "sonner";
import emblem from "@/assets/karnataka-emblem.png";
import { KARNATAKA_DEPARTMENTS, KARNATAKA_DISTRICTS } from "@/lib/karnataka";

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
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [district, setDistrict] = useState("");
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        // Persist department/district/designation to profile (handle_new_user already inserted full_name)
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ designation, department, district })
            .eq("id", data.user.id);
        }
        toast.success("Account created. Verify e-mail then sign in.");
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
      <div className="hidden lg:flex flex-col p-10 xl:p-12 bg-[var(--gov-blue-deep)] text-white relative overflow-hidden">
        <div>
          <div className="text-[11px] tracking-[0.22em] uppercase opacity-85">
            ಕರ್ನಾಟಕ ಸರ್ಕಾರ · Government of Karnataka
          </div>
          <div className="font-serif text-3xl mt-1 font-semibold">JusticeTrack</div>
          <div className="text-xs opacity-80 mt-0.5">
            Court Case Monitoring System · DPAR
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center my-6">
          <div className="text-center">
            <div className="rounded-full bg-white/5 ring-1 ring-white/10 p-6 inline-block backdrop-blur-sm">
              <img
                src={emblem}
                alt="Karnataka State Emblem — large"
                className="h-56 w-56 xl:h-64 xl:w-64 object-contain mx-auto"
              />
            </div>
            <div className="mt-5 font-serif text-xl">ಸತ್ಯಮೇವ ಜಯತೇ</div>
            <div className="text-[11px] opacity-70 tracking-[0.18em] uppercase mt-1">
              Truth Alone Triumphs
            </div>
          </div>
        </div>

        <div className="space-y-3 max-w-md">
          <h2 className="font-serif text-xl">AI assists. Government officials decide.</h2>
          <p className="text-xs opacity-80 leading-relaxed">
            Convert High Court and Supreme Court judgments into verified, accountable
            departmental action plans — with full source traceability, RBAC controls, and an
            immutable audit trail.
          </p>
          <ul className="text-[11px] opacity-85 space-y-1.5 pt-2 border-t border-white/10">
            <li className="flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> NIC Secure Cloud · GIGW 3.0 · WCAG 2.1 AA</li>
            <li className="flex items-center gap-2"><FileCheck2 className="h-3 w-3" /> Hash-chained audit log on every action</li>
            <li className="flex items-center gap-2"><Cloud className="h-3 w-3" /> Karnataka State Data Centre · ISO 27001</li>
          </ul>
        </div>

        <div className="text-[10px] opacity-55 mt-6 pt-4 border-t border-white/10">
          Authorized officers only. Unauthorized access is punishable under the
          Information Technology Act, 2000 (§§ 43, 66, 72).
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile emblem */}
          <div className="flex lg:hidden items-center gap-3 mb-4">
            <img src={emblem} alt="Karnataka emblem" className="h-12 w-12 object-contain" />
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                Government of Karnataka
              </div>
              <div className="font-serif text-lg text-[var(--gov-blue-deep)] font-semibold">
                JusticeTrack
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[var(--gov-blue)] mb-2">
            <Lock className="h-4 w-4" />
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

          <form onSubmit={submit} className="mt-5 space-y-3 official-card p-5 bg-card">
            {mode === "signup" && (
              <>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ribbon-label">Designation</label>
                    <input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                      placeholder="Section Officer"
                    />
                  </div>
                  <div>
                    <label className="ribbon-label">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                    >
                      <option value="">— Select —</option>
                      {KARNATAKA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="ribbon-label">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                  >
                    <option value="">— Select department —</option>
                    {KARNATAKA_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
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

          <div className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
            <div className="font-semibold text-[var(--gov-blue-deep)] tracking-wider uppercase">
              Authorized Government Access Only
            </div>
            <div className="mt-1">
              All sessions are audit-logged · NIC Secure Infrastructure · Karnataka State Data Centre
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
