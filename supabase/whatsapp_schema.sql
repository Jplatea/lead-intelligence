-- WhatsApp messages — one shared table for every rep's number, distinguished
-- by rep_id. Run this once in the Supabase SQL Editor (same as schema.sql).

create table if not exists whatsapp_messages (
  id text primary key,
  rep_id text not null,
  wa_id text not null,
  contact_name text,
  direction text not null, -- 'inbound' | 'outbound'
  body text not null,
  wamid text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_wa_id_idx on whatsapp_messages (wa_id);
create index if not exists whatsapp_messages_rep_id_idx on whatsapp_messages (rep_id);

alter table whatsapp_messages enable row level security;

create policy "anon full access" on whatsapp_messages
  for all using (true) with check (true);
