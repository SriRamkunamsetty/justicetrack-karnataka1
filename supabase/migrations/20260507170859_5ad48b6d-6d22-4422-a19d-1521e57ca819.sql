
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;

-- Allow super admins to see all profiles (existing policy already supports this via OR has_role,
-- but keep it explicit and idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles admin select all'
  ) THEN
    CREATE POLICY "profiles admin select all" ON public.profiles
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'super_admin'::app_role));
  END IF;
END $$;
