import { createFileRoute } from "@tanstack/react-router";
import { GovLayout } from "@/components/GovLayout";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { useState, FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { profile, user, roles, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setDesignation(profile?.designation ?? "");
    setDepartment(profile?.department ?? "");
  }, [profile]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, designation, department })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated");
      await refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) return toast.error("Password must be ≥ 8 characters");
    if (newPwd !== confirmPwd) return toast.error("Passwords do not match");
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Password updated");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <GovLayout>
      <div className="px-6 py-6 max-w-[1100px] mx-auto">
        <div className="ribbon-label">Module · Account & Security</div>
        <h1 className="font-serif text-3xl text-[var(--gov-blue-deep)] font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your officer profile, department assignment and account security.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mt-6">
          {/* Profile */}
          <form onSubmit={saveProfile} className="official-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="h-4 w-4 text-[var(--gov-blue)]" />
              <h2 className="font-serif text-lg font-semibold text-[var(--gov-blue-deep)]">
                Officer Profile
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="ribbon-label">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                  required
                />
              </div>
              <div>
                <label className="ribbon-label">Official e-mail</label>
                <input
                  value={user?.email ?? ""}
                  disabled
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-muted text-sm text-muted-foreground"
                />
              </div>
              <div>
                <label className="ribbon-label">Designation</label>
                <input
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Deputy Secretary"
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                />
              </div>
              <div>
                <label className="ribbon-label">Department</label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Revenue Department"
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={savingProfile}
                className="h-10 px-4 bg-[var(--gov-blue)] text-white rounded font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Save profile
              </button>
            </div>
          </form>

          {/* Password */}
          <form onSubmit={changePassword} className="official-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-4 w-4 text-[var(--gov-blue)]" />
              <h2 className="font-serif text-lg font-semibold text-[var(--gov-blue-deep)]">
                Change Password
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="ribbon-label">New password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  minLength={8}
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                />
              </div>
              <div>
                <label className="ribbon-label">Confirm password</label>
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  minLength={8}
                  className="w-full mt-1 h-10 px-3 border border-border rounded bg-background text-sm"
                />
              </div>
              <button
                disabled={savingPwd}
                className="h-10 px-4 bg-[var(--gov-red)] text-white rounded font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                {savingPwd && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </div>
          </form>

          {/* Roles & session */}
          <div className="official-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-[var(--gov-blue)]" />
              <h2 className="font-serif text-lg font-semibold text-[var(--gov-blue-deep)]">
                Roles & Session
              </h2>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <div className="ribbon-label">Assigned roles</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">No roles assigned</span>
                  )}
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="text-[11px] px-2 py-0.5 rounded bg-[var(--gov-blue)]/10 text-[var(--gov-blue-deep)] font-semibold"
                    >
                      {ROLE_LABEL[r]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                Role changes are managed by the Super Admin via Users & Roles. All access is
                audit-logged. Sign out from the top-right menu to end your session.
              </div>
            </div>
          </div>
        </div>
      </div>
    </GovLayout>
  );
}
