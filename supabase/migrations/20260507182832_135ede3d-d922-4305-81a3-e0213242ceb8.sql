create schema if not exists private;

create or replace function private.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function private.current_user_has_any_role(_roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = any(_roles)
  )
$$;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
revoke execute on function private.has_role(uuid, app_role) from public, anon;
revoke execute on function private.current_user_has_any_role(app_role[]) from public, anon;
grant execute on function private.has_role(uuid, app_role) to authenticated, service_role;
grant execute on function private.current_user_has_any_role(app_role[]) to authenticated, service_role;

-- Re-point policies to private helpers.
drop policy if exists "cases operational update by authorised roles" on public.cases;
create policy "cases operational update by authorised roles"
on public.cases
for update
to authenticated
using (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop policy if exists "dept admin" on public.departments;
create policy "dept admin"
on public.departments
for all
to authenticated
using (private.has_role(auth.uid(), 'super_admin'::app_role))
with check (private.has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "dir write" on public.directives;
create policy "dir write"
on public.directives
for all
to authenticated
using (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop policy if exists "fields write" on public.extracted_fields;
create policy "fields write"
on public.extracted_fields
for all
to authenticated
using (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role
  ])
)
with check (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role
  ])
);

drop policy if exists "profiles admin select all" on public.profiles;
create policy "profiles admin select all"
on public.profiles
for select
to authenticated
using (private.has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
on public.profiles
for select
to authenticated
using ((auth.uid() = id) or private.has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "roles admin write" on public.user_roles;
create policy "roles admin write"
on public.user_roles
for all
to authenticated
using (private.has_role(auth.uid(), 'super_admin'::app_role))
with check (private.has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "roles self read" on public.user_roles;
create policy "roles self read"
on public.user_roles
for select
to authenticated
using ((auth.uid() = user_id) or private.has_role(auth.uid(), 'super_admin'::app_role));

drop policy if exists "uploads update by uploader or authorised roles" on public.uploads;
create policy "uploads update by uploader or authorised roles"
on public.uploads
for update
to authenticated
using (
  auth.uid() = uploaded_by
  or private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  auth.uid() = uploaded_by
  or private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop policy if exists "action plans update by authorised roles" on public.action_plans;
create policy "action plans update by authorised roles"
on public.action_plans
for update
to authenticated
using (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

drop policy if exists "workflow assignments update by authorised roles" on public.workflow_assignments;
create policy "workflow assignments update by authorised roles"
on public.workflow_assignments
for update
to authenticated
using (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
)
with check (
  private.current_user_has_any_role(array[
    'legal_officer'::app_role,
    'reviewing_officer'::app_role,
    'super_admin'::app_role,
    'department_admin'::app_role
  ])
);

-- Public compatibility wrappers are non-definer and not publicly executable.
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$ select private.has_role(_user_id, _role) $$;

create or replace function public.current_user_has_any_role(_roles app_role[])
returns boolean
language sql
stable
security invoker
set search_path = public, private
as $$ select private.current_user_has_any_role(_roles) $$;

revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.current_user_has_any_role(app_role[]) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;
grant execute on function public.current_user_has_any_role(app_role[]) to authenticated, service_role;