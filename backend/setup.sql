-- TravelSpend + Encargos de Irlanda
-- Primero crea las dos cuentas de Supabase Authentication.
-- Instala este script en SQL Editor y después ejecuta assign-users.sql.
-- Nunca pongas claves secretas o contraseñas en GitHub.

begin;
create table if not exists public.app_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','irlanda')),
  created_at timestamptz not null default now()
);
create unique index if not exists app_access_one_owner on public.app_access(role) where role='owner';
create unique index if not exists app_access_one_irlanda on public.app_access(role) where role='irlanda';
alter table public.app_access enable row level security;
revoke all on public.app_access from anon, authenticated;
grant select on public.app_access to authenticated;
drop policy if exists "user can read own role" on public.app_access;
create policy "user can read own role" on public.app_access for select to authenticated using (user_id=(select auth.uid()));

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create or replace function private.has_role(wanted text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.app_access
  where user_id = (select auth.uid()) and role = wanted
) $$;
revoke all on function private.has_role(text) from public, anon;
grant execute on function private.has_role(text) to authenticated;
create or replace function private.can_view_irlanda()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.app_access
  where user_id = (select auth.uid()) and role in ('owner','irlanda')
) $$;
revoke all on function private.can_view_irlanda() from public, anon;
grant execute on function private.can_view_irlanda() to authenticated;

