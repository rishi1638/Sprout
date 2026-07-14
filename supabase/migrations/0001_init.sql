-- ============================================================
-- Daycare Management Tool — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

-- ---------- Enums ----------
create type public.user_role as enum ('admin', 'staff', 'parent');
create type public.enrollment_status as enum ('enrolled', 'waitlisted', 'withdrawn');
create type public.activity_type as enum ('meal', 'nap', 'diaper', 'bathroom', 'note', 'photo');
create type public.invoice_status as enum ('unpaid', 'paid', 'void');
create type public.billing_interval as enum ('weekly', 'monthly');

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'parent',
  phone text,
  avatar_url text,
  quick_pin text,
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  dob date not null,
  enrollment_status public.enrollment_status not null default 'enrolled',
  allergies text[] not null default '{}',
  immunizations jsonb not null default '[]'::jsonb,
  medical_notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  name text not null,
  relationship text not null,
  phone text not null,
  priority int not null default 1 check (priority > 0)
);

create table public.guardianships (
  child_id uuid not null references public.children (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  relationship text not null default 'guardian',
  is_primary boolean not null default false,
  primary key (child_id, parent_id)
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  capacity int not null check (capacity > 0),
  min_age_months int,
  max_age_months int,
  created_at timestamptz not null default now()
);

create table public.staff_assignments (
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete cascade,
  primary key (classroom_id, staff_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  start_date date not null default current_date,
  end_date date
);
-- one active classroom per child
create unique index enrollments_one_active_per_child
  on public.enrollments (child_id) where (end_date is null);
create index enrollments_classroom_idx on public.enrollments (classroom_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  staff_id uuid not null references public.profiles (id),
  type public.activity_type not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  note text,
  photo_path text,
  created_at timestamptz not null default now()
);
create index activities_feed_idx on public.activities (child_id, occurred_at desc);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_in_by uuid not null references public.profiles (id),
  check_out_at timestamptz,
  check_out_by uuid references public.profiles (id)
);
-- one open attendance record per child
create unique index attendance_one_open_per_child
  on public.attendance (child_id) where (check_out_at is null);
create index attendance_classroom_idx on public.attendance (classroom_id, check_in_at desc);

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  amount_cents int not null check (amount_cents >= 0),
  interval public.billing_interval not null default 'monthly',
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.child_plans (
  child_id uuid not null references public.children (id) on delete cascade,
  plan_id uuid not null references public.billing_plans (id) on delete cascade,
  start_date date not null default current_date,
  primary key (child_id, plan_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  plan_id uuid references public.billing_plans (id) on delete set null,
  period_start date not null,
  period_end date not null,
  amount_cents int not null check (amount_cents >= 0),
  status public.invoice_status not null default 'unpaid',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (parent_id, child_id, period_start)
);
create index invoices_parent_idx on public.invoices (parent_id, issued_at desc);

-- ---------- Profile bootstrap trigger ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Capacity enforcement trigger ----------
create or replace function public.enforce_classroom_capacity()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  current_count int;
  max_capacity int;
begin
  select count(*) into current_count
  from public.enrollments
  where classroom_id = new.classroom_id and end_date is null;

  select capacity into max_capacity
  from public.classrooms where id = new.classroom_id;

  if current_count >= max_capacity then
    raise exception 'Classroom is at capacity (% children)', max_capacity;
  end if;
  return new;
end;
$$;

create trigger enrollments_capacity_check
  before insert on public.enrollments
  for each row when (new.end_date is null)
  execute function public.enforce_classroom_capacity();

-- ---------- RLS helper functions (security definer avoids recursion) ----------
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_guardian_of(target_child uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.guardianships
    where child_id = target_child and parent_id = auth.uid()
  );
$$;

create or replace function public.staff_in_classroom(target_classroom uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.staff_assignments
    where classroom_id = target_classroom and staff_id = auth.uid()
  );
$$;

create or replace function public.staff_can_access_child(target_child uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.staff_assignments sa on sa.classroom_id = e.classroom_id
    where e.child_id = target_child
      and e.end_date is null
      and sa.staff_id = auth.uid()
  );
$$;

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.guardianships enable row level security;
alter table public.classrooms enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.enrollments enable row level security;
alter table public.activities enable row level security;
alter table public.attendance enable row level security;
alter table public.billing_plans enable row level security;
alter table public.child_plans enable row level security;
alter table public.invoices enable row level security;

-- profiles
create policy "profiles: self read" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: staff/admin read all" on public.profiles
  for select using (public.auth_role() in ('admin', 'staff'));
create policy "profiles: self update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = public.auth_role());
create policy "profiles: admin all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- children
create policy "children: admin all" on public.children
  for all using (public.is_admin()) with check (public.is_admin());
create policy "children: guardian read" on public.children
  for select using (public.is_guardian_of(id));
create policy "children: assigned staff read" on public.children
  for select using (public.staff_can_access_child(id));

-- emergency_contacts
create policy "contacts: admin all" on public.emergency_contacts
  for all using (public.is_admin()) with check (public.is_admin());
create policy "contacts: guardian read" on public.emergency_contacts
  for select using (public.is_guardian_of(child_id));
create policy "contacts: assigned staff read" on public.emergency_contacts
  for select using (public.staff_can_access_child(child_id));

-- guardianships
create policy "guardianships: admin all" on public.guardianships
  for all using (public.is_admin()) with check (public.is_admin());
create policy "guardianships: own read" on public.guardianships
  for select using (parent_id = auth.uid());
create policy "guardianships: assigned staff read" on public.guardianships
  for select using (public.staff_can_access_child(child_id));

-- classrooms
create policy "classrooms: admin all" on public.classrooms
  for all using (public.is_admin()) with check (public.is_admin());
create policy "classrooms: staff read" on public.classrooms
  for select using (public.auth_role() = 'staff');
create policy "classrooms: guardian read enrolled" on public.classrooms
  for select using (exists (
    select 1 from public.enrollments e
    where e.classroom_id = classrooms.id
      and e.end_date is null
      and public.is_guardian_of(e.child_id)
  ));

-- staff_assignments
create policy "staff_assignments: admin all" on public.staff_assignments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "staff_assignments: staff read" on public.staff_assignments
  for select using (public.auth_role() = 'staff');

-- enrollments
create policy "enrollments: admin all" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "enrollments: guardian read" on public.enrollments
  for select using (public.is_guardian_of(child_id));
create policy "enrollments: staff read own rooms" on public.enrollments
  for select using (public.staff_in_classroom(classroom_id));

-- activities
create policy "activities: admin all" on public.activities
  for all using (public.is_admin()) with check (public.is_admin());
create policy "activities: guardian read" on public.activities
  for select using (public.is_guardian_of(child_id));
create policy "activities: staff read own rooms" on public.activities
  for select using (public.staff_can_access_child(child_id)); 



create policy "activities: staff insert own rooms" on public.activities
  for insert with check (
    public.auth_role() = 'staff'
    and staff_id = auth.uid()
    and public.staff_can_access_child(child_id)
  );
create policy "activities: staff update own logs" on public.activities
  for update using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

-- attendance (staff-only check-in/out per policy decision)
create policy "attendance: admin all" on public.attendance
  for all using (public.is_admin()) with check (public.is_admin());
create policy "attendance: guardian read" on public.attendance
  for select using (public.is_guardian_of(child_id));
create policy "attendance: staff read own rooms" on public.attendance
  for select using (public.staff_in_classroom(classroom_id));
create policy "attendance: staff check-in" on public.attendance
  for insert with check (
    public.auth_role() = 'staff'
    and check_in_by = auth.uid()
    and public.staff_in_classroom(classroom_id)
  );
create policy "attendance: staff check-out" on public.attendance
  for update using (public.auth_role() = 'staff' and public.staff_in_classroom(classroom_id))
  with check (check_out_by = auth.uid());

-- billing_plans
create policy "billing_plans: admin all" on public.billing_plans
  for all using (public.is_admin()) with check (public.is_admin());
create policy "billing_plans: authenticated read active" on public.billing_plans
  for select using (auth.uid() is not null and active);

-- child_plans
create policy "child_plans: admin all" on public.child_plans
  for all using (public.is_admin()) with check (public.is_admin());
create policy "child_plans: guardian read" on public.child_plans
  for select using (public.is_guardian_of(child_id));

-- invoices
create policy "invoices: admin all" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());
create policy "invoices: parent read own" on public.invoices
  for select using (parent_id = auth.uid());

-- ---------- Live ratio view ----------
create or replace view public.classroom_ratios
with (security_invoker = true) as
select
  c.id as classroom_id,
  c.name,
  c.capacity,
  (select count(*) from public.attendance a
    where a.classroom_id = c.id and a.check_out_at is null) as children_present,
  (select count(*) from public.staff_assignments sa
    where sa.classroom_id = c.id) as staff_assigned,
  (select count(*) from public.enrollments e
    where e.classroom_id = c.id and e.end_date is null) as enrolled_count
from public.classrooms c;

-- ---------- Monthly invoice generation (idempotent) ----------
create or replace function public.generate_monthly_invoices(target_month date default date_trunc('month', current_date)::date)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  inserted_count int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate invoices';
  end if;

  with candidates as (
    select
      g.parent_id,
      cp.child_id,
      cp.plan_id,
      date_trunc('month', target_month)::date as period_start,
      (date_trunc('month', target_month) + interval '1 month - 1 day')::date as period_end,
      case bp.interval
        when 'weekly' then bp.amount_cents * 4
        else bp.amount_cents
      end as amount_cents
    from public.child_plans cp
    join public.billing_plans bp on bp.id = cp.plan_id and bp.active
    join public.guardianships g on g.child_id = cp.child_id and g.is_primary
    join public.children ch on ch.id = cp.child_id and ch.enrollment_status = 'enrolled'
  )
  insert into public.invoices (parent_id, child_id, plan_id, period_start, period_end, amount_cents)
  select parent_id, child_id, plan_id, period_start, period_end, amount_cents
  from candidates
  on conflict (parent_id, child_id, period_start) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

-- ---------- Realtime ----------
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.attendance;

-- ---------- Storage: activity photos ----------
insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', false)
on conflict (id) do nothing;

create policy "photos: staff/admin upload" on storage.objects
  for insert with check (
    bucket_id = 'activity-photos'
    and public.auth_role() in ('admin', 'staff')
  );

create policy "photos: read if activity visible" on storage.objects
  for select using (
    bucket_id = 'activity-photos'
    and exists (
      select 1 from public.activities a
      where a.photo_path = storage.objects.name
        and (
          public.is_admin()
          or public.is_guardian_of(a.child_id)
          or public.staff_can_access_child(a.child_id)
        )
    )
  );

-- ============================================================
-- After running this migration, create your first admin user:
--   1. Sign up a user via the app or Supabase dashboard.
--   2. Then run:  update public.profiles set role = 'admin' where id = '<user-uuid>';
-- ============================================================
