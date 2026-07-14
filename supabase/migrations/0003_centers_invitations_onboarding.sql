-- ============================================================
-- Phase 1–2: Centers, invitations, role rename (staff → ece), RLS
-- Additive evolution of 0001/0002 — safe to run on existing data.
-- ============================================================

-- ---------- Enums ----------
-- Rename educator role to match product vocabulary (admin | ece | parent)
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'user_role' and e.enumlabel = 'staff'
  ) then
    alter type public.user_role rename value 'staff' to 'ece';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = 'invitation_status') then
    create type public.invitation_status as enum ('pending', 'accepted', 'expired');
  end if;
end $$;

-- ---------- Profiles: updated_at + trigger ----------
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Centers ----------
create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  admin_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed a default center for existing deployments (idempotent)
insert into public.centers (id, name, address, admin_id)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Sprout Daycare',
  null,
  (select id from public.profiles where role = 'admin' order by created_at limit 1)
where not exists (select 1 from public.centers);

update public.centers c
set admin_id = p.id
from (
  select id from public.profiles where role = 'admin' order by created_at limit 1
) p
where c.admin_id is null and p.id is not null;

-- ---------- Classrooms: multi-tenant + instructor ----------
alter table public.classrooms
  add column if not exists center_id uuid references public.centers (id) on delete cascade,
  add column if not exists instructor_id uuid references public.profiles (id) on delete set null;

update public.classrooms
set center_id = '00000000-0000-4000-8000-000000000001'::uuid
where center_id is null;

alter table public.classrooms
  alter column center_id set not null;

-- Backfill instructor from existing staff_assignments when missing
update public.classrooms c
set instructor_id = sa.staff_id
from (
  select distinct on (classroom_id) classroom_id, staff_id
  from public.staff_assignments
  order by classroom_id, staff_id
) sa
where c.id = sa.classroom_id and c.instructor_id is null;

create index if not exists classrooms_center_idx on public.classrooms (center_id);
create index if not exists classrooms_instructor_idx on public.classrooms (instructor_id);

-- ---------- Children: optional direct classroom link ----------
alter table public.children
  add column if not exists classroom_id uuid references public.classrooms (id) on delete set null;

update public.children ch
set classroom_id = e.classroom_id
from public.enrollments e
where e.child_id = ch.id
  and e.end_date is null
  and ch.classroom_id is null;

create index if not exists children_classroom_idx on public.children (classroom_id);

-- ---------- Parent–child relationships ----------
create table if not exists public.parent_child_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

insert into public.parent_child_relationships (parent_id, child_id)
select g.parent_id, g.child_id
from public.guardianships g
on conflict (parent_id, child_id) do nothing;

create index if not exists parent_child_parent_idx on public.parent_child_relationships (parent_id);
create index if not exists parent_child_child_idx on public.parent_child_relationships (child_id);

-- Keep guardianships in sync when relationships are written (forward compatibility)
create or replace function public.sync_guardianship_from_relationship()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.guardianships (child_id, parent_id, relationship, is_primary)
  values (new.child_id, new.parent_id, 'guardian', false)
  on conflict (child_id, parent_id) do nothing;
  return new;
end;
$$;

drop trigger if exists parent_child_sync_guardianship on public.parent_child_relationships;
create trigger parent_child_sync_guardianship
  after insert on public.parent_child_relationships
  for each row execute function public.sync_guardianship_from_relationship();