create table if not exists public.personal_expenses (
  id text primary key check(length(id) between 3 and 110),
  user_id uuid not null references auth.users(id),
  merchant text not null check(length(merchant) between 1 and 80),
  amount_cents integer not null check(amount_cents<>0 and amount_cents between -100000000 and 100000000),
  category text not null check(category in ('shopping','food','transport','groceries','fun','kids','hotel','other')),
  spent_on date not null,
  note text not null default '' check(length(note)<=300),
  payment text not null check(payment in ('card','cash','other')),
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists personal_expenses_user_spent on public.personal_expenses(user_id,spent_on desc);
alter table public.personal_expenses enable row level security;
revoke all on public.personal_expenses from anon;
grant select,insert,update,delete on public.personal_expenses to authenticated;
drop policy if exists "owner reads personal" on public.personal_expenses;
drop policy if exists "owner inserts personal" on public.personal_expenses;
drop policy if exists "owner updates personal" on public.personal_expenses;
drop policy if exists "owner deletes personal" on public.personal_expenses;
create policy "owner reads personal" on public.personal_expenses for select to authenticated
using (private.has_role('owner') and user_id=(select auth.uid()));
create policy "owner inserts personal" on public.personal_expenses for insert to authenticated
with check (private.has_role('owner') and user_id=(select auth.uid()));
create policy "owner updates personal" on public.personal_expenses for update to authenticated
using (private.has_role('owner') and user_id=(select auth.uid()))
with check (private.has_role('owner') and user_id=(select auth.uid()));
create policy "owner deletes personal" on public.personal_expenses for delete to authenticated
using (private.has_role('owner') and user_id=(select auth.uid()));

create table if not exists public.irlanda_wishlist (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(trim(title)) between 1 and 120),
  details text not null default '' check(length(details)<=500),
  size text not null default '' check(length(size)<=60),
  color text not null default '' check(length(color)<=60),
  reference_url text not null default '' check(length(reference_url)<=600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.irlanda_wishlist enable row level security;
revoke all on public.irlanda_wishlist from anon;
grant select,insert,update,delete on public.irlanda_wishlist to authenticated;
drop policy if exists "members read wishlist" on public.irlanda_wishlist;
drop policy if exists "members add wishlist" on public.irlanda_wishlist;
drop policy if exists "members edit wishlist" on public.irlanda_wishlist;
drop policy if exists "members delete wishlist" on public.irlanda_wishlist;
create policy "members read wishlist" on public.irlanda_wishlist for select to authenticated using(private.can_view_irlanda());
create policy "members add wishlist" on public.irlanda_wishlist for insert to authenticated with check(private.can_view_irlanda());
create policy "members edit wishlist" on public.irlanda_wishlist for update to authenticated using(private.can_view_irlanda()) with check(private.can_view_irlanda());
create policy "members delete wishlist" on public.irlanda_wishlist for delete to authenticated using(private.can_view_irlanda());

create table if not exists public.irlanda_purchases (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid references public.irlanda_wishlist(id) on delete set null,
  merchant text not null check(length(trim(merchant)) between 1 and 100),
  label text not null check(length(trim(label)) between 1 and 150),
  amount_cents integer not null check(amount_cents<>0 and amount_cents between -100000000 and 100000000),
  purchased_on date not null default current_date,
  notes text not null default '' check(length(notes)<=500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.irlanda_purchases enable row level security;
revoke all on public.irlanda_purchases from anon;
grant select,insert,update,delete on public.irlanda_purchases to authenticated;
drop policy if exists "members read purchases" on public.irlanda_purchases;
drop policy if exists "owner adds purchases" on public.irlanda_purchases;
drop policy if exists "owner edits purchases" on public.irlanda_purchases;
drop policy if exists "owner deletes purchases" on public.irlanda_purchases;
create policy "members read purchases" on public.irlanda_purchases for select to authenticated using(private.can_view_irlanda());
create policy "owner adds purchases" on public.irlanda_purchases for insert to authenticated with check(private.has_role('owner'));
create policy "owner edits purchases" on public.irlanda_purchases for update to authenticated using(private.has_role('owner')) with check(private.has_role('owner'));
create policy "owner deletes purchases" on public.irlanda_purchases for delete to authenticated using(private.has_role('owner'));

create table if not exists public.irlanda_payments (
  id uuid primary key default gen_random_uuid(),
  amount_cents integer not null check(amount_cents>0 and amount_cents<=100000000),
  paid_on date not null default current_date,
  method text not null check(method in ('transfer','cash','other')),
  note text not null default '' check(length(note)<=300),
  created_at timestamptz not null default now()
);
alter table public.irlanda_payments enable row level security;
revoke all on public.irlanda_payments from anon;
grant select,insert,update,delete on public.irlanda_payments to authenticated;
drop policy if exists "members read payments" on public.irlanda_payments;
drop policy if exists "owner adds payments" on public.irlanda_payments;
drop policy if exists "owner edits payments" on public.irlanda_payments;
drop policy if exists "owner deletes payments" on public.irlanda_payments;
create policy "members read payments" on public.irlanda_payments for select to authenticated using(private.can_view_irlanda());
create policy "owner adds payments" on public.irlanda_payments for insert to authenticated with check(private.has_role('owner'));
create policy "owner edits payments" on public.irlanda_payments for update to authenticated using(private.has_role('owner')) with check(private.has_role('owner'));
create policy "owner deletes payments" on public.irlanda_payments for delete to authenticated using(private.has_role('owner'));

create table if not exists public.trip_attachments (
  id uuid primary key default gen_random_uuid(),
  scope text not null check(scope in ('personal','wishlist','irlanda')),
  record_id text not null check(length(record_id) between 3 and 110),
  kind text not null check(kind in ('receipt','product','reference')),
  storage_path text not null unique check(length(storage_path)<450),
  created_at timestamptz not null default now(),
  constraint attachment_path_match check(storage_path like scope || '/' || record_id || '/%'),
  constraint attachment_kind_match check ((scope='wishlist' and kind='reference') or (scope<>'wishlist' and kind in ('receipt','product')))
);
create index if not exists trip_attachments_record on public.trip_attachments(scope,record_id);
alter table public.trip_attachments enable row level security;
revoke all on public.trip_attachments from anon;
grant select,insert,delete on public.trip_attachments to authenticated;
drop policy if exists "attachments read with scope" on public.trip_attachments;
drop policy if exists "attachments write with scope" on public.trip_attachments;
drop policy if exists "attachments delete with scope" on public.trip_attachments;
create policy "attachments read with scope" on public.trip_attachments for select to authenticated
using ((scope='personal' and private.has_role('owner')) or (scope in ('wishlist','irlanda') and private.can_view_irlanda()));
create policy "attachments write with scope" on public.trip_attachments for insert to authenticated
with check ((scope in ('personal','irlanda') and private.has_role('owner')) or (scope='wishlist' and private.can_view_irlanda()));
create policy "attachments delete with scope" on public.trip_attachments for delete to authenticated
using ((scope in ('personal','irlanda') and private.has_role('owner')) or (scope='wishlist' and private.can_view_irlanda()));

-- Storage privado, imágenes hasta 6 MB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('travelspend-files','travelspend-files',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=6291456,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "travelspend images read" on storage.objects;
drop policy if exists "travelspend images insert" on storage.objects;
drop policy if exists "travelspend images delete" on storage.objects;
create policy "travelspend images read" on storage.objects for select to authenticated using (
 bucket_id='travelspend-files' and
 ((split_part(name,'/',1)='personal' and private.has_role('owner'))
  or (split_part(name,'/',1) in ('wishlist','irlanda') and private.can_view_irlanda()))
);
create policy "travelspend images insert" on storage.objects for insert to authenticated with check (
 bucket_id='travelspend-files' and
 ((split_part(name,'/',1) in ('personal','irlanda') and private.has_role('owner'))
  or (split_part(name,'/',1)='wishlist' and private.can_view_irlanda()))
);
create policy "travelspend images delete" on storage.objects for delete to authenticated using (
 bucket_id='travelspend-files' and
 ((split_part(name,'/',1) in ('personal','irlanda') and private.has_role('owner'))
  or (split_part(name,'/',1)='wishlist' and private.can_view_irlanda()))
);

-- Realtime: asegura que las tablas estén presentes en la publicación.
do $$
declare t text;
begin
  foreach t in array array['personal_expenses','irlanda_wishlist','irlanda_purchases','irlanda_payments','trip_attachments'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
commit;
