# 🏒 FanVerdict

The fans are the refs. Vote on hockey's most controversial calls.

## Quick Deploy

1. Push this repo to GitHub
2. Go to vercel.com → Import repo → Deploy
3. Done — your app is live!

## Supabase Setup

Run this SQL in your Supabase SQL Editor:

```sql
create table controversies (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  type text, game text, title text, description text,
  option_a text, option_b text, official_call text,
  votes_a int default 0, votes_b int default 0,
  hot boolean default false
);
alter table controversies enable row level security;
create policy "read"   on controversies for select using (true);
create policy "vote"   on controversies for update using (true);
create policy "insert" on controversies for insert with check (true);
create policy "delete" on controversies for delete using (true);
```

## Admin

Go to your live app → click ADMIN → password is `puck2026`
Change the password in `src/App.js` line 8.