-- ---------- Invitations ----------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  role public.user_role not null,
  center_id uuid not null references public.centers (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  child_id uuid references public.children (id) on delete set null,
  status public.invitation_status not null default 'pending',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists invitations_token_idx on public.invitations (token);
create index if not exists invitations_email_idx on public.invitations (lower(email));
create index if not exists invitations_status_idx on public.invitations (status);

-- ---------- Profile bootstrap trigger (auth.users → profiles) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta_role text;
  resolved_role public.user_role;
begin
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', 'parent');
  -- Accept legacy "staff" metadata during transition
  if meta_role = 'staff' then
    meta_role := 'ece';
  end if;

  begin
    resolved_role := meta_role::public.user_role;
  exception when others then
    resolved_role := 'parent';
  end;

  insert into public.profiles (id, full_name, role, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    resolved_role,
    now()
  )
  on conflict (id) do update
    set
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper functions (multi-tenant) ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_center_admin(target_center uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.centers
    where id = target_center and admin_id = auth.uid()
  ) or public.is_admin();
$$;

create or replace function public.is_classroom_instructor(target_classroom uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.classrooms
    where id = target_classroom and instructor_id = auth.uid()
  )
  or exists (
    select 1 from public.staff_assignments
    where classroom_id = target_classroom and staff_id = auth.uid()
  );
$$;

create or replace function public.is_parent_of_child(target_child uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.parent_child_relationships
    where child_id = target_child and parent_id = auth.uid()
  )
  or exists (
    select 1 from public.guardianships
    where child_id = target_child and parent_id = auth.uid()
  );
$$;

-- Update legacy helpers to treat ece + instructor_id
create or replace function public.is_guardian_of(target_child uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_parent_of_child(target_child);
$$;

create or replace function public.staff_in_classroom(target_classroom uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_classroom_instructor(target_classroom);
$$;

create or replace function public.staff_can_access_child(target_child uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.children ch
    where ch.id = target_child
      and ch.classroom_id is not null
      and public.is_classroom_instructor(ch.classroom_id)
  )
  or exists (
    select 1
    from public.enrollments e
    where e.child_id = target_child
      and e.end_date is null
      and public.is_classroom_instructor(e.classroom_id)
  );
$$;

-- ---------- RLS: enable ----------
alter table public.centers enable row level security;
alter table public.parent_child_relationships enable row level security;
alter table public.invitations enable row level security;

-- Drop & recreate policies that hard-coded 'staff'
drop policy if exists "profiles: staff/admin read all" on public.profiles;
create policy "profiles: ece/admin read all" on public.profiles
  for select using (public.auth_role() in ('admin', 'ece'));

drop policy if exists "classrooms: staff read" on public.classrooms;
drop policy if exists "classrooms: admin all" on public.classrooms;
drop policy if exists "classrooms: guardian read enrolled" on public.classrooms;
drop policy if exists "classrooms: center access" on public.classrooms;

create policy "classrooms: admin all" on public.classrooms
  for all using (public.is_center_admin(center_id)) with check (public.is_center_admin(center_id));

create policy "classrooms: instructor read/write" on public.classrooms
  for select using (instructor_id = auth.uid() or public.is_classroom_instructor(id));

create policy "classrooms: parent read enrolled" on public.classrooms
  for select using (
    exists (
      select 1 from public.children ch
      where ch.classroom_id = classrooms.id and public.is_parent_of_child(ch.id)
    )
    or exists (
      select 1 from public.enrollments e
      where e.classroom_id = classrooms.id
        and e.end_date is null
        and public.is_parent_of_child(e.child_id)
    )
  );

-- Centers: admin of center or instructor of a room in the center
drop policy if exists "centers: admin or instructor" on public.centers;
create policy "centers: admin or instructor" on public.centers
  for select using (
    admin_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.classrooms cl
      where cl.center_id = centers.id
        and (cl.instructor_id = auth.uid() or public.is_classroom_instructor(cl.id))
    )
  );

drop policy if exists "centers: admin manage" on public.centers;
create policy "centers: admin manage" on public.centers
  for all using (admin_id = auth.uid() or public.is_admin())
  with check (admin_id = auth.uid() or public.is_admin());

-- Children: admin, instructor, or linked parent
drop policy if exists "children: admin all" on public.children;
drop policy if exists "children: guardian read" on public.children;
drop policy if exists "children: assigned staff read" on public.children;

create policy "children: admin all" on public.children
  for all using (public.is_admin()) with check (public.is_admin());

create policy "children: instructor read" on public.children
  for select using (public.staff_can_access_child(id));

create policy "children: parent read via relationship" on public.children
  for select using (public.is_parent_of_child(id));

-- parent_child_relationships
drop policy if exists "pcr: admin all" on public.parent_child_relationships;
drop policy if exists "pcr: own read" on public.parent_child_relationships;
drop policy if exists "pcr: instructor read" on public.parent_child_relationships;

create policy "pcr: admin all" on public.parent_child_relationships
  for all using (public.is_admin()) with check (public.is_admin());

create policy "pcr: own read" on public.parent_child_relationships
  for select using (parent_id = auth.uid());

create policy "pcr: instructor read" on public.parent_child_relationships
  for select using (public.staff_can_access_child(child_id));

-- Invitations: no public reads; admins manage; service role bypasses RLS
drop policy if exists "invitations: admin all" on public.invitations;
drop policy if exists "invitations: no public select" on public.invitations;

create policy "invitations: admin all" on public.invitations
  for all using (public.is_admin()) with check (public.is_admin());

-- Authenticated users never get a blanket select; token lookup runs via
-- security definer RPC (service-role context from the Next.js backend).

create or replace function public.get_invitation_by_token(lookup_token text)
returns public.invitations
language plpgsql
security definer set search_path = public
as $$
declare
  invite public.invitations;
begin
  select * into invite
  from public.invitations
  where token = lookup_token
    and status = 'pending'
    and expires_at > now()
  limit 1;

  return invite;
end;
$$;

revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to authenticated, anon, service_role;

-- ---------- Legacy tables: swap staff → ece in policies ----------
drop policy if exists "staff_assignments: staff read" on public.staff_assignments;
create policy "staff_assignments: ece read" on public.staff_assignments
  for select using (public.auth_role() = 'ece');

drop policy if exists "activities: staff insert own rooms" on public.activities;
create policy "activities: ece insert own rooms" on public.activities
  for insert with check (
    public.auth_role() = 'ece'
    and staff_id = auth.uid()
    and public.staff_can_access_child(child_id)
  );

drop policy if exists "activities: staff update own logs" on public.activities;
create policy "activities: ece update own logs" on public.activities
  for update using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

drop policy if exists "attendance: staff check-in" on public.attendance;
create policy "attendance: ece check-in" on public.attendance
  for insert with check (
    public.auth_role() = 'ece'
    and check_in_by = auth.uid()
    and public.staff_in_classroom(classroom_id)
  );

drop policy if exists "attendance: staff check-out" on public.attendance;
create policy "attendance: ece check-out" on public.attendance
  for update using (public.auth_role() = 'ece' and public.staff_in_classroom(classroom_id))
  with check (check_out_by = auth.uid());

drop policy if exists "photos: staff/admin upload" on storage.objects;
create policy "photos: ece/admin upload" on storage.objects
  for insert with check (
    bucket_id = 'activity-photos'
    and public.auth_role() in ('admin', 'ece')
  );

drop policy if exists "announcements: staff read" on public.announcements;
create policy "announcements: ece read" on public.announcements
  for select using (public.auth_role() = 'ece');

drop policy if exists "events: staff read" on public.events;
create policy "events: ece read" on public.events
  for select using (public.auth_role() = 'ece');
