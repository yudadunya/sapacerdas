-- ============================================
-- SAPACERDAS PLATFORM - SUPABASE SCHEMA
-- Jalankan di Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ============================================
-- TENANTS (Klien SapaCerdas)
-- ============================================
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,             -- URL identifier: budi-santoso
  name text not null,                    -- Nama portal: "Asisten Pak Budi"
  owner_name text not null,              -- Nama klien: "Budi Santoso"
  owner_title text,                      -- Jabatan: "Anggota DPRD Jawa Tengah"
  owner_photo_url text,                  -- URL foto profil
  persona_name text not null default 'Sapa', -- Nama AI: "Sari", "Pak AI", dll
  persona_avatar_url text,               -- Avatar AI
  primary_color text not null default '#2563eb',
  secondary_color text not null default '#1e40af',
  welcome_message text not null default 'Halo! Ada yang bisa saya bantu hari ini?',
  system_prompt text not null default 'Kamu adalah asisten AI yang membantu masyarakat.',
  industry text not null default 'politik', -- politik | kesehatan | pendidikan | umkm | keagamaan | properti | organisasi
  google_sheet_url text,                 -- Live data dari Google Sheet
  capture_lead_after integer default 2,  -- Tangkap lead setelah N pesan
  lead_capture_text text default 'Boleh saya simpan nomor WhatsApp kamu agar bisa mengirim info terbaru?',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- KNOWLEDGE BASE (Dokumen per klien)
-- ============================================
create table knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  title text,
  content text not null,
  source text,                           -- Nama file / URL sumber
  chunk_index integer default 0,
  created_at timestamptz default now()
);

-- Index untuk full-text search
create index knowledge_chunks_content_idx on knowledge_chunks using gin(to_tsvector('indonesian', content));
create index knowledge_chunks_tenant_idx on knowledge_chunks(tenant_id);

-- ============================================
-- CONVERSATIONS (Sesi chat)
-- ============================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  session_id text not null,              -- Browser session identifier
  lead_id uuid,                          -- Link ke lead kalau sudah capture
  ip_address text,
  user_agent text,
  started_at timestamptz default now(),
  last_message_at timestamptz default now(),
  message_count integer default 0,
  main_topic text                        -- AI-detected topic
);

create index conversations_tenant_idx on conversations(tenant_id);
create index conversations_session_idx on conversations(session_id);

-- ============================================
-- MESSAGES (Pesan individual)
-- ============================================
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tokens_used integer default 0,
  cached boolean default false,
  created_at timestamptz default now()
);

create index messages_conversation_idx on messages(conversation_id);
create index messages_tenant_idx on messages(tenant_id);

-- ============================================
-- LEADS (Database konstituen / pelanggan)
-- ============================================
create table leads (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  conversation_id uuid references conversations(id),
  name text not null,
  phone text not null,
  location text,
  topic text,                            -- Topik yang ditanyakan saat capture
  notes text,
  source text default 'portal',          -- portal | wa | manual
  created_at timestamptz default now()
);

create index leads_tenant_idx on leads(tenant_id);
create index leads_phone_idx on leads(phone);

-- ============================================
-- RESPONSE CACHE (Hemat biaya AI)
-- ============================================
create table response_cache (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  question_hash text not null,           -- MD5 dari pertanyaan yang dinormalisasi
  question_sample text,                  -- Sample pertanyaan untuk debug
  response text not null,
  hit_count integer default 1,
  created_at timestamptz default now(),
  last_hit_at timestamptz default now(),
  unique(tenant_id, question_hash)
);

create index cache_tenant_hash_idx on response_cache(tenant_id, question_hash);

