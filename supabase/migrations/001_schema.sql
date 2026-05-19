-- ============================================================
-- SapaCerdas White-label Multi-Tenant Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TENANTS (each tenant = 1 client / brand)
-- ============================================================
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,           -- e.g. "klinik-sehat", "dprd-jateng"
  name text not null,                  -- display name
  plan text not null default 'starter' check (plan in ('starter','growth','pro')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PERSONAS (each tenant can have multiple AI personas)
-- ============================================================
create table personas (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,                  -- e.g. "Sari", "Pak Budi"
  tagline text,                        -- e.g. "Asisten Desa Maju"
  avatar_url text,
  primary_color text default '#2563eb',
  font_family text default 'inter',
  system_prompt text not null,
  welcome_message text not null default 'Halo! Ada yang bisa saya bantu?',
  topics_allowed text[] default '{}',  -- allowed topics
  escalation_message text default 'Untuk informasi lebih lanjut, silakan hubungi tim kami.',
  language text default 'id',
  tone text default 'friendly' check (tone in ('formal','friendly','casual')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- KNOWLEDGE BASE (documents per persona)
-- ============================================================
create table knowledge_items (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text default 'manual' check (source_type in ('manual','upload','gsheet','scrape')),
  source_url text,
  is_active boolean default true,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- RESPONSE CACHE (save AI cost ~60%)
-- ============================================================
create table response_cache (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  question_hash text not null,         -- hash of normalized question
  question_text text not null,
  answer_text text not null,
  hit_count integer default 1,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days'),
  unique(persona_id, question_hash)
);

-- ============================================================
-- CHAT SESSIONS (per end-user visit)
-- ============================================================
create table chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  visitor_id text,                     -- anonymous fingerprint
  contact_name text,
  contact_phone text,
  contact_location text,
  extra_data jsonb default '{}',
  captured_at timestamptz,             -- when contact was collected
  message_count integer default 0,
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  from_cache boolean default false,
  tokens_used integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- TENANT USERS (dashboard access)
-- ============================================================
create table tenant_users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'admin' check (role in ('owner','admin','viewer')),
  created_at timestamptz default now(),
  unique(tenant_id, user_id)
);

-- ============================================================
-- USAGE TRACKING (for billing)
-- ============================================================
create table usage_logs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  persona_id uuid references personas(id),
  event_type text not null check (event_type in ('message_sent','cache_hit','contact_captured','doc_uploaded')),
  tokens_used integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- GOOGLE SHEET CONNECTORS
-- ============================================================
create table gsheet_connectors (
  id uuid primary key default uuid_generate_v4(),
  persona_id uuid not null references personas(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  sheet_url text not null,
  sheet_name text default 'Sheet1',
  label text not null,                 -- e.g. "Jadwal Posyandu"
  last_synced_at timestamptz,
  sync_interval_hours integer default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table tenants enable row level security;
alter table personas enable row level security;
alter table knowledge_items enable row level security;
alter table response_cache enable row level security;
alter table chat_sessions enable row level security;
alter table messages enable row level security;
alter table tenant_users enable row level security;
alter table usage_logs enable row level security;
alter table gsheet_connectors enable row level security;

-- Tenant users can only see their own tenant's data
create policy "tenant_users_see_own_tenant" on tenants
  for select using (
    id in (select tenant_id from tenant_users where user_id = auth.uid())
  );

create policy "tenant_users_manage_personas" on personas
  for all using (
    tenant_id in (select tenant_id from tenant_users where user_id = auth.uid())
  );

create policy "tenant_users_manage_knowledge" on knowledge_items
  for all using (
    tenant_id in (select tenant_id from tenant_users where user_id = auth.uid())
  );

create policy "tenant_users_see_sessions" on chat_sessions
  for all using (
    tenant_id in (select tenant_id from tenant_users where user_id = auth.uid())
  );

create policy "tenant_users_see_messages" on messages
  for select using (
    session_id in (
      select id from chat_sessions where
        tenant_id in (select tenant_id from tenant_users where user_id = auth.uid())
    )
  );

create policy "tenant_users_see_usage" on usage_logs
  for select using (
    tenant_id in (select tenant_id from tenant_users where user_id = auth.uid())
  );

-- Public: chat portal can insert sessions & messages (no auth needed)
create policy "public_insert_sessions" on chat_sessions
  for insert with check (true);

create policy "public_insert_messages" on messages
  for insert with check (true);

create policy "public_update_sessions" on chat_sessions
  for update using (true);

-- Public: read active personas by tenant slug (for portal)
create policy "public_read_active_personas" on personas
  for select using (is_active = true);

create policy "public_read_tenants" on tenants
  for select using (is_active = true);

create policy "public_read_knowledge" on knowledge_items
  for select using (is_active = true);

create policy "public_read_cache" on response_cache
  for select using (expires_at > now());

create policy "public_insert_cache" on response_cache
  for insert with check (true);

create policy "public_insert_usage" on usage_logs
  for insert with check (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_personas_tenant on personas(tenant_id);
create index idx_knowledge_persona on knowledge_items(persona_id);
create index idx_sessions_tenant on chat_sessions(tenant_id);
create index idx_sessions_persona on chat_sessions(persona_id);
create index idx_messages_session on messages(session_id);
create index idx_cache_lookup on response_cache(persona_id, question_hash);
create index idx_usage_tenant_date on usage_logs(tenant_id, created_at);
create index idx_tenants_slug on tenants(slug);

-- ============================================================
-- SEED: Demo tenant untuk testing
-- ============================================================
insert into tenants (id, slug, name, plan) values
  ('00000000-0000-0000-0000-000000000001', 'demo', 'Demo SapaCerdas', 'growth');

insert into personas (tenant_id, name, tagline, primary_color, system_prompt, welcome_message, tone) values
  ('00000000-0000-0000-0000-000000000001',
   'Sari',
   'Asisten Informasi Warga',
   '#2563eb',
   'Kamu adalah Sari, asisten AI yang ramah dan membantu warga mendapatkan informasi. Jawab dengan bahasa Indonesia yang santun dan mudah dipahami. Kalau tidak tahu, katakan dengan jujur dan sarankan menghubungi petugas.',
   'Halo! Saya Sari 👋 Ada yang bisa saya bantu hari ini?',
   'friendly');

insert into knowledge_items (persona_id, tenant_id, title, content, source_type) values
  ((select id from personas where tenant_id = '00000000-0000-0000-0000-000000000001' limit 1),
   '00000000-0000-0000-0000-000000000001',
   'Jam Operasional',
   'Kantor buka Senin-Jumat pukul 08.00-16.00 WIB. Sabtu buka setengah hari 08.00-12.00 WIB. Hari Minggu dan libur nasional tutup.',
   'manual');
