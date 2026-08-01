-- Lead Intelligence — initial schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query → Run).

create table if not exists companies (
  id text primary key,
  name text not null default '',
  type text not null default '',
  city text not null default '',
  province text not null default '',
  country text not null default '',
  postal_code text not null default '',
  address text,
  lat double precision not null,
  lng double precision not null,
  contact_name text,
  email text,
  phone text,
  brands text[] not null default '{}',
  specialties text[] not null default '{}',
  assigned_rep text not null,
  status text not null,
  alarm text not null,
  imported_type text not null,
  comments jsonb not null default '[]',
  ai_summary text,
  ai_recommendation text,
  connected_to text[],
  needs_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists mailing_contacts (
  id text primary key,
  contact_name text not null default '',
  email text not null default '',
  company_name text not null default '',
  created_at timestamptz not null default now()
);

-- RLS is on, but this app has no real per-user Supabase Auth yet (it has its
-- own separate vault-code/password gate in front of the whole site) - so for
-- now the anon key gets full access, same trust boundary as today's
-- localStorage setup. Once real Supabase Auth is wired in, tighten these to
-- check auth.uid() instead of allowing anon wholesale.
alter table companies enable row level security;
alter table mailing_contacts enable row level security;

create policy "anon full access" on companies
  for all using (true) with check (true);

create policy "anon full access" on mailing_contacts
  for all using (true) with check (true);
