# Deployment Runbook (Zero-Budget $0 Target)

## 1. Hosting Architecture
- **Web Application & API**: Hosted on **Vercel** (Hobby Plan / Free forever) or **Cloudflare Pages**.
- **Database**: Hosted on **Supabase** (Free Tier / PostgreSQL).

## 2. Step-by-Step Setup

### Step 1: Database Setup on Supabase
1. Create a free account on [supabase.com](https://supabase.com).
2. Create a new organization and a project: `najah-blood-campaign`.
3. Open **SQL Editor** in the Supabase Dashboard.
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql` and click **Run**.
5. Copy the following keys from **Project Settings -> API**:
   - Project URL
   - `anon` `public` key
   - `service_role` secret key

### Step 2: Deployment on Vercel
1. Push your repository to GitHub (see GitHub setup below).
2. Login to [vercel.com](https://vercel.com) and import the repository.
3. Configure the following Environment Variables in Vercel project settings:
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production URL (e.g. `https://najah-blood-drive.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`: From Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: From Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: From Supabase
   - `ADMIN_SECRET_KEY`: A secure 32+ character random string (e.g. generated via `openssl rand -hex 32`)
4. Click **Deploy**.

## 3. Free-Tier Quotas and Limitations
- **Supabase Free Tier**:
  - 500 MB database storage (sufficient for >100,000 text-only donor registrations).
  - Pauses after 7 days of inactivity (keep-alive queries or campaign activity prevents this).
- **Vercel Free Tier**:
  - 100 GB bandwidth / month.
  - Unlimited HTTPS deployments.
