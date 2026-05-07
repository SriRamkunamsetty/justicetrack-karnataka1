import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "super_admin"
  | "legal_officer"
  | "reviewing_officer"
  | "department_admin"
  | "viewer";

export interface Profile {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  district: string | null;
  email: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
  hasAnyRole: (rs: AppRole[]) => boolean;
  canWrite: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeta = async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadMeta(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadMeta(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    profile,
    roles,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (session?.user) await loadMeta(session.user.id);
    },
    hasRole: (r) => roles.includes(r),
    hasAnyRole: (rs) => rs.some((r) => roles.includes(r)),
    canWrite: !!session?.user,

  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  legal_officer: "Legal Officer",
  reviewing_officer: "Reviewing Officer",
  department_admin: "Department Admin",
  viewer: "Read-only Viewer",
};