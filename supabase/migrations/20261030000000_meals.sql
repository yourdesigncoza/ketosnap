-- One row per logged meal, mirrored from the phone's IndexedDB. The phone is the working copy;
-- this is the backup and what a second device (or a reviewer with the secret key) reads.
create table public.meals (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  slot text not null check (slot in ('0', '1', '2', 'extra')),  -- breakfast, lunch, dinner, extra
  auto boolean not null default false,
  created bigint not null,               -- ms since epoch, phone clock
  updated bigint not null,               -- ms since epoch, phone clock; newest wins when syncing
  text text not null default '',
  photo text,                            -- path in the photos bucket
  status text not null,
  result jsonb,
  error text not null default '',
  deleted boolean not null default false
);
create index meals_user_updated on public.meals (user_id, updated);

alter table public.meals enable row level security;
create policy "own meals" on public.meals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.meals to authenticated;

-- Meal photos, stored as <user id>/<meal id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 3145728, array['image/jpeg']);
create policy "own photos" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
