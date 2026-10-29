-- Campus Hub Pro schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  job_title text not null default '',
  bio text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_created_idx on public.tasks(user_id, created_at desc);
create index if not exists tasks_team_created_idx on public.tasks(team_id, created_at desc);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null check (char_length(event_name) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_team_member(target_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.team_members where team_id = target_team and user_id = auth.uid());
$$;

create or replace function public.join_team_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select id into target_id from public.teams where invite_code = upper(trim(code));
  if target_id is null then raise exception 'Invite code not found'; end if;
  insert into public.team_members(team_id, user_id, role) values(target_id, auth.uid(), 'member')
  on conflict (team_id, user_id) do nothing;
  return target_id;
end; $$;
grant execute on function public.join_team_by_code(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.app_events enable row level security;

drop policy if exists "Profiles readable by signed-in users" on public.profiles;
create policy "Profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "Members can read teams" on public.teams;
create policy "Members can read teams" on public.teams for select to authenticated using (public.is_team_member(id));
drop policy if exists "Signed-in users create teams" on public.teams;
create policy "Signed-in users create teams" on public.teams for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Owners update teams" on public.teams;
create policy "Owners update teams" on public.teams for update to authenticated using (exists(select 1 from public.team_members m where m.team_id = id and m.user_id = auth.uid() and m.role = 'owner')) with check (exists(select 1 from public.team_members m where m.team_id = id and m.user_id = auth.uid() and m.role = 'owner'));

drop policy if exists "Members can read team membership" on public.team_members;
create policy "Members can read team membership" on public.team_members for select to authenticated using (public.is_team_member(team_id));
drop policy if exists "Users can add themselves to teams" on public.team_members;
create policy "Users can add themselves to teams" on public.team_members for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Owners manage membership" on public.team_members;
create policy "Owners manage membership" on public.team_members for delete to authenticated using (exists(select 1 from public.team_members m where m.team_id = team_id and m.user_id = auth.uid() and m.role = 'owner') or auth.uid() = user_id);

drop policy if exists "Read own or team tasks" on public.tasks;
create policy "Read own or team tasks" on public.tasks for select to authenticated using (user_id = auth.uid() or (team_id is not null and public.is_team_member(team_id)));
drop policy if exists "Create own or member team tasks" on public.tasks;
create policy "Create own or member team tasks" on public.tasks for insert to authenticated with check (user_id = auth.uid() and (team_id is null or public.is_team_member(team_id)));
drop policy if exists "Update own or member team tasks" on public.tasks;
create policy "Update own or member team tasks" on public.tasks for update to authenticated using (user_id = auth.uid() or (team_id is not null and public.is_team_member(team_id))) with check (user_id = auth.uid() or (team_id is not null and public.is_team_member(team_id)));
drop policy if exists "Delete own or member team tasks" on public.tasks;
create policy "Delete own or member team tasks" on public.tasks for delete to authenticated using (user_id = auth.uid() or (team_id is not null and public.is_team_member(team_id)));

drop policy if exists "Read comments on visible tasks" on public.task_comments;
create policy "Read comments on visible tasks" on public.task_comments for select to authenticated using (exists(select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or (t.team_id is not null and public.is_team_member(t.team_id)))));
drop policy if exists "Create comments on visible tasks" on public.task_comments;
create policy "Create comments on visible tasks" on public.task_comments for insert to authenticated with check (user_id = auth.uid() and exists(select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or (t.team_id is not null and public.is_team_member(t.team_id)))));

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users insert own analytics" on public.app_events;
create policy "Users insert own analytics" on public.app_events for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users read own analytics" on public.app_events;
create policy "Users read own analytics" on public.app_events for select to authenticated using (auth.uid() = user_id);

-- Enable realtime for tasks and comments.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='task_comments') then
    alter publication supabase_realtime add table public.task_comments;
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- Optional private attachments bucket.
insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments','task-attachments',false,5242880)
on conflict (id) do update set public=false, file_size_limit=5242880;
drop policy if exists "Users upload their own attachments" on storage.objects;
create policy "Users upload their own attachments" on storage.objects for insert to authenticated with check (bucket_id='task-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users read their own attachments" on storage.objects;
create policy "Users read their own attachments" on storage.objects for select to authenticated using (bucket_id='task-attachments' and (storage.foldername(name))[1]=auth.uid()::text);