-- ============================================
-- ANALYTICS (Agregat per hari)
-- ============================================
create table daily_analytics (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  date date not null,
  total_conversations integer default 0,
  total_messages integer default 0,
  new_leads integer default 0,
  cache_hits integer default 0,
  ai_calls integer default 0,
  unique(tenant_id, date)
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
alter table tenants enable row level security;
alter table knowledge_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table leads enable row level security;
alter table response_cache enable row level security;
alter table daily_analytics enable row level security;

-- Public read for active tenants (portal)
create policy "Public can read active tenants"
  on tenants for select
  using (is_active = true);

-- Public read knowledge base
create policy "Public can read knowledge"
  on knowledge_chunks for select
  using (true);

-- Service role has full access (API routes use service role)
create policy "Service role full access tenants"
  on tenants for all
  using (true)
  with check (true);

-- Allow insert conversations and messages (public portal)
create policy "Public can insert conversations"
  on conversations for insert
  with check (true);

create policy "Public can read own conversations"
  on conversations for select
  using (true);

create policy "Public update conversations"
  on conversations for update
  using (true);

create policy "Public can insert messages"
  on messages for insert
  with check (true);

create policy "Public can read messages"
  on messages for select
  using (true);

create policy "Public can insert leads"
  on leads for insert
  with check (true);

create policy "Service role cache access"
  on response_cache for all
  using (true)
  with check (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at
  before update on tenants
  for each row execute function update_updated_at();

-- Update conversation message count
create or replace function increment_message_count()
returns trigger as $$
begin
  update conversations
  set message_count = message_count + 1,
      last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger messages_increment_count
  after insert on messages
  for each row execute function increment_message_count();

-- ============================================
-- SEED DATA - Contoh tenant
-- ============================================
insert into tenants (
  slug, name, owner_name, owner_title,
  persona_name, primary_color, secondary_color,
  welcome_message, system_prompt, industry,
  capture_lead_after
) values (
  'demo',
  'Asisten Pak Demo',
  'Budi Santoso',
  'Anggota DPRD Demo',
  'Sari',
  '#2563eb',
  '#1e40af',
  'Halo! Saya Sari, asisten digital Pak Budi. Ada yang bisa saya bantu hari ini? 😊',
  'Kamu adalah Sari, asisten AI dari Pak Budi Santoso, Anggota DPRD. Kamu membantu konstituen dengan informasi tentang program kerja, bantuan sosial, dan layanan publik. Selalu ramah, sopan, dan gunakan bahasa Indonesia yang natural. Jika kamu tidak tahu jawabannya, katakan dengan jujur dan sarankan untuk menghubungi kantor langsung.',
  'politik',
  3
);

insert into knowledge_chunks (tenant_id, title, content, source) values
(
  (select id from tenants where slug = 'demo'),
  'Program Kerja 2024',
  'Program kerja Pak Budi tahun 2024 meliputi: 1) Bedah rumah untuk warga kurang mampu sebanyak 50 unit. 2) Beasiswa pendidikan untuk 200 pelajar berprestasi. 3) Pelatihan UMKM digital untuk 300 pelaku usaha. 4) Pembangunan posyandu di 10 desa. 5) Program air bersih untuk 15 dusun terpencil.',
  'Program Kerja 2024'
),
(
  (select id from tenants where slug = 'demo'),
  'Cara Mendapatkan Bantuan',
  'Untuk mendapatkan bantuan dari program Pak Budi, warga bisa: 1) Datang langsung ke posko pelayanan setiap Senin-Jumat jam 08.00-16.00. 2) Chat melalui portal ini. 3) Hubungi staf di nomor 0812-3456-7890. Syarat umum: KTP domisili setempat, surat keterangan RT/RW, dan mengisi formulir permohonan.',
  'Panduan Bantuan'
),
(
  (select id from tenants where slug = 'demo'),
  'Jadwal Reses',
  'Jadwal reses Pak Budi: Januari minggu ke-2 (Kecamatan A), Februari minggu ke-1 (Kecamatan B), Maret minggu ke-3 (Kecamatan C). Selama reses warga bisa menyampaikan aspirasi langsung. Lokasi reses diumumkan seminggu sebelumnya melalui portal ini.',
  'Jadwal Kegiatan'
);
