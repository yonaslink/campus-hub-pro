# Campus Hub Pro

A polished team task workspace built with **Vite + Supabase**. It includes an improved dashboard, email/password auth, editable user profiles, shared teams with invite codes, task priorities and due dates, live task sync, analytics events, and Web Push notifications.

## What works

- **Auth:** Supabase email/password sign-in and sign-up.
- **Dashboard:** task totals, in-progress/completed/high-priority counts, recent tasks, quick focus.
- **Profiles:** editable display name, role and bio.
- **Teams:** create a team, share its invite code, join with a code, and create team tasks.
- **Tasks:** create, search, filter, set status/priority/due date, delete; live updates through Supabase Realtime.
- **Push:** browser permission + service worker subscription saved to Supabase; Edge Function sends personal/test pushes and team task notifications to subscribed teammates.
- **Deployment:** Vercel and Netlify configuration included.

## 1. Create and configure Supabase

1. Create a project in the Supabase dashboard.
2. Open **SQL Editor** and run the complete `supabase/schema.sql`.
3. In **Authentication → Providers**, enable Email. Set your email-confirmation preferences.
4. In **Project Settings → API**, copy the project URL and publishable key (or legacy anon key).

## 2. Run locally

```bash
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm install
npm run dev
```

Open the local URL Vite prints. `localhost` is allowed for service workers during development.

## 3. Configure Web Push

Web Push needs browser support, user permission, HTTPS in production, a service worker and VAPID keys.

1. Generate keys:
   ```bash
   npm run generate-vapid
   ```
   Copy the **public** and **private** keys from the output.
2. Put the public key in `.env`:
   ```env
   VITE_VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY
   ```
   Restart the Vite dev server after editing `.env`.
3. Set the private key only as a Supabase server secret:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_VAPID_KEY VAPID_PRIVATE_KEY=YOUR_PRIVATE_VAPID_KEY VAPID_SUBJECT=mailto:you@example.com SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   ```
   Use an email address you control. **Never** put the VAPID private key or Supabase service-role key in a `VITE_` variable or browser code.
4. Deploy the Edge Function:
   ```bash
   npx supabase functions deploy send-push
   ```
5. Sign in and click the bell/push button. Allow notifications when your browser asks.
6. Create a team task to notify subscribed teammates. To test a personal push, invoke `send-push` from the Supabase dashboard's Edge Function tester using a valid signed-in user's bearer token and:
   ```json
   {"title":"Campus Hub","body":"Push notifications are working!","url":"/"}
   ```

Push delivery depends on the browser/device, notification permission, and whether a subscription remains valid. If no other team members have push enabled, a team task will not produce a delivered push.

## 4. Deploy the frontend

### Vercel
1. Push the project to a Git repository.
2. Import it in Vercel.
3. Build command: `npm run build`; output directory: `dist`.
4. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_VAPID_PUBLIC_KEY` in Project Settings → Environment Variables.
5. Redeploy. Vercel uses the included `vercel.json` SPA rewrite.

### Netlify
1. Import the Git repository in Netlify.
2. Build command: `npm run build`; publish directory: `dist`.
3. Add the same three `VITE_` variables in Site configuration → Environment variables.
4. Deploy. `netlify.toml` includes the SPA fallback.

### Before production
- Configure Supabase Auth Site URL and allowed redirect URLs to your deployed domain.
- Enable email confirmation if appropriate.
- Review RLS policies for your exact product rules; this is a starter app, not a compliance-certified system.
- Team invite codes are bearer-style join codes; share them privately and rotate them if exposed.
- The demo Edge Function allows team members to notify other members of that team. Add rate limits and abuse monitoring before broad public use.

## Troubleshooting
- **Missing environment values:** check `.env` and restart Vite.
- **Push button says setup needed:** ensure `VITE_VAPID_PUBLIC_KEY` is set, then rebuild/redeploy.
- **No notification prompt:** browsers only allow prompts in response to a user action; check site notification settings.
- **Push works locally but not deployed:** production must use HTTPS and the VAPID public key must match the private key in Supabase secrets.
- **RLS errors:** run the complete SQL schema and verify the signed-in user's policies and team membership.
