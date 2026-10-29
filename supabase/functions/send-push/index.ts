import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "POST required" }, { status: 405, headers: cors });
  const auth = req.headers.get("Authorization");
  if (!auth) return Response.json({ error: "Sign-in required" }, { status: 401, headers: cors });

  const env = (name: string) => Deno.env.get(name);
  const url = env("SUPABASE_URL"), anon = env("SUPABASE_ANON_KEY"), serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const pub = env("VAPID_PUBLIC_KEY"), priv = env("VAPID_PRIVATE_KEY"), subject = env("VAPID_SUBJECT");
  if (!url || !anon || !serviceKey || !pub || !priv || !subject) return Response.json({ error: "Push secrets are not configured" }, { status: 503, headers: cors });

  const db = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
  const payload = await req.json().catch(() => ({}));
  if (typeof payload.title !== "string" || typeof payload.body !== "string") return Response.json({ error: "title and body are required" }, { status: 400, headers: cors });

  // For team updates, only send to current team members. For personal/test pushes, send only to caller.
  let recipientIds = [user.id];
  if (typeof payload.team_id === "string") {
    const { data: membership, error: memberError } = await db.from("team_members").select("team_id").eq("team_id", payload.team_id).eq("user_id", user.id).maybeSingle();
    if (memberError || !membership) return Response.json({ error: "You are not a member of this team" }, { status: 403, headers: cors });
    const { data: members, error: listError } = await db.from("team_members").select("user_id").eq("team_id", payload.team_id);
    if (listError) return Response.json({ error: "Could not load team members" }, { status: 500, headers: cors });
    recipientIds = [...new Set((members || []).map((m) => m.user_id))].filter((id) => id !== user.id);
  }
  if (!recipientIds.length) return Response.json({ sent: 0, message: "No other team members to notify yet" }, { headers: cors });

  // Use the service-role client only server-side to read recipients' subscriptions;
  // the user's normal RLS policy correctly limits them to their own subscriptions.
  const { data: subscriptions, error: subError } = await admin.from("push_subscriptions").select("subscription,user_id,endpoint").in("user_id", recipientIds);
  if (subError) return Response.json({ error: "Could not load push subscriptions" }, { status: 500, headers: cors });
  webpush.setVapidDetails(subject, pub, priv);
  const results = await Promise.all((subscriptions || []).map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({
        title: payload.title.slice(0, 120),
        body: payload.body.slice(0, 500),
        url: typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/",
        tag: "campus-hub"
      }));
      return { ok: true };
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      }
      return { ok: false };
    }
  }));
  return Response.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length }, { headers: cors });
});
