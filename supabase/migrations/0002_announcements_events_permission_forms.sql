-- Add announcements, scheduled events, and permission form workflows.

create type if not exists public.announcement_audience as enum ('all', 'parents', 'staff');
create type if not exists public.event_audience as enum ('all', 'parents', 'staff');

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  audience public.announcement_audience not null default 'all',
  author_id uuid not null references public.profiles (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  classroom_id uuid references public.classrooms (id) on delete set null,
  audience public.event_audience not null default 'all',
  created_at timestamptz not null default now()
);

create table if not exists public.permission_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  child_id uuid not null references public.children (id) on delete cascade,
  due_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permission_signatures (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.permission_forms (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  approved boolean not null default true,
  signed_at timestamptz not null default now(),
  unique (form_id, parent_id)
);

alter table public.announcements enable row level security;
alter table public.events enable row level security;
alter table public.permission_forms enable row level security;
alter table public.permission_signatures enable row level security;

create policy "announcements: admin all" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());
create policy "announcements: staff read" on public.announcements
  for select using (public.auth_role() = 'staff');
create policy "announcements: parents read" on public.announcements
  for select using (public.auth_role() = 'parent' and audience in ('all', 'parents'));
create policy "announcements: admin insert update delete" on public.announcements
  for insert, update, delete using (public.is_admin()) with check (public.is_admin());

create policy "events: admin all" on public.events
  for all using (public.is_admin()) with check (public.is_admin());
create policy "events: staff read" on public.events
  for select using (public.auth_role() = 'staff');
create policy "events: parents read" on public.events
  for select using (public.auth_role() = 'parent' and audience in ('all', 'parents'));
create policy "events: admin insert update delete" on public.events
  for insert, update, delete using (public.is_admin()) with check (public.is_admin());

create policy "permission_forms: admin all" on public.permission_forms
  for all using (public.is_admin()) with check (public.is_admin());
create policy "permission_forms: guardian read" on public.permission_forms
  for select using (public.is_guardian_of(child_id));
create policy "permission_forms: admin insert update delete" on public.permission_forms
  for insert, update, delete using (public.is_admin()) with check (public.is_admin());

create policy "permission_signatures: admin all" on public.permission_signatures
  for all using (public.is_admin()) with check (public.is_admin());
create policy "permission_signatures: guardian read own" on public.permission_signatures
  for select using (parent_id = auth.uid());
create policy "permission_signatures: guardian sign" on public.permission_signatures
  for insert with check (parent_id = auth.uid() and exists (
    select 1 from public.guardianships g
    where g.child_id = (select child_id from public.permission_forms where id = new.form_id)
      and g.parent_id = auth.uid()
  ));
