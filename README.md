# Sprout — Daycare Management Tool

A production-ready daycare management app: multi-role auth, child & classroom management, real-time daily activity feeds, attendance with live staff ratios, and monthly invoicing.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS, Realtime, Storage) · React Hook Form + Zod · Lucide icons

## Roles

| Role | Can do |
|---|---|
| **Director (admin)** | Everything: children, guardians, classrooms, staff, plans, invoices, account creation |
| **Educator (staff)** | Log meals/naps/changes/notes/photos, take attendance for assigned rooms |
| **Parent** | Real-time feed of their children, child profiles, their invoices |

Security is enforced twice: route middleware **and** Postgres Row Level Security, so even direct API calls respect role boundaries.

## Setup (10 minutes)

### 1. Create a Supabase project
At [supabase.com](https://supabase.com) → New project. Note your **Project URL**, **anon key**, and **service_role key** (Settings → API).

### 2. Run the migration
Open the **SQL Editor** in your Supabase dashboard, paste the contents of
`supabase/migrations/0001_init.sql`, and run it. This creates all tables, triggers, RLS policies, the realtime publication, and the `activity-photos` storage bucket.

### 3. Configure environment
```bash
cp .env.example .env.local
```
Fill in the three values from step 1.

### 4. Install & run
```bash
npm install
npm run dev
```

### 5. Create your first director
1. In Supabase → Authentication → Users → **Add user** (email + password, auto-confirm).
2. In the SQL Editor:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Your Name'
   where id = '<the-user-uuid>';
   ```
3. Sign in at `http://localhost:3000`. From the **People** page you can now create educator and parent accounts inside the app.

## Typical first workflow
1. **People** → create educator + parent accounts.
2. **Children** → add children, link guardians (mark one **primary** — they receive invoices), add emergency contacts.
3. **Classrooms** → create rooms with capacity, assign educators, enroll children (capacity is enforced by the database).
4. **Billing** → create tuition plans, assign to children, tap **Generate this month's invoices** (idempotent — safe to tap twice).
5. Educators check children in on **Attendance** (live ratio pills update everywhere) and log the day on **Log**.
6. Parents watch the **feed** update in real time.

## iOS, Android & Web
Sprout is a mobile-first **Progressive Web App**:
- **iOS:** open in Safari → Share → **Add to Home Screen**. Runs standalone with the Sprout icon and safe-area support.
- **Android:** Chrome shows an **Install app** prompt automatically.
- **Web:** works in any modern browser; the layout adapts from phones (bottom tab bar) to desktop (sidebar).

## Deploy to Vercel
1. Push this repo to GitHub.
2. [vercel.com](https://vercel.com) → New Project → import the repo (Next.js is auto-detected).
3. Add the three environment variables from `.env.example`.
4. Deploy. Done — Supabase is already hosted, so there's nothing else to run.

Any Node host works too: `npm run build && npm start`.

## Notes & conventions
- **Money** is stored as integer cents; weekly plans bill as 4 weeks per monthly invoice.
- **Photos** live in a private storage bucket; the app serves them via short-lived signed URLs, and storage RLS only allows guardians/assigned staff/admins to read.
- **One active enrollment per child** and **one open attendance record per child** are enforced with partial unique indexes.
- The target child-to-staff ratio in the pill meters defaults to 5:1 (`RatioCard`'s `maxChildrenPerStaff` prop).
