# SapaCerdas – White-label AI Persona Platform

Platform multi-tenant untuk deploy AI persona berbranding sendiri. Satu codebase, banyak klien, masing-masing punya portal chat, persona, dan database kontak sendiri.

## Arsitektur

```
yourdomain.com/[tenant-slug]  →  Portal chat publik (white-label per klien)
yourdomain.com/dashboard       →  Panel admin untuk manage tenant & persona
yourdomain.com/api/chat        →  AI engine dengan cache & model routing
```

## Stack

- **Next.js 14** – frontend + API routes
- **Supabase** – database (PostgreSQL) + auth + RLS
- **Anthropic Claude** – AI engine (Haiku untuk efisiensi)
- **Vercel** – deployment (gratis untuk MVP)

---

## Deploy dalam 4 Langkah

### Langkah 1: Setup Supabase

1. Buat akun di [supabase.com](https://supabase.com) → New Project
2. Masuk ke **SQL Editor**
3. Copy isi file `supabase/migrations/001_schema.sql` → paste → Run
4. Catat:
   - **Project URL**: Settings → API → Project URL
   - **Anon Key**: Settings → API → Project API Keys → anon public
   - **Service Role Key**: Settings → API → Project API Keys → service_role (jangan share!)

### Langkah 2: Setup GitHub

```bash
# Clone atau upload project ini ke GitHub
git init
git add .
git commit -m "Initial SapaCerdas setup"
git remote add origin https://github.com/username/sapacerdas
git push -u origin main
```

### Langkah 3: Deploy ke Vercel

1. Buka [vercel.com](https://vercel.com) → New Project → Import dari GitHub
2. Pilih repo ini
3. Di bagian **Environment Variables**, tambahkan:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
ANTHROPIC_API_KEY               = sk-ant-...
NEXT_PUBLIC_APP_URL             = https://nama-project.vercel.app
```

4. Klik Deploy → tunggu 2-3 menit

### Langkah 4: Buat Akun Pertama

1. Buka `https://yourdomain.vercel.app/login`
2. Klik **Daftar** → isi email & password → Submit
3. Cek email → klik link verifikasi
4. Login → buat tenant pertama → buat persona

---

## Cara Kerja Multi-Tenant

Setiap klien punya URL sendiri:

```
yourdomain.com/klinik-sehat      → Portal Klinik Sehat
yourdomain.com/dprd-jateng       → Portal DPRD Jawa Tengah  
yourdomain.com/masjid-al-ikhlas  → Portal Masjid Al-Ikhlas
```

Data setiap tenant **terisolasi** via Supabase Row Level Security (RLS) — klien A tidak bisa melihat data klien B.

---

## Fitur Utama

### ✅ Yang sudah ada
- Multi-tenant dengan RLS (data isolation)
- Custom persona (nama, avatar, warna, tone, system prompt)
- Knowledge base upload
- Response cache (hemat ~60% biaya AI)
- Model routing (Haiku untuk pertanyaan sederhana)
- Contact capture (nama, WA, lokasi) setelah 3 pesan
- Dashboard admin dengan statistik
- Login/signup system

### 🔜 Langkah selanjutnya (bisa diminta)
- Persona editor (form lengkap edit persona)
- Knowledge base manager (upload, edit, hapus)
- Google Sheet sync
- Analytics dashboard lengkap
- WA broadcast (untuk klien Growth/Pro)
- Custom domain per tenant
- Reseller/white-label mode

---

## Struktur File

```
src/
├── app/
│   ├── [tenant]/page.tsx      ← Portal chat publik
│   ├── dashboard/page.tsx     ← Admin dashboard
│   ├── login/page.tsx         ← Auth
│   ├── api/
│   │   ├── chat/route.ts      ← AI chat endpoint
│   │   └── tenants/route.ts   ← Tenant CRUD
│   └── layout.tsx
├── lib/
│   ├── supabase.ts            ← DB clients
│   └── ai-engine.ts          ← AI + cache logic
└── types/index.ts             ← TypeScript types

supabase/
└── migrations/001_schema.sql  ← Complete DB schema
```

---

## Biaya Operasional (estimasi)

| Komponen | Biaya |
|----------|-------|
| Vercel (Hobby) | Gratis |
| Supabase (Free tier) | Gratis sampai 50k rows |
| Anthropic Haiku | ~Rp 40-100rb / 10.000 pesan (dengan cache) |

Untuk 1 klien dengan 3.000 pesan/bulan dan cache 60% → biaya API **~Rp 25-40rb/bulan**.

---

## FAQ

**Q: Bagaimana cara ganti nama/logo platform?**  
A: Edit `src/app/dashboard/page.tsx` bagian header. Untuk logo, tambahkan di `public/` folder.

**Q: Bagaimana klien bisa akses dashboard sendiri?**  
A: Daftarkan email klien, lalu tambahkan ke `tenant_users` table dengan role `admin`.

**Q: Bisa custom domain per klien?**  
A: Di Vercel Pro, bisa tambahkan wildcard domain `*.sapacerdas.id` → pointing ke project ini. Konfigurasi middleware Next.js untuk resolve tenant dari hostname.
