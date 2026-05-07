-- Allow every authenticated officer/viewer to create their own uploaded case record.
drop policy if exists "cases insert" on public.cases;
create policy "cases upload insert for authenticated users"
on public.cases
for insert
to authenticated
with check (
  auth.uid() = uploaded_by
  and status = 'uploaded'::case_status
);

-- Keep post-upload case changes restricted to operational roles.
drop policy if exists "cases update" on public.cases;
create policy "cases operational update by authorised roles"
on public.cases
for update
to authenticated
using (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

-- Upload metadata records for the PDF ingestion trail.
create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  case_id uuid,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text default 'application/pdf',
  uploaded_by uuid not null,
  status text not null default 'stored',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.uploads enable row level security;

drop policy if exists "uploads read for authenticated users" on public.uploads;
create policy "uploads read for authenticated users"
on public.uploads
for select
to authenticated
using (true);

drop policy if exists "uploads create own metadata" on public.uploads;
create policy "uploads create own metadata"
on public.uploads
for insert
to authenticated
with check (auth.uid() = uploaded_by);

drop policy if exists "uploads update by uploader or authorised roles" on public.uploads;
create policy "uploads update by uploader or authorised roles"
on public.uploads
for update
to authenticated
using (
  auth.uid() = uploaded_by
  or current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  auth.uid() = uploaded_by
  or current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop trigger if exists touch_uploads_updated_at on public.uploads;
create trigger touch_uploads_updated_at
before update on public.uploads
for each row execute function public.touch_updated_at();

-- Department action plan items generated from extracted directives.
create table if not exists public.action_plans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  directive_id uuid,
  department text,
  action_text text not null,
  priority priority_level not null default 'medium',
  due_date date,
  status text not null default 'open',
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.action_plans enable row level security;

drop policy if exists "action plans read for authenticated users" on public.action_plans;
create policy "action plans read for authenticated users"
on public.action_plans
for select
to authenticated
using (true);

drop policy if exists "action plans create by authenticated users" on public.action_plans;
create policy "action plans create by authenticated users"
on public.action_plans
for insert
to authenticated
with check (created_by is null or created_by = auth.uid());

drop policy if exists "action plans update by authorised roles" on public.action_plans;
create policy "action plans update by authorised roles"
on public.action_plans
for update
to authenticated
using (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop trigger if exists touch_action_plans_updated_at on public.action_plans;
create trigger touch_action_plans_updated_at
before update on public.action_plans
for each row execute function public.touch_updated_at();

-- Verification/workflow routing entries for departments and reviewing roles.
create table if not exists public.workflow_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  department text,
  assigned_role app_role not null default 'reviewing_officer',
  assigned_to uuid,
  status text not null default 'pending',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workflow_assignments enable row level security;

drop policy if exists "workflow assignments read for authenticated users" on public.workflow_assignments;
create policy "workflow assignments read for authenticated users"
on public.workflow_assignments
for select
to authenticated
using (true);

drop policy if exists "workflow assignments create by authenticated users" on public.workflow_assignments;
create policy "workflow assignments create by authenticated users"
on public.workflow_assignments
for insert
to authenticated
with check (created_by is null or created_by = auth.uid());

drop policy if exists "workflow assignments update by authorised roles" on public.workflow_assignments;
create policy "workflow assignments update by authorised roles"
on public.workflow_assignments
for update
to authenticated
using (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop trigger if exists touch_workflow_assignments_updated_at on public.workflow_assignments;
create trigger touch_workflow_assignments_updated_at
before update on public.workflow_assignments
for each row execute function public.touch_updated_at();

-- Allow signed-in users to create their own notification records as part of workflow startup.
drop policy if exists "notif insert own" on public.notifications;
create policy "notif insert own"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid());

-- Ensure department admins can participate in generated extraction/directive workflow writes,
-- while verification field decisions remain restricted by application role checks.
drop policy if exists "fields write" on public.extracted_fields;
create policy "fields write"
on public.extracted_fields
for all
to authenticated
using (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role
  ])
)
with check (
  current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role
  ])
);