# SapaCerdas Platform

Platform AI white-label untuk membangun database audiens secara organik.
Setiap percakapan = kontak baru yang terdata lengkap.

## 🚀 Deploy dalam 5 Langkah

### 1. Clone & Setup

```bash
git clone https://github.com/username/sapacerdas.git
cd sapacerdas
cp .env.example .env.local
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Masuk ke **SQL Editor**
3. Copy-paste isi file `supabase/schema.sql` dan jalankan
4. Copy credentials dari **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Setup Anthropic API

1. Daftar di [console.anthropic.com](https://console.anthropic.com)
2. Buat API key baru
3. Isi `ANTHROPIC_API_KEY` di `.env.local`

### 4. Isi .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SECRET=buat-password-rahasia-acak-minimal-16-karakter
```

### 5. Jalankan

```bash
npm run dev
# Buka http://localhost:3000
```

---

## 🌐 Deploy ke Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add ADMIN_SECRET

# Deploy ulang dengan env baru
vercel --prod
```

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── page.tsx              # Landing page marketing
│   ├── admin/page.tsx        # Admin dashboard
│   ├── portal/[slug]/        # White-label portal per klien
│   └── api/
│       ├── chat/             # Chat + Claude AI
│       ├── leads/            # Lead capture & retrieval
│       ├── tenants/          # Tenant management
│       ├── knowledge/        # Knowledge base + Google Sheet sync
│       └── analytics/        # Stats per tenant
├── components/
│   ├── ChatPortal.tsx        # UI chat utama (white-label)
│   └── AdminDashboard.tsx    # Dashboard admin
└── lib/
    ├── claude.ts             # Claude API + caching logic
    ├── supabase.ts           # Supabase browser client
    ├── supabase-server.ts    # Supabase server client
    └── types.ts              # TypeScript types
```

---

## 🔑 URL Penting

| URL | Fungsi |
|-----|--------|
| `/` | Landing page marketing |
| `/admin` | Dashboard admin (butuh ADMIN_SECRET) |
| `/portal/[slug]` | Portal white-label klien |
| `/portal/demo` | Portal demo (dari seed data) |

---

## ➕ Membuat Tenant Baru

### Via Admin Dashboard:
1. Buka `/admin`
2. Masukkan `ADMIN_SECRET` kamu
3. Klik **+ Tambah Tenant**
4. Isi form: slug, nama, persona, industri, warna, system prompt
5. Klik **Buat Tenant**
6. Upload knowledge base di tab **Knowledge**

### Via API:
```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "nama-klien",
    "name": "Asisten Nama Klien",
    "owner_name": "Nama Klien",
    "owner_title": "Jabatan",
    "persona_name": "Sari",
    "primary_color": "#2563eb",
    "secondary_color": "#1e40af",
    "welcome_message": "Halo! Ada yang bisa saya bantu?",
    "system_prompt": "Kamu adalah asisten AI...",
    "industry": "politik",
    "capture_lead_after": 3
  }'
```

---

## 📊 Menambah Knowledge Base

### Via Dashboard:
1. Pilih tenant → tab **Knowledge**
2. Isi judul + konten → klik **Tambah**

### Google Sheet Sync (Live Data):
1. Buat Google Sheet dengan data klien (jadwal, program, harga, dll)
2. Share sheet: **File → Share → Anyone with link → Viewer**
3. Copy URL sheet
4. Di tab Settings tenant, paste URL → klik **Sync**
5. Data otomatis diupdate saat sync dijalankan ulang

### Via API:
```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "x-admin-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "uuid-tenant",
    "title": "Program Kerja 2025",
    "content": "Isi konten program kerja...",
    "source": "Dokumen Resmi"
  }'
```

---

## 💰 Estimasi Biaya

| Komponen | Biaya |
|----------|-------|
| Vercel (hosting) | Gratis (Hobby) / $20/bln (Pro) |
| Supabase | Gratis s/d 50MB / $25/bln (Pro) |
| Claude Haiku API | ~$0.25 per 1M tokens |
| **Estimasi per 1.000 pesan** | **~Rp 10.000–50.000** |

Cache ratio 60% → hemat ~60% biaya AI.

---

## 🎨 Kustomisasi White-Label

Setiap tenant memiliki:
- **Nama & avatar** persona AI sendiri
- **Warna** brand (primary + secondary gradient)
- **System prompt** custom sesuai industri
- **Knowledge base** dokumen sendiri
- **URL** unik: `/portal/[slug]`

Untuk **custom domain** (misal `ai.namaku.com`):
1. Di Vercel: Add Domain → `ai.namaku.com`
2. Di DNS: tambah CNAME → `cname.vercel-dns.com`
3. Di `next.config.js` tambahkan domain ke rewrites

---

## 🔒 Keamanan

- Admin dashboard dilindungi `ADMIN_SECRET` header
- Supabase RLS aktif untuk semua tabel
- Service role key hanya dipakai di server-side
- Data leads private per tenant

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude (Haiku model — murah & cepat)
- **Deploy:** Vercel
- **Cache:** Response cache di Supabase

---

## 📞 Dukungan

Untuk pertanyaan teknis, buka issue di GitHub atau hubungi tim SapaCerdas.
