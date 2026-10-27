VCE Latin Trainer with Supabase login and cross-device progress sync

1. Open supabase-config.js and replace its two placeholders with YOUR Supabase Project URL and publishable key. NEVER use secret/service_role keys.
2. In Supabase SQL Editor run the SQL below (once).
3. Upload all files in this folder to the ROOT of your GitHub Pages repository and enable Pages from main/(root).
4. Open site, create account or sign in. For a private-only account, disable new public signups in Supabase after setting yours up.
5. If you already have saved progress, use the local-upload prompt on first sign-in, or Restore Progress using your JSON backup. Use Backup Progress regularly.

SQL:
create table if not exists public.latin_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 progress jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.latin_progress enable row level security;
grant select, insert, update on public.latin_progress to authenticated;
create policy "Read own progress" on public.latin_progress for select to authenticated using ((select auth.uid())=user_id);
create policy "Insert own progress" on public.latin_progress for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Update own progress" on public.latin_progress for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

Important: hosted app code and embedded flashcards are PUBLIC on ordinary GitHub Pages. Study progress is protected by database RLS. Manual backups are recommended and do not upload secrets. Only use one device at a time; concurrent edits can conflict.
