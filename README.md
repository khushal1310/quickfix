# QuickFix - Local Service Marketplace Platform

QuickFix is a production-ready, premium service marketplace platform connecting customers with background-verified local service providers in real-time. Features include dynamic request creation, image uploads, browser-based geolocations, real-time accepted provider comparisons (hiding contact details), one-click matching, chat rooms, wallet ledger holds, disputes, and administrators panel.

---

## ⚡ Zero-Database Localhost Mode (Default)
To allow you to preview and test the complete application instantly on `localhost` without setting up a Supabase account or configuring tables/keys, the codebase has a **built-in local database simulator**.

* **Auto-Provisioning**: Running `npm run dev` will automatically detect the absence of env keys, create a local JSON database file at `supabase/db.json`, and seed it with categories and mock accounts.
* **Pre-Seeded Mock Accounts** (Password: `password123`):
  * **Admin**: Mobile number `9999999999`
  * **Customer**: Mobile number `1111111111`
  * **Provider**: Mobile number `2222222222`

---

## Technical Stack
* **Frontend**: Next.js 15, TypeScript, Tailwind CSS (v4), Framer Motion, Zustand (Auth & global session), TanStack Query.
* **Backend**: Next.js API Routes (Serverless handlers), BCryptJS (Password hashing), Jose (Custom JWT signing for Supabase client bypass).
* **Database & Services**: Supabase PostgreSQL, Storage, Realtime, Row Level Security (RLS) policies (Supported in online mode).
* **DevOps**: Docker, Docker Compose, Vercel ready.

---

## Local Setup & Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Offline Mode (No Database Setup Needed)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application immediately. Log in using one of the pre-seeded accounts above.

---

## 🌐 Transitioning to Online Mode (Supabase Integration)
If you decide to connect a real production database:
1. Create a project at [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and execute the tables schema in [`supabase/schema.sql`](file:///Users/tittu/qfexample/supabase/schema.sql) followed by [`supabase/rls.sql`](file:///Users/tittu/qfexample/supabase/rls.sql).
3. Create four storage buckets in Supabase and mark them **Public**:
   * `profile-images`
   * `request-images`
   * `chat-images`
   * `dispute-images`
4. Add your project credentials to a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_JWT_SECRET=your-supabase-jwt-secret-key
   ```
5. Seed data to your cloud database:
   ```bash
   npm run seed
   ```
6. Run `npm run dev` again, and the mock database will automatically deactivate, routing all operations to your live Supabase project!
