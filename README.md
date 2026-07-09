# Riser Partner Portal

Multi-product partner management platform for Riser Technologies.
Partner portal (`/portal`) + Riser Admin Console (`/admin`) + Mira AI assistant.

Stack: Next.js 14 (App Router, JS) · Supabase (auth, Postgres, storage, edge functions) · Tailwind · Vercel.

## Setup

1. **Database** — in your new Supabase project's SQL Editor, run in order:
   - `01-riser-portal-core-schema.sql`
   - `02-riser-portal-storage.sql` (if storage policies fail with "must be owner",
     create them in Dashboard → Storage → Policies using the expressions in the file)
   - `riser-partner-portal-schema-v1.1-integrations.sql`
   - `supabase/03-app-functions.sql`

2. **Env** — copy `.env.example` to `.env.local`, fill in your project URL + anon key.

3. **Run** — `npm install && npm run dev`

4. **Make yourself admin** — sign up once via `/apply` OR create a user in
   Supabase Auth dashboard, then:
   ```sql
   insert into portal_users (id, role, full_name, email)
   values ('YOUR-AUTH-USER-UUID', 'riser_admin', 'Abhishek Malviya', 'you@risertechnologies.net')
   on conflict (id) do update set role = 'riser_admin', partner_id = null;
   ```

5. **Mira** —
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy mira-chat
   ```

6. **Deploy** — push to GitHub, import in Vercel, add the two env vars,
   point `partners.risertechnologies.net` at it (Cloudflare: DNS only / orange cloud OFF).

## What's included (v1)
- Public partner application with mandatory KYC uploads (`/apply`)
- Review gate: applicants see "under review" until approved
- Partner portal: dashboard, products & pricing (tier + overrides, pricing_paused aware),
  quote builder with automatic below-floor approval routing, collateral with signed-URL
  downloads + download tracking, ticketing, company & documents with re-upload
- Admin console: overview with action queue, partners list + detail, KYC verify/reject
  with expiry capture, tier & status controls, product visibility toggles, quote
  approvals, ticket management
- Mira floating assistant on both surfaces (RLS-scoped — she only sees what the
  signed-in user can see)

## Not yet built (next iterations)
- Email notifications (approval, ticket replies, expiry reminders) — wire TurboSMTP
  via an edge function like heySynk
- Collateral upload UI for admin (insert rows + upload to `collateral` bucket manually for now)
- Per-partner pricing override + product visibility UI (tables exist, edit via SQL for now)
- Provisioning worker (`provision` edge function + pg_cron) for SpacioHub/SWO/Lumen —
  schema and job queue are ready
- Document expiry cron (auto set expiring/expired + pricing_paused)
